package pos.ambrosia.services

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

interface LightningBackend {
    suspend fun getNodeInfo(): NodeInfo

    suspend fun getBalance(): PhoenixBalance

    suspend fun getSeed(): String

    suspend fun createInvoice(request: CreateInvoiceRequest): CreateInvoiceResponse

    suspend fun createOffer(request: CreateOffer): String

    suspend fun payInvoice(request: PayInvoiceRequest): PaymentResponse

    suspend fun payOffer(request: PayOfferRequest): PaymentResponse

    suspend fun payOnchain(request: PayOnchainRequest): PaymentResponse

    suspend fun bumpOnchainFees(feerateSatByte: Int): String

    suspend fun listIncomingPayments(
        from: Long = 0,
        to: Long? = null,
        limit: Int = 20,
        offset: Int = 0,
        all: Boolean = false,
        externalId: String? = null,
    ): List<IncomingPayment>

    suspend fun getIncomingPayment(paymentHash: String): IncomingPayment

    suspend fun listOutgoingPayments(
        from: Long = 0,
        to: Long? = null,
        limit: Int = 20,
        offset: Int = 0,
        all: Boolean = false,
    ): List<OutgoingPayment>

    suspend fun getOutgoingPayment(paymentId: String): OutgoingPayment

    suspend fun getOutgoingPaymentByHash(paymentHash: String): OutgoingPayment

    suspend fun csvExport(request: CsvExport): String

    suspend fun closeChannel(request: CloseChannelRequest): CloseChannelResponse
}
