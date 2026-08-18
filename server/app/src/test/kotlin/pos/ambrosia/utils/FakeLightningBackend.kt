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
    private val label: String,
) : LightningBackend {
    var closed = false
        private set

    override suspend fun getNodeInfo(): NodeInfo =
        NodeInfo(nodeId = label, channels = emptyList(), chain = "test", blockHeight = 0, version = label)

    override suspend fun getBalance(): PhoenixBalance = PhoenixBalance(balanceSat = 0, feeCreditSat = 0)

    override suspend fun getSeed(): String = label

    override suspend fun createInvoice(request: CreateInvoiceRequest): CreateInvoiceResponse =
        CreateInvoiceResponse(amountSat = request.amountSat, paymentHash = label, serialized = label)

    override suspend fun createOffer(request: CreateOffer): String = label

    override suspend fun payInvoice(request: PayInvoiceRequest): PaymentResponse = fakePaymentResponse()

    override suspend fun payOffer(request: PayOfferRequest): PaymentResponse = fakePaymentResponse()

    override suspend fun payOnchain(request: PayOnchainRequest): PaymentResponse = fakePaymentResponse()

    override suspend fun bumpOnchainFees(feerateSatByte: Int): String = label

    override suspend fun listIncomingPayments(
        from: Long,
        to: Long?,
        limit: Int,
        offset: Int,
        all: Boolean,
        externalId: String?,
    ): List<IncomingPayment> = emptyList()

    override suspend fun getIncomingPayment(paymentHash: String): IncomingPayment =
        IncomingPayment(
            type = "incoming_payment",
            subType = "lightning",
            paymentHash = label,
            isPaid = true,
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
    ): List<OutgoingPayment> = emptyList()

    override suspend fun getOutgoingPayment(paymentId: String): OutgoingPayment = fakeOutgoingPayment()

    override suspend fun getOutgoingPaymentByHash(paymentHash: String): OutgoingPayment = fakeOutgoingPayment()

    override suspend fun csvExport(request: CsvExport): String = label

    override suspend fun closeChannel(request: CloseChannelRequest): CloseChannelResponse = CloseChannelResponse(txId = label)

    override fun close() {
        closed = true
    }

    private fun fakePaymentResponse() =
        PaymentResponse(
            recipientAmountSat = 0,
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
