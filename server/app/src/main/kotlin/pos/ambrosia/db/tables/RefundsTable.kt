package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object RefundsTable : SQLiteUUIDTable("refunds") {
    val orderId = reference("order_id", OrdersTable).uniqueIndex()
    val refundInvoice = text("refund_invoice")
    val satoshiAmount = long("satoshi_amount").default(0L)
    val refundedAt = varchar("refunded_at", 50)
    val paymentHash = text("payment_hash").nullable()
}

class RefundEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<RefundEntity>(RefundsTable)

    var orderId by RefundsTable.orderId
    var refundInvoice by RefundsTable.refundInvoice
    var satoshiAmount by RefundsTable.satoshiAmount
    var refundedAt by RefundsTable.refundedAt
    var paymentHash by RefundsTable.paymentHash
}
