package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object TicketTemplatesTable : SQLiteUUIDTable("ticket_templates") {
    val name = varchar("name", 255).uniqueIndex()
}

class TicketTemplateEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<TicketTemplateEntity>(TicketTemplatesTable)

    var name by TicketTemplatesTable.name
}

object TicketTemplateElementsTable : SQLiteUUIDTable("ticket_template_elements") {
    val templateId = reference("template_id", TicketTemplatesTable)
    val elementOrder = integer("element_order")
    val type = varchar("type", 20)
    val value = text("value").nullable()
    val styleBold = bool("style_bold").default(false)
    val styleJustification = varchar("style_justification", 10).default("LEFT")
    val styleFontSize = varchar("style_font_size", 15).default("NORMAL")
}

class TicketTemplateElementEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<TicketTemplateElementEntity>(TicketTemplateElementsTable)

    var templateId by TicketTemplateElementsTable.templateId
    var elementOrder by TicketTemplateElementsTable.elementOrder
    var type by TicketTemplateElementsTable.type
    var value by TicketTemplateElementsTable.value
    var styleBold by TicketTemplateElementsTable.styleBold
    var styleJustification by TicketTemplateElementsTable.styleJustification
    var styleFontSize by TicketTemplateElementsTable.styleFontSize
}
