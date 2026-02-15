package pos.ambrosia.services

import pos.ambrosia.models.Phoenix.*

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
    externalId: String? = null
  ): List<IncomingPayment>
  suspend fun getIncomingPayment(paymentHash: String): IncomingPayment
  suspend fun listOutgoingPayments(
    from: Long = 0,
    to: Long? = null,
    limit: Int = 20,
    offset: Int = 0,
    all: Boolean = false
  ): List<OutgoingPayment>
  suspend fun getOutgoingPayment(paymentId: String): OutgoingPayment
  suspend fun getOutgoingPaymentByHash(paymentHash: String): OutgoingPayment
}
