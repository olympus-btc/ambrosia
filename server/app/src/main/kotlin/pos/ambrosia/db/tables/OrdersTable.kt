package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object OrdersTable : SQLiteUUIDTable("orders") {
    val userId = reference("user_id", UsersTable)
    val tableId = varchar("table_id", 36).nullable()
    val status = varchar("status", 20).default("open")
    val total = double("total").default(0.0)
    val discountAmount = double("discount_amount").default(0.0)
    val createdAt = varchar("created_at", 50)
    val isDeleted = bool("is_deleted").default(false)
}

class OrderEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<OrderEntity>(OrdersTable)

    var userId by OrdersTable.userId
    var tableId by OrdersTable.tableId
    var status by OrdersTable.status
    var total by OrdersTable.total
    var discountAmount by OrdersTable.discountAmount
    var createdAt by OrdersTable.createdAt
    var isDeleted by OrdersTable.isDeleted
}

object OrdersDishesTable : SQLiteUUIDTable("orders_dishes") {
    val orderId = reference("order_id", OrdersTable)
    val dishId = reference("dish_id", DishesTable)
    val priceAtOrder = double("price_at_order")
    val notes = text("notes").nullable()
    val status = varchar("status", 20).default("pending")
    val shouldPrepare = bool("should_prepare").default(true)
}

class OrderDishEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<OrderDishEntity>(OrdersDishesTable)

    var orderId by OrdersDishesTable.orderId
    var dishId by OrdersDishesTable.dishId
    var priceAtOrder by OrdersDishesTable.priceAtOrder
    var notes by OrdersDishesTable.notes
    var status by OrdersDishesTable.status
    var shouldPrepare by OrdersDishesTable.shouldPrepare
}

object OrderProductsTable : Table("order_products") {
    val orderId = reference("order_id", OrdersTable)
    val productId = reference("product_id", ProductsTable)
    val quantity = integer("quantity").default(1)
    val priceAtOrder = integer("price_at_order")
    override val primaryKey = PrimaryKey(orderId, productId)
}
