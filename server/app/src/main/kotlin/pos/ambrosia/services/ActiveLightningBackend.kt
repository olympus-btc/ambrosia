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
import java.util.concurrent.atomic.AtomicReference

private const val NWC_CONNECTION_TIMEOUT_MS = 15_000L

object ActiveLightningBackend : LightningBackend, PaymentVerifier {
    private val backendReference = AtomicReference<LightningBackend?>(null)

    fun set(backend: LightningBackend) {
        backendReference.set(backend)
    }

    fun isNwcActive(): Boolean = backendReference.get() is NwcService

    fun closeActive() {
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
        val previous = backendReference.getAndSet(newBackend)
        previous
            ?.runCatching { close() }
            ?.onFailure { logger.warn("Error closing previous Lightning backend: {}", it.message) }
        logger.info("NWC backend hot-reloaded — no restart required")
    }

    private fun current(): LightningBackend = backendReference.get() ?: error("Lightning backend not initialized")

    override suspend fun getNodeInfo(): NodeInfo = current().getNodeInfo()

    override suspend fun getBalance(): PhoenixBalance = current().getBalance()

    override suspend fun getSeed(): String = current().getSeed()

    override suspend fun createInvoice(request: CreateInvoiceRequest): CreateInvoiceResponse = current().createInvoice(request)

    override suspend fun createOffer(request: CreateOffer): String = current().createOffer(request)

    override suspend fun payInvoice(request: PayInvoiceRequest): PaymentResponse = current().payInvoice(request)

    override suspend fun payOffer(request: PayOfferRequest): PaymentResponse = current().payOffer(request)

    override suspend fun payOnchain(request: PayOnchainRequest): PaymentResponse = current().payOnchain(request)

    override suspend fun bumpOnchainFees(feerateSatByte: Int): String = current().bumpOnchainFees(feerateSatByte)

    override suspend fun listIncomingPayments(
        from: Long,
        to: Long?,
        limit: Int,
        offset: Int,
        all: Boolean,
        externalId: String?,
    ): List<IncomingPayment> = current().listIncomingPayments(from, to, limit, offset, all, externalId)

    override suspend fun getIncomingPayment(paymentHash: String): IncomingPayment = current().getIncomingPayment(paymentHash)

    override suspend fun listOutgoingPayments(
        from: Long,
        to: Long?,
        limit: Int,
        offset: Int,
        all: Boolean,
    ): List<OutgoingPayment> = current().listOutgoingPayments(from, to, limit, offset, all)

    override suspend fun getOutgoingPayment(paymentId: String): OutgoingPayment = current().getOutgoingPayment(paymentId)

    override suspend fun getOutgoingPaymentByHash(paymentHash: String): OutgoingPayment = current().getOutgoingPaymentByHash(paymentHash)

    override suspend fun csvExport(request: CsvExport): String = current().csvExport(request)

    override suspend fun closeChannel(request: CloseChannelRequest): CloseChannelResponse = current().closeChannel(request)
}
