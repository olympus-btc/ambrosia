package pos.ambrosia.models

import kotlinx.serialization.Serializable

@Serializable
data class PrintRequest(
    val templateName: String? = null,
    val ticketData: TicketData? = null,
    val shiftReport: ShiftReportPrintData? = null,
    val ticketType: PrintableTicketType = PrintableTicketType.RECEIPT,
    val printerType: PrinterType,
    val printerId: String? = null,
    val broadcast: Boolean = false,
    val forceTemplateName: Boolean = false,
)

@Serializable
enum class PrintableTicketType {
    RECEIPT,
    SHIFT_CLOSE,
}

@Serializable
data class TicketTemplate(
    val id: String,
    val name: String,
    val elements: List<TicketElement>,
    val dateFormat: TicketDateFormat = TicketDateFormat.DAY_MONTH_YEAR,
    val timeFormat: TicketTimeFormat = TicketTimeFormat.HOURS_24,
    val ticketType: PrintableTicketType = PrintableTicketType.RECEIPT,
    val isDefault: Boolean = false,
)

@Serializable
enum class TicketDateFormat(
    val pattern: String,
) {
    DAY_MONTH_YEAR("dd/MM/yyyy"),
    MONTH_DAY_YEAR("MM/dd/yyyy"),
    YEAR_MONTH_DAY("yyyy-MM-dd"),
}

@Serializable
enum class TicketTimeFormat(
    val pattern: String,
) {
    HOURS_24("HH:mm"),
    HOURS_12("h:mm a"),
}

@Serializable
data class TicketElement(
    val id: String,
    val templateId: String,
    val order: Int,
    val type: ElementType,
    val value: String, // Can be a literal string or a placeholder like {{ticket.total}}
    val style: ElementStyle? = null,
)

@Serializable
enum class ElementType {
    HEADER,
    TEXT,
    LINE_BREAK,
    SEPARATOR,
    TABLE_HEADER,
    TABLE_ROW,
    TOTAL_ROW,
    PAYMENT_METHOD,
    FOOTER,
    QRCODE,
    LOGO,
    SHIFT_SUMMARY,
}

@Serializable
data class ElementStyle(
    val bold: Boolean = false,
    val justification: Justification = Justification.LEFT,
    val fontSize: FontSize = FontSize.NORMAL,
)

@Serializable
enum class Justification { LEFT, CENTER, RIGHT }

@Serializable
enum class FontSize { NORMAL, LARGE, EXTRA_LARGE }

@Serializable
enum class ImageSize { SMALL, MEDIUM, LARGE }

@Serializable
data class TicketTemplateRequest(
    val name: String,
    val elements: List<TicketElementCreateRequest>,
    val dateFormat: TicketDateFormat = TicketDateFormat.DAY_MONTH_YEAR,
    val timeFormat: TicketTimeFormat = TicketTimeFormat.HOURS_24,
    val ticketType: PrintableTicketType = PrintableTicketType.RECEIPT,
)

@Serializable
data class TicketElementCreateRequest(
    val type: ElementType,
    val value: String,
    val style: ElementStyle? = null,
)
