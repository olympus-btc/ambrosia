package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.between
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.DiningTableEntity
import pos.ambrosia.db.tables.OrderEntity
import pos.ambrosia.db.tables.OrdersTable
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.logger
import pos.ambrosia.models.Order
import pos.ambrosia.models.OrderDish
import java.time.LocalDateTime
import java.util.UUID

class OrderService {
    private val validStatuses = setOf("open", "closed", "paid")
    private val orderDishService = OrderDishService()

    private fun userExists(userId: String): Boolean =
        try {
            UserEntity.findById(UUID.fromString(userId))?.takeIf { !it.isDeleted } != null
        } catch (_: IllegalArgumentException) {
            false
        }

    private fun tableExists(tableId: String?): Boolean {
        if (tableId == null) return true
        return try {
            DiningTableEntity.findById(UUID.fromString(tableId))?.takeIf { !it.isDeleted } != null
        } catch (_: IllegalArgumentException) {
            false
        }
    }

    private fun isValidStatus(status: String): Boolean = validStatuses.contains(status)

    private fun toModel(entity: OrderEntity): Order =
        Order(
            id = entity.id.value.toString(),
            userId = entity.userId.value.toString(),
            tableId = entity.tableId,
            status = entity.status,
            total = entity.total,
            createdAt = entity.createdAt.replace(" ", "T"),
        )

    fun addOrder(order: Order): String? =
        transaction {
            if (!userExists(order.userId)) {
                logger.error("User does not exist: ${order.userId}")
                return@transaction null
            }

            if (!tableExists(order.tableId)) {
                logger.error("Table does not exist: ${order.tableId}")
                return@transaction null
            }

            if (!isValidStatus(order.status)) {
                logger.error("Invalid order status: ${order.status}")
                return@transaction null
            }

            val createdAt = order.createdAt.ifEmpty { LocalDateTime.now().toString() }
            val created =
                OrderEntity.new(UUID.randomUUID()) {
                    this.userId = EntityID(UUID.fromString(order.userId), UsersTable)
                    this.tableId = order.tableId
                    this.status = order.status
                    this.total = order.total
                    this.createdAt = createdAt
                }

            logger.info("Order created successfully with ID: ${created.id.value}")
            created.id.value.toString()
        }

    fun getOrders(): List<Order> =
        transaction {
            val orders = OrderEntity.find { OrdersTable.isDeleted eq false }.map { toModel(it) }
            logger.info("Retrieved ${orders.size} orders")
            orders
        }

    fun getOrderById(id: String): Order? =
        transaction {
            val uuid =
                try {
                    UUID.fromString(id)
                } catch (_: IllegalArgumentException) {
                    return@transaction null
                }
            val entity = OrderEntity.findById(uuid)?.takeIf { !it.isDeleted }
            if (entity != null) {
                toModel(entity)
            } else {
                logger.warn("Order not found with ID: $id")
                null
            }
        }

    fun getOrdersByTableId(tableId: String): List<Order>? =
        transaction {
            if (!tableExists(tableId)) return@transaction null
            val orders =
                OrderEntity
                    .find { (OrdersTable.tableId eq tableId) and (OrdersTable.isDeleted eq false) }
                    .map { toModel(it) }
            logger.info("Retrieved ${orders.size} orders for table: $tableId")
            orders
        }

    fun getOrdersByUserId(userId: String): List<Order>? =
        transaction {
            if (!userExists(userId)) return@transaction null
            val userEntityId = EntityID(UUID.fromString(userId), UsersTable)
            val orders =
                OrderEntity
                    .find { (OrdersTable.userId eq userEntityId) and (OrdersTable.isDeleted eq false) }
                    .map { toModel(it) }
            logger.info("Retrieved ${orders.size} orders for user: $userId")
            orders
        }

    fun getOrdersByStatus(status: String): List<Order>? =
        transaction {
            if (!isValidStatus(status)) {
                logger.error("Invalid status: $status")
                return@transaction null
            }

            val orders =
                OrderEntity
                    .find { (OrdersTable.status eq status) and (OrdersTable.isDeleted eq false) }
                    .map { toModel(it) }
            logger.info("Retrieved ${orders.size} orders with status: $status")
            orders
        }

    fun getOrdersByDateRange(
        startDate: String,
        endDate: String,
    ): List<Order> =
        transaction {
            val orders =
                OrderEntity
                    .find { OrdersTable.createdAt.between(startDate, endDate) and (OrdersTable.isDeleted eq false) }
                    .map { toModel(it) }
            logger.info("Retrieved ${orders.size} orders between $startDate and $endDate")
            orders
        }

    fun updateOrder(order: Order): Boolean =
        transaction {
            val id = order.id
            if (id == null) {
                logger.error("Cannot update order: ID is null")
                return@transaction false
            }

            if (!userExists(order.userId)) {
                logger.error("User does not exist: ${order.userId}")
                return@transaction false
            }

            if (!tableExists(order.tableId)) {
                logger.error("Table does not exist: ${order.tableId}")
                return@transaction false
            }

            if (!isValidStatus(order.status)) {
                logger.error("Invalid order status: ${order.status}")
                return@transaction false
            }

            val uuid =
                try {
                    UUID.fromString(id)
                } catch (_: IllegalArgumentException) {
                    return@transaction false
                }
            val entity = OrderEntity.findById(uuid)
            if (entity == null) {
                logger.error("Failed to update order: $id")
                return@transaction false
            }

            entity.userId = EntityID(UUID.fromString(order.userId), UsersTable)
            entity.tableId = order.tableId
            entity.status = order.status
            entity.total = order.total

            logger.info("Order updated successfully: $id")
            true
        }

    fun deleteOrder(id: String): Boolean =
        transaction {
            val uuid =
                try {
                    UUID.fromString(id)
                } catch (_: IllegalArgumentException) {
                    return@transaction false
                }
            val entity = OrderEntity.findById(uuid)
            if (entity == null) {
                logger.error("Failed to delete order: $id")
                false
            } else {
                entity.isDeleted = true
                logger.info("Order soft-deleted successfully: $id")
                true
            }
        }

    fun addDishesToOrder(
        orderId: String,
        dishes: List<OrderDish>,
    ): Boolean {
        var allAdded = true
        for (dish in dishes) {
            val dishWithOrderId = dish.copy(orderId = orderId)
            val addedOrderDishId = orderDishService.addOrderDish(dishWithOrderId)
            if (addedOrderDishId == null) {
                allAdded = false
                logger.error("Failed to add dish ${dish.dishId} to order $orderId")
            }
        }
        return allAdded
    }

    fun getOrderDishes(orderId: String): List<OrderDish> = orderDishService.getOrderDishesByOrderId(orderId)

    fun updateOrderDish(orderDish: OrderDish): Boolean = orderDishService.updateOrderDish(orderDish)

    fun removeOrderDish(orderDishId: String): Boolean = orderDishService.deleteOrderDish(orderDishId)

    fun removeAllOrderDishes(orderId: String): Boolean = orderDishService.deleteOrderDishesByOrderId(orderId)

    fun calculateOrderTotal(orderId: String): Double {
        val dishes = orderDishService.getOrderDishesByOrderId(orderId)
        return dishes.sumOf { it.priceAtOrder }
    }

    fun updateOrderTotal(orderId: String): Boolean {
        val newTotal = calculateOrderTotal(orderId)
        val order = getOrderById(orderId) ?: return false
        val updatedOrder = order.copy(total = newTotal)
        return updateOrder(updatedOrder)
    }
}
