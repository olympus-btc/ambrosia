package pos.ambrosia.services

import pos.ambrosia.models.phoenix.IncomingPayment

interface IncomingPaymentHistory {
    suspend fun listIncomingPayments(
        from: Long,
        to: Long?,
        limit: Int,
        offset: Int,
        all: Boolean,
        externalId: String?,
    ): List<IncomingPayment>

    suspend fun getIncomingPayment(paymentHash: String): IncomingPayment
}
