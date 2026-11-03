package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.ReferenceOption
import org.jetbrains.exposed.v1.core.Table
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
    val cashDrawerEnabled = bool("cash_drawer_enabled").default(false)
    val cashDrawerPin = varchar("cash_drawer_pin", 10).default("PIN_2")
    val openCashDrawerOnRefund = bool("open_cash_drawer_on_refund").default(true)
    val openCashDrawerOnShiftOpen = bool("open_cash_drawer_on_shift_open").default(true)
    val openCashDrawerOnShiftClose = bool("open_cash_drawer_on_shift_close").default(true)

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
    var cashDrawerEnabled by PrinterConfigsTable.cashDrawerEnabled
    var cashDrawerPin by PrinterConfigsTable.cashDrawerPin
    var openCashDrawerOnRefund by PrinterConfigsTable.openCashDrawerOnRefund
    var openCashDrawerOnShiftOpen by PrinterConfigsTable.openCashDrawerOnShiftOpen
    var openCashDrawerOnShiftClose by PrinterConfigsTable.openCashDrawerOnShiftClose
}

object PrinterConfigCashDrawerPaymentMethodsTable : Table("printer_config_cash_drawer_payment_methods") {
    val printerConfigId = reference("printer_config_id", PrinterConfigsTable, onDelete = ReferenceOption.CASCADE)
    val paymentMethodId = reference("payment_method_id", PaymentMethodsTable, onDelete = ReferenceOption.CASCADE)

    override val primaryKey = PrimaryKey(printerConfigId, paymentMethodId)
}
