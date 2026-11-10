package pos.ambrosia.models

import kotlinx.serialization.Serializable
import pos.ambrosia.utils.ParsedPurchasedItem

@Serializable
data class PaymentWithoutOrder(
    val paymentHash: String,
    val receivedSat: Long,
    val feeSat: Long,
    val completedAt: Long,
    val purchasedItems: List<ParsedPurchasedItem>,
)

@Serializable
data class MisdatedOrder(
    val paymentId: String,
    val orderId: String,
    val paymentHash: String,
    val recordedDate: String,
    val actualCompletedAt: Long,
)

@Serializable
data class OrdersSyncFindingsResponse(
    val paymentsWithoutOrder: List<PaymentWithoutOrder>,
    val misdatedOrders: List<MisdatedOrder>,
)
