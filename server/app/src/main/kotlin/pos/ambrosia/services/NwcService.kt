package pos.ambrosia.services

import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.server.application.Application
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import pos.ambrosia.api.PaymentNotification
import pos.ambrosia.api.PaymentNotifier
import pos.ambrosia.logger
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
import pos.ambrosia.utils.Bolt11Decoder
import pos.ambrosia.utils.NwcServiceException
import pos.ambrosia.utils.UnsupportedBackendOperationException
import java.util.concurrent.ConcurrentHashMap

private const val POLL_INTERVAL_MS = 3000L
private const val INVOICE_TTL_MS = 60 * 60 * 1000L

class NwcService(
    private val nwcClient: NwcClientPort,
    private val walletPubkeyHex: String,
    private val scope: CoroutineScope,
    private val onIncomingPaymentReceived: (PaymentNotification) -> Unit = {},
    private val lud16: String? = null,
) : LightningBackend {
    private data class PendingInvoice(
        val paymentRequest: String,
        val createdAt: Long = System.currentTimeMillis(),
    )

    private val pendingInvoices = ConcurrentHashMap<String, PendingInvoice>()
    private var pollingJob: Job? = null
    internal val ready = CompletableDeferred<Unit>()

    internal fun markReady() {
        ready.complete(Unit)
    }

    internal fun markFailed(cause: Throwable) {
        ready.completeExceptionally(cause)
    }

    internal suspend fun awaitReady() = ready.await()

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
        pendingInvoices.entries.removeIf { (_, pendingInvoice) -> now - pendingInvoice.createdAt > INVOICE_TTL_MS }

        val entries = pendingInvoices.entries.toList()
        if (entries.isEmpty()) return

        val oldestPendingInvoiceSec = entries.minOf { it.value.createdAt } / 1000
        val transactions =
            try {
                nwcClient.listTransactions(
                    from = oldestPendingInvoiceSec,
                    type = "incoming",
                    unpaid = false,
                )
            } catch (exception: Exception) {
                logger.debug("Error batch-polling NWC list_transactions: {}", exception.message)
                return
            }

        for (transaction in transactions) {
            val paymentHash = transaction.paymentHash ?: continue
            val settledAt = transaction.settledAt ?: continue
            if (pendingInvoices.remove(paymentHash) != null) {
                val amountSat = (transaction.amount ?: 0L) / 1000
                val paymentNotification =
                    PaymentNotification(
                        type = "payment_received",
                        timestamp = settledAt,
                        amountSat = amountSat,
                        paymentHash = paymentHash,
                    )
                logger.info("NWC payment detected: hash={}, amount={}sat", paymentHash, amountSat)
                PaymentNotifier.broadcast(paymentNotification)
                runCatching { onIncomingPaymentReceived(paymentNotification) }
                    .onFailure { logger.warn("Failed to handle NWC incoming payment notification: {}", it.message) }
            }
        }
    }

    override suspend fun createInvoice(request: CreateInvoiceRequest): CreateInvoiceResponse {
        awaitReady()
        val amountMsat = (request.amountSat ?: 0L) * 1000
        val expiry = request.expirySeconds
        val transaction =
            nwcClient.makeInvoice(
                amountMsat = amountMsat,
                description = request.description,
                expiry = expiry,
            )
        val paymentHash =
            transaction.paymentHash
                ?: throw NwcServiceException("NWC make_invoice did not return payment_hash")
        val bolt11 =
            transaction.invoice
                ?: throw NwcServiceException("NWC make_invoice did not return invoice")

        pendingInvoices[paymentHash] = PendingInvoice(bolt11)

        return CreateInvoiceResponse(
            amountSat = request.amountSat,
            paymentHash = paymentHash,
            serialized = bolt11,
        )
    }

    override suspend fun getBalance(): PhoenixBalance {
        awaitReady()
        val balance = nwcClient.getBalance()
        val balanceSat = balance.balanceMsat / 1000
        return PhoenixBalance(balanceSat = balanceSat, feeCreditSat = 0)
    }

    override suspend fun getNodeInfo(): NodeInfo {
        awaitReady()
        val info = nwcClient.getInfo()

        val chain =
            info.network ?: run {
                logger.warn("NWC wallet did not return 'network' field — chain is unknown")
                "unknown"
            }
        return NodeInfo(
            nodeId = info.pubkey ?: walletPubkeyHex,
            channels = emptyList(),
            chain = chain,
            blockHeight = info.blockHeight,
            version = "NWC",
            lud16 = lud16,
        )
    }

    override suspend fun payInvoice(request: PayInvoiceRequest): PaymentResponse {
        awaitReady()
        val amountMsat = request.amountSat?.let { it * 1000 }
        val payResult =
            try {
                nwcClient.payInvoice(request.invoice, amountMsat)
            } catch (exception: NwcServiceException) {
                if (amountMsat != null) {
                    throw UnsupportedBackendOperationException(
                        message =
                            "This NWC wallet could not process a payment with a specified amount for this invoice — " +
                                "ask for one that already includes the amount",
                        code = "amount_override_not_supported",
                    )
                }
                throw exception
            }
        val paidAmountSat =
            request.amountSat
                ?: Bolt11Decoder.extractAmountSat(request.invoice)
                ?: 0L
        val paymentHash = Bolt11Decoder.extractPaymentHash(request.invoice) ?: ""
        return PaymentResponse(
            recipientAmountSat = paidAmountSat,
            routingFeeSat = (payResult.feesPaid ?: 0) / 1000,
            paymentId = payResult.preimage ?: "",
            paymentHash = paymentHash,
            paymentPreimage = payResult.preimage ?: "",
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
        awaitReady()
        val transactions =
            nwcClient.listTransactions(
                from = if (from > 0) from else null,
                until = to,
                limit = limit,
                offset = offset,
                unpaid = if (all) true else null,
                type = "incoming",
            )
        return transactions.map { transaction -> transaction.toIncomingPayment() }
    }

    override suspend fun getIncomingPayment(paymentHash: String): IncomingPayment {
        awaitReady()
        val transaction = nwcClient.lookupInvoice(paymentHash = paymentHash)
        return transaction.toIncomingPayment()
    }

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
        awaitReady()
        val transactions =
            nwcClient.listTransactions(
                from = if (from > 0) from else null,
                until = to,
                limit = limit,
                offset = offset,
                unpaid = if (all) true else null,
                type = "outgoing",
            )
        return transactions.map { transaction -> transaction.toOutgoingPayment() }
    }

    override suspend fun getOutgoingPayment(paymentId: String): OutgoingPayment =
        throw UnsupportedBackendOperationException("Outgoing payment lookup by ID is not supported with NWC backend")

    override suspend fun getOutgoingPaymentByHash(paymentHash: String): OutgoingPayment =
        throw UnsupportedBackendOperationException("Outgoing payment lookup by hash is not supported with NWC backend")

    override suspend fun csvExport(request: CsvExport): String =
        throw UnsupportedBackendOperationException("CSV export is not supported with NWC backend")

    override suspend fun closeChannel(request: CloseChannelRequest): CloseChannelResponse =
        throw UnsupportedBackendOperationException("Channel management is not supported with NWC backend")

    override fun close() {
        logger.info("Shutting down NWC backend")
        pollingJob?.cancel()
        scope.cancel()
        nwcClient.close()
    }

    companion object {
        fun create(
            nwcUri: String,
            application: Application,
            onIncomingPaymentReceived: (PaymentNotification) -> Unit = {},
        ): NwcService {
            val connectionInfo = parseNwcUri(nwcUri)
            logger.info("Initializing NWC backend, relay={}", connectionInfo.relayUrl)

            val httpClient =
                HttpClient(CIO) {
                    install(WebSockets)
                }

            val nwcClient = NwcClient(connectionInfo, httpClient)
            val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

            val service =
                NwcService(nwcClient, connectionInfo.walletPubkeyHex, scope, onIncomingPaymentReceived, connectionInfo.lud16)

            scope.launch {
                connectAndMarkReady(nwcClient, service)
            }

            return service
        }

        private suspend fun connectAndMarkReady(
            nwcClient: NwcClientPort,
            service: NwcService,
        ) {
            try {
                nwcClient.connect(service.scope)
                service.startPolling()
                service.markReady()
                logger.info("NWC backend ready")
            } catch (exception: Exception) {
                logger.error("Failed to initialize NWC backend: {}", exception.message)
                service.markFailed(exception)
            }
        }
    }
}

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
        fees = (feesPaid ?: 0) / 1000,
        payerKey = null,
        expiresAt = expiresAt?.times(1000),
        completedAt = settledAt?.times(1000),
        createdAt = createdAt?.times(1000) ?: System.currentTimeMillis(),
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
        fees = (feesPaid ?: 0) / 1000,
        invoice = invoice,
        completedAt = settledAt?.times(1000),
        createdAt = createdAt?.times(1000) ?: System.currentTimeMillis(),
    )
}
