package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object InvoicesTable : SQLiteUUIDTable("invoices") {
    val invoiceYear = integer("invoice_year")
    val invoiceNumber = varchar("invoice_number", 50).uniqueIndex()
    val clientId = reference("client_id", ClientsTable)
    val status = varchar("status", 20).default("pending")
    val currencyId = reference("currency_id", CurrencyTable)
    val periodStart = varchar("period_start", 20)
    val periodEnd = varchar("period_end", 20)
    val totalCents = integer("total_cents")
    val payoutSnapshot = text("payout_snapshot").nullable()
    val paymentMethod = varchar("payment_method", 20)
    val paymentHash = text("payment_hash").nullable()
    val bolt11 = text("bolt11").nullable()
    val createdAt = varchar("created_at", 50)
}

class InvoiceEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<InvoiceEntity>(InvoicesTable)

    var invoiceYear by InvoicesTable.invoiceYear
    var invoiceNumber by InvoicesTable.invoiceNumber
    var clientId by InvoicesTable.clientId
    var status by InvoicesTable.status
    var currencyId by InvoicesTable.currencyId
    var periodStart by InvoicesTable.periodStart
    var periodEnd by InvoicesTable.periodEnd
    var totalCents by InvoicesTable.totalCents
    var payoutSnapshot by InvoicesTable.payoutSnapshot
    var paymentMethod by InvoicesTable.paymentMethod
    var paymentHash by InvoicesTable.paymentHash
    var bolt11 by InvoicesTable.bolt11
    var createdAt by InvoicesTable.createdAt
}

object InvoiceLineItemsTable : SQLiteUUIDTable("invoice_line_items") {
    val invoiceId = reference("invoice_id", InvoicesTable)
    val projectId = reference("project_id", ProjectsTable)
    val taskId = reference("task_id", TasksTable)
    val quantityMinutes = integer("quantity_minutes")
    val rateCents = integer("rate_cents")
    val amountCents = integer("amount_cents")
    val createdAt = varchar("created_at", 50)
}

class InvoiceLineItemEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<InvoiceLineItemEntity>(InvoiceLineItemsTable)

    var invoiceId by InvoiceLineItemsTable.invoiceId
    var projectId by InvoiceLineItemsTable.projectId
    var taskId by InvoiceLineItemsTable.taskId
    var quantityMinutes by InvoiceLineItemsTable.quantityMinutes
    var rateCents by InvoiceLineItemsTable.rateCents
    var amountCents by InvoiceLineItemsTable.amountCents
    var createdAt by InvoiceLineItemsTable.createdAt
}

object InvoicePaymentsTable : Table("invoice_payments") {
    val paymentId = reference("payment_id", PaymentsTable)
    val invoiceId = reference("invoice_id", InvoicesTable)

    override val primaryKey = PrimaryKey(paymentId, invoiceId)
}
