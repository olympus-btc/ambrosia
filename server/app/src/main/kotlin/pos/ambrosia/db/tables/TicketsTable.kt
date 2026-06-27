package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object TicketsTable : SQLiteUUIDTable("tickets") {
    val orderId = reference("order_id", OrdersTable)
    val userId = reference("user_id", UsersTable)
    val ticketDate = varchar("ticket_date", 50)
    val status = integer("status").default(1)
    val totalAmount = double("total_amount").default(0.0)
    val notes = text("notes").nullable()
}

class TicketEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<TicketEntity>(TicketsTable)

    var orderId by TicketsTable.orderId
    var userId by TicketsTable.userId
    var ticketDate by TicketsTable.ticketDate
    var status by TicketsTable.status
    var totalAmount by TicketsTable.totalAmount
    var notes by TicketsTable.notes
}

object TicketsDishTable : Table("tickets_dish") {
    val ticketId = reference("id_ticket", TicketsTable)
    val dishId = reference("id_dish", DishesTable)
    val quantity = integer("quantity").default(1)
    val priceAtOrder = double("price_at_order")
    val notes = text("notes").nullable()
    override val primaryKey = PrimaryKey(ticketId, dishId)
}

object TicketPaymentsTable : Table("ticket_payments") {
    val paymentId = reference("payment_id", PaymentsTable)
    val ticketId = reference("ticket_id", TicketsTable)
}
