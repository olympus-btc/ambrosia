package pos.ambrosia.utils

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
import pos.ambrosia.services.LightningBackend

class FakeLightningBackend(
    private val label: String = "fake-backend",
) : LightningBackend {
    var closed = false
        private set

    var balanceSat: Long = 0
    var failNextPayment: Exception? = null
    var incomingPaymentIsPaid: Boolean = true

    var incomingPayments: List<IncomingPayment> = emptyList()
    var outgoingPayments: List<OutgoingPayment> = emptyList()

    val createInvoiceRequests = mutableListOf<CreateInvoiceRequest>()
    val payInvoiceRequests = mutableListOf<PayInvoiceRequest>()
    val payOnchainRequests = mutableListOf<PayOnchainRequest>()
    val closeChannelRequests = mutableListOf<CloseChannelRequest>()

    override suspend fun getNodeInfo(): NodeInfo =
        NodeInfo(nodeId = label, channels = emptyList(), chain = "test", blockHeight = 0, version = label)

    override suspend fun getBalance(): PhoenixBalance = PhoenixBalance(balanceSat = balanceSat, feeCreditSat = 0)

    override suspend fun getSeed(): String = label

    override suspend fun createInvoice(request: CreateInvoiceRequest): CreateInvoiceResponse {
        createInvoiceRequests.add(request)
        return CreateInvoiceResponse(amountSat = request.amountSat, paymentHash = label, serialized = label)
    }

    override suspend fun createOffer(request: CreateOffer): String = label

    override suspend fun payInvoice(request: PayInvoiceRequest): PaymentResponse {
        payInvoiceRequests.add(request)
        failNextPayment?.let { failure ->
            failNextPayment = null
            throw failure
        }
        return fakePaymentResponse(request.amountSat ?: 0)
    }

    override suspend fun payOffer(request: PayOfferRequest): PaymentResponse {
        failNextPayment?.let { failure ->
            failNextPayment = null
            throw failure
        }
        return fakePaymentResponse()
    }

    override suspend fun payOnchain(request: PayOnchainRequest): PaymentResponse {
        payOnchainRequests.add(request)
        failNextPayment?.let { failure ->
            failNextPayment = null
            throw failure
        }
        return fakePaymentResponse(request.amountSat)
    }

    override suspend fun bumpOnchainFees(feerateSatByte: Int): String = label

    override suspend fun listIncomingPayments(
        from: Long,
        to: Long?,
        limit: Int,
        offset: Int,
        all: Boolean,
        externalId: String?,
    ): List<IncomingPayment> = incomingPayments

    override suspend fun getIncomingPayment(paymentHash: String): IncomingPayment =
        IncomingPayment(
            type = "incoming_payment",
            subType = "lightning",
            paymentHash = label,
            isPaid = incomingPaymentIsPaid,
            receivedSat = 0,
            fees = 0,
            createdAt = 0,
        )

    override suspend fun listOutgoingPayments(
        from: Long,
        to: Long?,
        limit: Int,
        offset: Int,
        all: Boolean,
    ): List<OutgoingPayment> = outgoingPayments

    override suspend fun getOutgoingPayment(paymentId: String): OutgoingPayment = fakeOutgoingPayment()

    override suspend fun getOutgoingPaymentByHash(paymentHash: String): OutgoingPayment = fakeOutgoingPayment()

    override suspend fun csvExport(request: CsvExport): String = label

    override suspend fun closeChannel(request: CloseChannelRequest): CloseChannelResponse {
        closeChannelRequests.add(request)
        return CloseChannelResponse(txId = label)
    }

    override fun close() {
        closed = true
    }

    private fun fakePaymentResponse(recipientAmountSat: Long = 0) =
        PaymentResponse(
            recipientAmountSat = recipientAmountSat,
            routingFeeSat = 0,
            paymentId = label,
            paymentHash = label,
            paymentPreimage = label,
        )

    private fun fakeOutgoingPayment() =
        OutgoingPayment(
            type = "outgoing_payment",
            subType = "lightning",
            paymentId = label,
            isPaid = true,
            sent = 0,
            fees = 0,
            createdAt = 0,
        )
}
