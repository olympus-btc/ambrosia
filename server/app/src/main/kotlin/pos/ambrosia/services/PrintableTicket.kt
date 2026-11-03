package pos.ambrosia.services

import pos.ambrosia.models.ShiftReportPrintData
import pos.ambrosia.models.TicketData

sealed interface PrintableTicket {
    val issuedAt: String?

    data class SaleReceipt(
        val ticketData: TicketData,
    ) : PrintableTicket {
        override val issuedAt: String? get() = ticketData.issuedAt
    }

    data class ShiftReport(
        val shiftReport: ShiftReportPrintData,
    ) : PrintableTicket {
        override val issuedAt: String? get() = shiftReport.closedAt
    }
}
