package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.Order
import pos.ambrosia.models.OrderDish
import java.sql.Connection
import java.util.UUID

class OrderService(
    private val connection: Connection,
) {
    companion object {
        private const val ADD_ORDER =
            "INSERT INTO orders (id, user_id, table_id, status, total, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        private const val GET_ORDERS =
            "SELECT id, user_id, table_id, status, total, created_at FROM orders WHERE is_deleted = 0"
        private const val GET_ORDER_BY_ID =
            "SELECT id, user_id, table_id, status, total, created_at FROM orders WHERE id = ? AND is_deleted = 0"
        private const val UPDATE_ORDER =
            "UPDATE orders SET user_id = ?, table_id = ?, status = ?, total = ? WHERE id = ?"
        private const val DELETE_ORDER = "UPDATE orders SET is_deleted = 1 WHERE id = ?"
        private const val CHECK_USER_EXISTS = "SELECT id FROM users WHERE id = ? AND is_deleted = 0"
        private const val CHECK_TABLE_EXISTS = "SELECT id FROM tables WHERE id = ? AND is_deleted = 0"
        private const val GET_ORDERS_BY_TABLE =
            "SELECT id, user_id, table_id, status, total, created_at FROM orders WHERE table_id = ? AND is_deleted = 0"
        private const val GET_ORDERS_BY_USER =
            "SELECT id, user_id, table_id, status, total, created_at FROM orders WHERE user_id = ? AND is_deleted = 0"
        private const val GET_ORDERS_BY_STATUS =
            "SELECT id, user_id, table_id, status, total, created_at FROM orders WHERE status = ? AND is_deleted = 0"
        private const val GET_ORDERS_BY_DATE_RANGE =
            "SELECT id, user_id, table_id, status, total, created_at FROM orders WHERE created_at BETWEEN ? AND ? AND is_deleted = 0"
    }

    private val validStatuses = setOf("open", "closed", "paid")
    private val orderDishService = OrderDishService(connection)

    private fun userExists(userId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_USER_EXISTS)
        statement.setString(1, userId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun tableExists(tableId: String?): Boolean {
        if (tableId == null) return true
        val statement = connection.prepareStatement(CHECK_TABLE_EXISTS)
        statement.setString(1, tableId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun isValidStatus(status: String): Boolean = validStatuses.contains(status)

    private fun mapResultSetToOrder(resultSet: java.sql.ResultSet): Order =
        Order(
            id = resultSet.getString("id"),
            userId = resultSet.getString("user_id"),
            tableId = resultSet.getString("table_id"),
            status = resultSet.getString("status"),
            total = resultSet.getDouble("total"),
            createdAt = resultSet.getString("created_at").replace(" ", "T"),
        )

    suspend fun addOrder(order: Order): String? {
        if (!userExists(order.userId)) {
            logger.error("User does not exist: ${order.userId}")
            return null
        }

        if (!tableExists(order.tableId)) {
            logger.error("Table does not exist: ${order.tableId}")
            return null
        }

        val orderStatus = order.status
        if (!isValidStatus(orderStatus)) {
            logger.error("Invalid order status: $orderStatus")
            return null
        }

        val generatedId = UUID.randomUUID().toString()
        val statement = connection.prepareStatement(ADD_ORDER)

        statement.setString(1, generatedId)
        statement.setString(2, order.userId)
        statement.setString(3, order.tableId)
        statement.setString(4, orderStatus)
        statement.setDouble(5, order.total)
        val createdAt =
            order.createdAt.ifEmpty {
                java.time.LocalDateTime
                    .now()
                    .toString()
            }
        statement.setString(6, createdAt)

        val rowsAffected = statement.executeUpdate()

        return if (rowsAffected > 0) {
            logger.info("Order created successfully with ID: $generatedId")
            generatedId
        } else {
            logger.error("Failed to create order")
            null
        }
    }

    suspend fun getOrders(): List<Order> {
        val statement = connection.prepareStatement(GET_ORDERS)
        val resultSet = statement.executeQuery()
        val orders = mutableListOf<Order>()
        while (resultSet.next()) {
            orders.add(mapResultSetToOrder(resultSet))
        }
        logger.info("Retrieved ${orders.size} orders")
        return orders
    }

    suspend fun getOrderById(id: String): Order? {
        val statement = connection.prepareStatement(GET_ORDER_BY_ID)
        statement.setString(1, id)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) {
            mapResultSetToOrder(resultSet)
        } else {
            logger.warn("Order not found with ID: $id")
            null
        }
    }

    suspend fun getOrdersByTableId(tableId: String): List<Order>? {
        if (!tableExists(tableId)) return null
        val statement = connection.prepareStatement(GET_ORDERS_BY_TABLE)
        statement.setString(1, tableId)
        val resultSet = statement.executeQuery()
        val orders = mutableListOf<Order>()
        while (resultSet.next()) {
            orders.add(mapResultSetToOrder(resultSet))
        }
        logger.info("Retrieved ${orders.size} orders for table: $tableId")
        return orders
    }

    suspend fun getOrdersByUserId(userId: String): List<Order>? {
        if (!userExists(userId)) return null
        val statement = connection.prepareStatement(GET_ORDERS_BY_USER)
        statement.setString(1, userId)
        val resultSet = statement.executeQuery()
        val orders = mutableListOf<Order>()
        while (resultSet.next()) {
            orders.add(mapResultSetToOrder(resultSet))
        }
        logger.info("Retrieved ${orders.size} orders for user: $userId")
        return orders
    }

    suspend fun getOrdersByStatus(status: String): List<Order>? {
        if (!isValidStatus(status)) {
            logger.error("Invalid status: $status")
            return null
        }

        val statement = connection.prepareStatement(GET_ORDERS_BY_STATUS)
        statement.setString(1, status)
        val resultSet = statement.executeQuery()
        val orders = mutableListOf<Order>()
        while (resultSet.next()) {
            orders.add(mapResultSetToOrder(resultSet))
        }
        logger.info("Retrieved ${orders.size} orders with status: $status")
        return orders
    }

    suspend fun getOrdersByDateRange(
        startDate: String,
        endDate: String,
    ): List<Order> {
        val statement = connection.prepareStatement(GET_ORDERS_BY_DATE_RANGE)
        statement.setString(1, startDate)
        statement.setString(2, endDate)
        val resultSet = statement.executeQuery()
        val orders = mutableListOf<Order>()
        while (resultSet.next()) {
            orders.add(mapResultSetToOrder(resultSet))
        }
        logger.info("Retrieved ${orders.size} orders between $startDate and $endDate")
        return orders
    }

    suspend fun updateOrder(order: Order): Boolean {
        if (order.id == null) {
            logger.error("Cannot update order: ID is null")
            return false
        }

        if (!userExists(order.userId)) {
            logger.error("User does not exist: ${order.userId}")
            return false
        }

        if (!tableExists(order.tableId)) {
            logger.error("Table does not exist: ${order.tableId}")
            return false
        }

        val orderStatus = order.status
        if (!isValidStatus(orderStatus)) {
            logger.error("Invalid order status: $orderStatus")
            return false
        }

        val statement = connection.prepareStatement(UPDATE_ORDER)
        statement.setString(1, order.userId)
        statement.setString(2, order.tableId)
        statement.setString(3, orderStatus)
        statement.setDouble(4, order.total)
        statement.setString(5, order.id)

        val rowsUpdated = statement.executeUpdate()
        if (rowsUpdated > 0) {
            logger.info("Order updated successfully: ${order.id}")
        } else {
            logger.error("Failed to update order: ${order.id}")
        }
        return rowsUpdated > 0
    }

    suspend fun deleteOrder(id: String): Boolean {
        val statement = connection.prepareStatement(DELETE_ORDER)
        statement.setString(1, id)
        val rowsDeleted = statement.executeUpdate()

        if (rowsDeleted > 0) {
            logger.info("Order soft-deleted successfully: $id")
        } else {
            logger.error("Failed to delete order: $id")
        }
        return rowsDeleted > 0
    }

    suspend fun addDishesToOrder(
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

    suspend fun getOrderDishes(orderId: String): List<OrderDish> = orderDishService.getOrderDishesByOrderId(orderId)

    suspend fun updateOrderDish(orderDish: OrderDish): Boolean = orderDishService.updateOrderDish(orderDish)

    suspend fun removeOrderDish(orderDishId: String): Boolean = orderDishService.deleteOrderDish(orderDishId)

    suspend fun removeAllOrderDishes(orderId: String): Boolean = orderDishService.deleteOrderDishesByOrderId(orderId)

    suspend fun calculateOrderTotal(orderId: String): Double {
        val dishes = orderDishService.getOrderDishesByOrderId(orderId)
        return dishes.sumOf { it.priceAtOrder }
    }

    suspend fun updateOrderTotal(orderId: String): Boolean {
        val newTotal = calculateOrderTotal(orderId)
        val order = getOrderById(orderId) ?: return false
        val updatedOrder = order.copy(total = newTotal)
        return updateOrder(updatedOrder)
    }
}
