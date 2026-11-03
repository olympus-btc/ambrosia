package pos.ambrosia.models

import kotlinx.serialization.Serializable

@Serializable
data class TicketData(
    val ticketId: String,
    val tableName: String,
    val roomName: String,
    val date: String,
    val items: List<TicketDataItem>,
    val total: Double,
    val discountAmount: Double = 0.0,
    val tipAmount: Double = 0.0,
    val invoice: String? = null,
    val paymentMethod: String? = null,
    val issuedAt: String? = null,
    val labels: TicketLabels,
)

@Serializable
data class TicketLabels(
    val total: String,
    val discount: String,
    val tip: String,
    val paymentMethod: String,
)

@Serializable
data class TicketDataItem(
    val quantity: Int,
    val name: String,
    val price: Double,
    val comments: List<String> = emptyList(),
)
