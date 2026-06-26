package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object PrinterConfigsTable : SQLiteUUIDTable("printer_configs") {
    val printerType = varchar("printer_type", 20)
    val printerName = varchar("printer_name", 255)
    val templateName = varchar("template_name", 255).nullable()
    val isDefault = bool("is_default").default(false)
    val enabled = bool("enabled").default(true)
    val createdAt = varchar("created_at", 50)

    init {
        uniqueIndex(printerType, printerName)
    }
}

class PrinterConfigEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<PrinterConfigEntity>(PrinterConfigsTable)

    var printerType by PrinterConfigsTable.printerType
    var printerName by PrinterConfigsTable.printerName
    var templateName by PrinterConfigsTable.templateName
    var isDefault by PrinterConfigsTable.isDefault
    var enabled by PrinterConfigsTable.enabled
    var createdAt by PrinterConfigsTable.createdAt
}
