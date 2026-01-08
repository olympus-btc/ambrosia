package pos.ambrosia.models

import kotlinx.serialization.Serializable

@Serializable
data class PrintRequest(
    val templateName: String? = null,
    val ticketData: TicketData,
    val printerType: PrinterType,
    val printerId: String? = null,
    val broadcast: Boolean = false,
    val forceTemplateName: Boolean = false
)

@Serializable
data class TicketTemplate(
    val id: String,
    val name: String,
    val elements: List<TicketElement>
)

@Serializable
data class TicketElement(
    val id: String,
    val templateId: String,
    val order: Int,
    val type: ElementType,
    val value: String, // Can be a literal string or a placeholder like {{ticket.total}}
    val style: ElementStyle? = null
)

@Serializable
enum class ElementType {
    HEADER,
    TEXT,
    LINE_BREAK,
    SEPARATOR,
    TABLE_HEADER,
    TABLE_ROW,
    FOOTER,
    QRCODE
}

@Serializable
data class ElementStyle(
    val bold: Boolean = false,
    val justification: Justification = Justification.LEFT,
    val fontSize: FontSize = FontSize.NORMAL
)

@Serializable
enum class Justification { LEFT, CENTER, RIGHT }

@Serializable
enum class FontSize { NORMAL, LARGE, EXTRA_LARGE }

@Serializable
data class TicketTemplateRequest(
    val name: String,
    val elements: List<TicketElementCreateRequest>
)

@Serializable
data class TicketElementCreateRequest(
    val type: ElementType,
    val value: String,
    val style: ElementStyle? = null
)
