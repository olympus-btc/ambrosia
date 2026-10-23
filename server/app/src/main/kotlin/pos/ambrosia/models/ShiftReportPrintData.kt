package pos.ambrosia.models

import kotlinx.serialization.Serializable

@Serializable
data class ShiftReportPrintData(
    val cashierName: String,
    val openedAt: String,
    val closedAt: String? = null,
    val breakdown: ShiftBreakdown,
    val labels: ShiftReportLabels,
)

@Serializable
data class ShiftReportLabels(
    val title: String,
    val cashier: String,
    val openedAt: String,
    val closedAt: String,
    val tickets: String,
    val totalSales: String,
    val tips: String,
    val initialAmount: String,
    val cashSales: String,
    val cashRefunds: String,
    val expectedCash: String,
    val countedCash: String,
    val difference: String,
    val paymentMethods: Map<String, String> = emptyMap(),
)
