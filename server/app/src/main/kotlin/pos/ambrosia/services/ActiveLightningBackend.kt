package pos.ambrosia.services

import io.ktor.server.application.Application
import kotlinx.coroutines.withTimeout
import pos.ambrosia.api.PaymentNotification
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
import pos.ambrosia.utils.SecretsLockedException
import java.util.concurrent.atomic.AtomicReference

private const val NWC_CONNECTION_TIMEOUT_MS = 15_000L

object ActiveLightningBackend : LightningBackend, PaymentVerifier, IncomingPaymentHistory {
    private val backendReference = AtomicReference<LightningBackend?>(null)
    private val paymentEventsClientReference = AtomicReference<PhoenixPaymentEventsClient?>(null)

    fun set(backend: LightningBackend) {
        backendReference.set(backend)
    }

    fun isNwcActive(): Boolean = backendReference.get() is NwcService

    fun isAvailable(): Boolean = backendReference.get() != null

    fun startPhoenixPaymentEventsListener(
        phoenixdUrl: String,
        phoenixdPassword: String,
        onPaymentReceived: suspend (PaymentNotification) -> Unit,
    ) {
        val newPaymentEventsClient = PhoenixPaymentEventsClient(phoenixdUrl, phoenixdPassword, onPaymentReceived)
        newPaymentEventsClient.connect()
        val previousPaymentEventsClient = paymentEventsClientReference.getAndSet(newPaymentEventsClient)
        previousPaymentEventsClient?.close()
    }

    fun closeActive() {
        paymentEventsClientReference.getAndSet(null)?.close()
        backendReference
            .getAndSet(null)
            ?.runCatching { close() }
            ?.onFailure { logger.warn("Error closing Lightning backend on shutdown: {}", it.message) }
    }

    suspend fun reinitializeNwcBackend(
        nwcUri: String,
        application: Application,
        onIncomingPaymentReceived: (PaymentNotification) -> Unit = {},
    ) {
        val newBackend = NwcService.create(nwcUri, application, onIncomingPaymentReceived)
        try {
            withTimeout(NWC_CONNECTION_TIMEOUT_MS) { newBackend.awaitReady() }
        } catch (exception: Exception) {
            newBackend.close()
            throw exception
        }
        val previousBackend = backendReference.getAndSet(newBackend)
        previousBackend
            ?.runCatching { close() }
            ?.onFailure { logger.warn("Error closing previous Lightning backend: {}", it.message) }
        logger.info("NWC backend hot-reloaded — no restart required")
    }

    fun reinitializePhoenixBackend(
        phoenixdUrl: String,
        phoenixdPassword: String,
    ) {
        val newBackend = PhoenixService(phoenixdUrl, phoenixdPassword)
        val previousBackend = backendReference.getAndSet(newBackend)
        previousBackend
            ?.runCatching { close() }
            ?.onFailure { logger.warn("Error closing previous Lightning backend: {}", it.message) }
        logger.info("Phoenix backend hot-reloaded — no restart required")
    }

    private fun requireLightningBackend(): LightningBackend =
        backendReference.get() ?: if (SecretsStore.isLocked()) {
            throw SecretsLockedException()
        } else {
            error("Lightning backend not initialized")
        }

    override suspend fun getNodeInfo(): NodeInfo = requireLightningBackend().getNodeInfo()

    override suspend fun getBalance(): PhoenixBalance = requireLightningBackend().getBalance()

    override suspend fun getSeed(): String = requireLightningBackend().getSeed()

    override suspend fun createInvoice(createInvoiceRequest: CreateInvoiceRequest): CreateInvoiceResponse =
        requireLightningBackend().createInvoice(createInvoiceRequest)

    override suspend fun createOffer(createOfferRequest: CreateOffer): String = requireLightningBackend().createOffer(createOfferRequest)

    override suspend fun payInvoice(payInvoiceRequest: PayInvoiceRequest): PaymentResponse =
        requireLightningBackend().payInvoice(payInvoiceRequest)

    override suspend fun payOffer(payOfferRequest: PayOfferRequest): PaymentResponse = requireLightningBackend().payOffer(payOfferRequest)

    override suspend fun payOnchain(payOnchainRequest: PayOnchainRequest): PaymentResponse =
        requireLightningBackend().payOnchain(payOnchainRequest)

    override suspend fun bumpOnchainFees(feerateSatByte: Int): String = requireLightningBackend().bumpOnchainFees(feerateSatByte)

    override suspend fun listIncomingPayments(
        from: Long,
        to: Long?,
        limit: Int,
        offset: Int,
        all: Boolean,
        externalId: String?,
    ): List<IncomingPayment> = requireLightningBackend().listIncomingPayments(from, to, limit, offset, all, externalId)

    override suspend fun getIncomingPayment(paymentHash: String): IncomingPayment =
        requireLightningBackend().getIncomingPayment(paymentHash)

    override suspend fun listOutgoingPayments(
        from: Long,
        to: Long?,
        limit: Int,
        offset: Int,
        all: Boolean,
    ): List<OutgoingPayment> = requireLightningBackend().listOutgoingPayments(from, to, limit, offset, all)

    override suspend fun getOutgoingPayment(paymentId: String): OutgoingPayment = requireLightningBackend().getOutgoingPayment(paymentId)

    override suspend fun getOutgoingPaymentByHash(paymentHash: String): OutgoingPayment =
        requireLightningBackend().getOutgoingPaymentByHash(paymentHash)

    override suspend fun csvExport(csvExportRequest: CsvExport): String = requireLightningBackend().csvExport(csvExportRequest)

    override suspend fun closeChannel(closeChannelRequest: CloseChannelRequest): CloseChannelResponse =
        requireLightningBackend().closeChannel(closeChannelRequest)
}
