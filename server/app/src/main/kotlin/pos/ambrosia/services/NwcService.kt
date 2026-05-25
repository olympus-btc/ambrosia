package pos.ambrosia.services

import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.server.application.Application
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import pos.ambrosia.api.PaymentNotification
import pos.ambrosia.api.PaymentNotifier
import pos.ambrosia.logger
import pos.ambrosia.models.phoenix.Channel
import pos.ambrosia.models.phoenix.CloseChannelRequest
import pos.ambrosia.models.phoenix.CloseChannelResponse
import pos.ambrosia.models.phoenix.CreateInvoiceRequest
import pos.ambrosia.models.phoenix.CreateInvoiceResponse
import pos.ambrosia.models.phoenix.CreateOffer
import pos.ambrosia.models.phoenix.CsvExport
import pos.ambrosia.models.phoenix.IncomingPayment
import pos.ambrosia.models.phoenix.NodeInfo
import pos.ambrosia.models.phoenix.OutgoingPayment
import pos.ambrosia.models.phoenix.PayInvoiceRequest
import pos.ambrosia.models.phoenix.PayOfferRequest
import pos.ambrosia.models.phoenix.PayOnchainRequest
import pos.ambrosia.models.phoenix.PaymentResponse
import pos.ambrosia.models.phoenix.PhoenixBalance
import pos.ambrosia.nwc.Nip47Transaction
import pos.ambrosia.nwc.NwcClient
import pos.ambrosia.nwc.NwcClientPort
import pos.ambrosia.nwc.parseNwcUri
import pos.ambrosia.utils.NwcServiceException
import pos.ambrosia.utils.UnsupportedBackendOperationException
import java.util.concurrent.ConcurrentHashMap

private const val POLL_INTERVAL_MS = 3000L
private const val INVOICE_TTL_MS = 3_600_000L // 1 hour

class NwcService(
    private val nwcClient: NwcClientPort,
    private val walletPubkeyHex: String,
    private val scope: CoroutineScope,
) : LightningBackend {
    private data class PendingInvoice(
        val paymentRequest: String,
        val createdAt: Long = System.currentTimeMillis(),
    )

    private val pendingInvoices = ConcurrentHashMap<String, PendingInvoice>()
    private var pollingJob: Job? = null

    fun startPolling() {
        pollingJob =
            scope.launch {
                logger.info("NWC invoice payment polling started")
                while (isActive) {
                    delay(POLL_INTERVAL_MS)
                    pollPendingInvoices()
                }
            }
    }

    internal suspend fun pollPendingInvoices() {
        val now = System.currentTimeMillis()
        pendingInvoices.entries.removeIf { (_, v) -> now - v.createdAt > INVOICE_TTL_MS }

        val entries = pendingInvoices.entries.toList()
        for ((paymentHash, _) in entries) {
            try {
                val tx = nwcClient.lookupInvoice(paymentHash = paymentHash)
                if (tx.settledAt != null) {
                    pendingInvoices.remove(paymentHash)
                    val amountSat = (tx.amount ?: 0L) / 1000
                    logger.info("NWC payment detected: hash={}, amount={}sat", paymentHash, amountSat)
                    PaymentNotifier.broadcast(
                        PaymentNotification(
                            type = "payment_received",
                            timestamp = tx.settledAt,
                            amountSat = amountSat,
                            paymentHash = paymentHash,
                        ),
                    )
                }
            } catch (e: Exception) {
                logger.debug("Error polling invoice {}: {}", paymentHash, e.message)
            }
        }
    }

    override suspend fun createInvoice(request: CreateInvoiceRequest): CreateInvoiceResponse {
        val amountMsat = (request.amountSat ?: 0L) * 1000
        val expiry = request.expirySeconds
        val tx =
            nwcClient.makeInvoice(
                amountMsat = amountMsat,
                description = request.description,
                expiry = expiry,
            )
        val paymentHash =
            tx.paymentHash
                ?: throw NwcServiceException("NWC make_invoice did not return payment_hash")
        val bolt11 =
            tx.invoice
                ?: throw NwcServiceException("NWC make_invoice did not return invoice")

        pendingInvoices[paymentHash] = PendingInvoice(bolt11)

        return CreateInvoiceResponse(
            amountSat = request.amountSat,
            paymentHash = paymentHash,
            serialized = bolt11,
        )
    }

    override suspend fun getBalance(): PhoenixBalance {
        val balance = nwcClient.getBalance()
        val balanceSat = balance.balance / 1000
        return PhoenixBalance(balanceSat = balanceSat, feeCreditSat = 0)
    }

    override suspend fun getNodeInfo(): NodeInfo {
        val info = nwcClient.getInfo()
        val balance = nwcClient.getBalance()
        val balanceSat = balance.balance / 1000

        return NodeInfo(
            nodeId = info.pubkey ?: walletPubkeyHex,
            channels =
                listOf(
                    Channel(
                        state = "NORMAL",
                        channelId = "nwc-virtual",
                        balanceSat = balanceSat,
                        inboundLiquiditySat = 0,
                        capacitySat = balanceSat,
                        fundingTxId = "nwc",
                    ),
                ),
            chain = info.network ?: "mainnet",
            blockHeight = info.blockHeight,
            version = "NWC",
        )
    }

    override suspend fun payInvoice(request: PayInvoiceRequest): PaymentResponse {
        val amountMsat = request.amountSat?.let { it * 1000 }
        val result = nwcClient.payInvoice(request.invoice, amountMsat)
        return PaymentResponse(
            recipientAmountSat = request.amountSat ?: 0,
            routingFeeSat = (result.feesPaid ?: 0) / 1000,
            paymentId = result.preimage ?: "",
            paymentHash = "",
            paymentPreimage = result.preimage ?: "",
        )
    }

    override suspend fun listIncomingPayments(
        from: Long,
        to: Long?,
        limit: Int,
        offset: Int,
        all: Boolean,
        externalId: String?,
    ): List<IncomingPayment> {
        val transactions =
            nwcClient.listTransactions(
                from = if (from > 0) from else null,
                until = to,
                limit = limit,
                offset = offset,
                unpaid = if (all) true else null,
                type = "incoming",
            )
        return transactions.map { tx -> tx.toIncomingPayment() }
    }

    override suspend fun getIncomingPayment(paymentHash: String): IncomingPayment {
        val tx = nwcClient.lookupInvoice(paymentHash = paymentHash)
        return tx.toIncomingPayment()
    }

    // --- Unsupported operations ---

    override suspend fun getSeed(): String = throw UnsupportedBackendOperationException("Seed export is not available with NWC backend")

    override suspend fun createOffer(request: CreateOffer): String =
        throw UnsupportedBackendOperationException("Bolt12 offers are not supported with NWC backend")

    override suspend fun payOffer(request: PayOfferRequest): PaymentResponse =
        throw UnsupportedBackendOperationException("Bolt12 offer payments are not supported with NWC backend")

    override suspend fun payOnchain(request: PayOnchainRequest): PaymentResponse =
        throw UnsupportedBackendOperationException("On-chain payments are not supported with NWC backend")

    override suspend fun bumpOnchainFees(feerateSatByte: Int): String =
        throw UnsupportedBackendOperationException("On-chain fee bumping is not supported with NWC backend")

    override suspend fun listOutgoingPayments(
        from: Long,
        to: Long?,
        limit: Int,
        offset: Int,
        all: Boolean,
    ): List<OutgoingPayment> {
        val transactions =
            nwcClient.listTransactions(
                from = if (from > 0) from else null,
                until = to,
                limit = limit,
                offset = offset,
                unpaid = if (all) true else null,
                type = "outgoing",
            )
        return transactions.map { tx -> tx.toOutgoingPayment() }
    }

    override suspend fun getOutgoingPayment(paymentId: String): OutgoingPayment =
        throw UnsupportedBackendOperationException("Outgoing payment lookup by ID is not supported with NWC backend")

    override suspend fun getOutgoingPaymentByHash(paymentHash: String): OutgoingPayment {
        val tx = nwcClient.lookupInvoice(paymentHash = paymentHash)
        return tx.toOutgoingPayment()
    }

    override suspend fun csvExport(request: CsvExport): String =
        throw UnsupportedBackendOperationException("CSV export is not supported with NWC backend")

    override suspend fun closeChannel(request: CloseChannelRequest): CloseChannelResponse =
        throw UnsupportedBackendOperationException("Channel management is not supported with NWC backend")

    companion object {
        fun create(
            nwcUri: String,
            application: Application,
        ): NwcService {
            val connectionInfo = parseNwcUri(nwcUri)
            logger.info("Initializing NWC backend, relay={}", connectionInfo.relayUrl)

            val httpClient =
                HttpClient(CIO) {
                    install(WebSockets)
                }

            val nwcClient = NwcClient(connectionInfo, httpClient)
            val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

            val service = NwcService(nwcClient, connectionInfo.walletPubkeyHex, scope)

            // Connect and start polling in background
            scope.launch {
                try {
                    nwcClient.connect(scope)
                    service.startPolling()
                    logger.info("NWC backend ready")
                } catch (e: Exception) {
                    logger.error("Failed to initialize NWC backend: {}", e.message)
                }
            }

            return service
        }
    }
}

// Extension functions to map NIP-47 transactions to Phoenix model types
private fun Nip47Transaction.toIncomingPayment(): IncomingPayment {
    val amountMsat = amount ?: 0L
    val isPaid = settledAt != null
    return IncomingPayment(
        type = "incoming_payment",
        subType = type ?: "bolt11",
        paymentHash = paymentHash ?: "",
        preimage = preimage,
        externalId = null,
        description = description,
        invoice = invoice,
        isPaid = isPaid,
        isExpired =
            if (!isPaid && expiresAt != null) {
                expiresAt < System.currentTimeMillis() / 1000
            } else {
                null
            },
        requestedSat = amountMsat / 1000,
        receivedSat = if (isPaid) amountMsat / 1000 else 0,
        fees = feesPaid ?: 0,
        payerKey = null,
        expiresAt = expiresAt,
        completedAt = settledAt,
        createdAt = createdAt ?: (System.currentTimeMillis() / 1000),
    )
}

private fun Nip47Transaction.toOutgoingPayment(): OutgoingPayment {
    val amountMsat = amount ?: 0L
    val isPaid = settledAt != null
    return OutgoingPayment(
        type = "outgoing_payment",
        subType = type ?: "bolt11",
        paymentId = paymentHash ?: "",
        paymentHash = paymentHash,
        txId = null,
        preimage = preimage,
        isPaid = isPaid,
        sent = amountMsat / 1000,
        fees = feesPaid ?: 0,
        invoice = invoice,
        completedAt = settledAt,
        createdAt = createdAt ?: (System.currentTimeMillis() / 1000),
    )
}
