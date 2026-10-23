package pos.ambrosia.utils

import pos.ambrosia.models.ShiftReportLabels

fun shiftReportLabels(paymentMethods: Map<String, String> = emptyMap()): ShiftReportLabels =
    ShiftReportLabels(
        title = "SHIFT CLOSE",
        cashier = "Cashier",
        openedAt = "Opened",
        closedAt = "Closed",
        tickets = "Tickets",
        totalSales = "Sales",
        tips = "Tips",
        initialAmount = "Initial cash",
        cashSales = "Cash sales",
        cashRefunds = "Cash refunds",
        expectedCash = "Expected cash",
        countedCash = "Counted cash",
        difference = "Difference",
        paymentMethods = paymentMethods,
    )
