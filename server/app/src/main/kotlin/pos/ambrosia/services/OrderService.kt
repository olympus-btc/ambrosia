package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.Order
import pos.ambrosia.models.OrderDish
import pos.ambrosia.models.OrderWithPayment
import pos.ambrosia.models.OrderWithPaymentFilters
import java.sql.Connection
import java.sql.PreparedStatement
import java.util.UUID

class OrderService(
    private val connection: Connection,
) {
    companion object {
        private const val ADD_ORDER =
            "INSERT INTO orders (id, user_id, table_id, waiter, status, total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        private const val GET_ORDERS =
            "SELECT id, user_id, table_id, waiter, status, total, created_at FROM orders WHERE is_deleted = 0"
        private const val GET_ORDER_BY_ID =
            "SELECT id, user_id, table_id, waiter, status, total, created_at FROM orders WHERE id = ? AND is_deleted = 0"
        private const val UPDATE_ORDER =
            "UPDATE orders SET user_id = ?, table_id = ?, waiter = ?, status = ?, total = ? WHERE id = ?"
        private const val DELETE_ORDER = "UPDATE orders SET is_deleted = 1 WHERE id = ?"
        private const val CHECK_USER_EXISTS = "SELECT id FROM users WHERE id = ? AND is_deleted = 0"
        private const val CHECK_TABLE_EXISTS = "SELECT id FROM tables WHERE id = ? AND is_deleted = 0"
        private const val GET_ORDERS_BY_TABLE =
            "SELECT id, user_id, table_id, waiter, status, total, created_at FROM orders WHERE table_id = ? AND is_deleted = 0"
        private const val GET_ORDERS_BY_USER =
            "SELECT id, user_id, table_id, waiter, status, total, created_at FROM orders WHERE user_id = ? AND is_deleted = 0"
        private const val GET_ORDERS_BY_STATUS =
            "SELECT id, user_id, table_id, waiter, status, total, created_at FROM orders WHERE status = ? AND is_deleted = 0"
        private const val GET_ORDERS_BY_DATE_RANGE =
            "SELECT id, user_id, table_id, waiter, status, total, created_at FROM orders WHERE created_at BETWEEN ? AND ? AND is_deleted = 0"
        private const val GET_TOTAL_SALES_BY_DATE =
            "SELECT SUM(total) AS total_sales FROM orders WHERE DATE(created_at) = ? AND status = 'paid' AND is_deleted = 0"
        private const val GET_ORDERS_WITH_PAYMENTS_BASE =
            """
            SELECT o.id,
                   o.user_id,
                   o.table_id,
                   o.waiter,
                   o.status,
                   o.total,
                   o.created_at,
                   GROUP_CONCAT(DISTINCT pm.name) AS payment_method,
                   GROUP_CONCAT(DISTINCT p.id) AS payment_method_ids
            FROM orders o
            LEFT JOIN tickets t ON t.order_id = o.id
            LEFT JOIN ticket_payments tp ON tp.ticket_id = t.id
            LEFT JOIN payments p ON p.id = tp.payment_id
            LEFT JOIN payment_methods pm ON pm.id = p.method_id
            WHERE o.is_deleted = 0
            """
    }

    private val validStatuses = setOf("open", "closed", "paid")
    private val validSortByColumns =
        mapOf(
            "date" to "datetime(o.created_at)",
            "total" to "o.total",
        )
    private val validSortOrders = setOf("asc", "desc")
    private val orderDishService = OrderDishService(connection)

    private fun userExists(userId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_USER_EXISTS)
        statement.setString(1, userId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun tableExists(tableId: String?): Boolean {
        if (tableId == null) return true // table_id es opcional
        val statement = connection.prepareStatement(CHECK_TABLE_EXISTS)
        statement.setString(1, tableId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun isValidStatus(status: String): Boolean = validStatuses.contains(status)

    private fun mapResultSetToOrder(resultSet: java.sql.ResultSet): Order =
        Order(
            id = resultSet.getString("id"),
            user_id = resultSet.getString("user_id"),
            table_id = resultSet.getString("table_id"),
            waiter = resultSet.getString("waiter"),
            status = resultSet.getString("status"),
            total = resultSet.getDouble("total"),
            created_at = resultSet.getString("created_at"),
        )

    private fun mapResultSetToOrderWithPayment(resultSet: java.sql.ResultSet): OrderWithPayment {
        val paymentNames = resultSet.getString("payment_method") ?: ""
        val paymentIdsConcat = resultSet.getString("payment_method_ids") ?: ""
        val paymentIds =
            paymentIdsConcat.split(",").mapNotNull { it.takeIf { id -> id.isNotBlank() } }

        return OrderWithPayment(
            id = resultSet.getString("id"),
            user_id = resultSet.getString("user_id"),
            table_id = resultSet.getString("table_id"),
            waiter = resultSet.getString("waiter"),
            status = resultSet.getString("status"),
            total = resultSet.getDouble("total"),
            created_at = resultSet.getString("created_at"),
            payment_method = paymentNames,
            payment_method_ids = paymentIds,
        )
    }

    private fun bindQueryParameters(
        statement: PreparedStatement,
        parameters: List<Any>,
    ) {
        parameters.forEachIndexed { index, value ->
            when (value) {
                is String -> statement.setString(index + 1, value)
                is Double -> statement.setDouble(index + 1, value)
                else -> error("Unsupported query parameter type: ${value::class.simpleName}")
            }
        }
    }

    private fun validateOrdersWithPaymentFilters(filters: OrderWithPaymentFilters) {
        filters.status?.let { status ->
            if (!isValidStatus(status)) {
                throw IllegalArgumentException("Invalid status: $status")
            }
        }

        filters.sortBy?.let { sortBy ->
            if (sortBy !in validSortByColumns.keys) {
                throw IllegalArgumentException("Invalid sort_by: $sortBy")
            }
        }

        filters.sortOrder?.let { sortOrder ->
            if (sortOrder.lowercase() !in validSortOrders) {
                throw IllegalArgumentException("Invalid sort_order: $sortOrder")
            }
        }

        if (filters.minTotal != null && filters.maxTotal != null && filters.minTotal > filters.maxTotal) {
            throw IllegalArgumentException("min_total cannot be greater than max_total")
        }
    }

    suspend fun addOrder(order: Order): String? {
        if (!userExists(order.user_id)) {
            logger.error("User does not exist: ${order.user_id}")
            return null
        }

        if (!tableExists(order.table_id)) {
            logger.error("Table does not exist: ${order.table_id}")
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
        statement.setString(2, order.user_id)
        statement.setString(3, order.table_id)
        statement.setString(4, order.waiter)
        statement.setString(5, orderStatus)
        statement.setDouble(6, order.total)
        val createdAt =
            order.created_at.ifEmpty {
                java.time.LocalDateTime
                    .now()
                    .toString()
            }
        statement.setString(7, createdAt)

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

    suspend fun getOrdersWithPayments(): List<OrderWithPayment> = getOrdersWithPaymentsFiltered()

    suspend fun getOrdersWithPaymentsFiltered(filters: OrderWithPaymentFilters = OrderWithPaymentFilters()): List<OrderWithPayment> {
        validateOrdersWithPaymentFilters(filters)

        val whereClauses = mutableListOf<String>()
        val parameters = mutableListOf<Any>()

        filters.startDate?.let {
            whereClauses.add("date(o.created_at) >= date(?)")
            parameters.add(it)
        }

        filters.endDate?.let {
            whereClauses.add("date(o.created_at) <= date(?)")
            parameters.add(it)
        }

        filters.status?.let {
            whereClauses.add("o.status = ?")
            parameters.add(it)
        }

        filters.userId?.let {
            whereClauses.add("o.user_id = ?")
            parameters.add(it)
        }

        filters.paymentMethod?.let {
            whereClauses.add(
                """
                EXISTS (
                    SELECT 1
                    FROM tickets t2
                    JOIN ticket_payments tp2 ON tp2.ticket_id = t2.id
                    JOIN payments p2 ON p2.id = tp2.payment_id
                    JOIN payment_methods pm2 ON pm2.id = p2.method_id
                    WHERE t2.order_id = o.id
                      AND lower(pm2.name) = lower(?)
                )
                """.trimIndent(),
            )
            parameters.add(it)
        }

        filters.minTotal?.let {
            whereClauses.add("o.total >= ?")
            parameters.add(it)
        }

        filters.maxTotal?.let {
            whereClauses.add("o.total <= ?")
            parameters.add(it)
        }

        val orderByColumn = validSortByColumns[filters.sortBy ?: "date"] ?: validSortByColumns.getValue("date")
        val orderDirection = (filters.sortOrder ?: "desc").lowercase()

        val query =
            buildString {
                append(GET_ORDERS_WITH_PAYMENTS_BASE)
                if (whereClauses.isNotEmpty()) {
                    append("\nAND ")
                    append(whereClauses.joinToString("\nAND "))
                }
                append("\nGROUP BY o.id")
                append("\nORDER BY ")
                append(orderByColumn)
                append(" ")
                append(orderDirection)
            }

        val statement = connection.prepareStatement(query)
        bindQueryParameters(statement, parameters)

        val resultSet = statement.executeQuery()
        val orders = mutableListOf<OrderWithPayment>()
        while (resultSet.next()) {
            orders.add(mapResultSetToOrderWithPayment(resultSet))
        }
        logger.info("Retrieved ${orders.size} orders with payments using filters: $filters")
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

        if (!userExists(order.user_id)) {
            logger.error("User does not exist: ${order.user_id}")
            return false
        }

        if (!tableExists(order.table_id)) {
            logger.error("Table does not exist: ${order.table_id}")
            return false
        }

        val orderStatus = order.status
        if (!isValidStatus(orderStatus)) {
            logger.error("Invalid order status: $orderStatus")
            return false
        }

        val statement = connection.prepareStatement(UPDATE_ORDER)
        statement.setString(1, order.user_id)
        statement.setString(2, order.table_id)
        statement.setString(3, order.waiter)
        statement.setString(4, orderStatus)
        statement.setDouble(5, order.total)
        statement.setString(6, order.id)

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

    suspend fun getTotalSalesByDate(date: String): Double {
        val statement = connection.prepareStatement(GET_TOTAL_SALES_BY_DATE)
        statement.setString(1, date)
        val resultSet = statement.executeQuery()
        val total =
            if (resultSet.next()) {
                resultSet.getDouble("total_sales")
            } else {
                0.0
            }

        logger.info("Total sales for $date: $total")
        return total
    }

    suspend fun addDishesToOrder(
        orderId: String,
        dishes: List<OrderDish>,
    ): Boolean {
        var allAdded = true
        for (dish in dishes) {
            val dishWithOrderId = dish.copy(order_id = orderId)
            val result = orderDishService.addOrderDish(dishWithOrderId)
            if (result == null) {
                allAdded = false
                logger.error("Failed to add dish ${dish.dish_id} to order $orderId")
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
        return dishes.sumOf { it.price_at_order }
    }

    suspend fun updateOrderTotal(orderId: String): Boolean {
        val newTotal = calculateOrderTotal(orderId)
        val order = getOrderById(orderId) ?: return false
        val updatedOrder = order.copy(total = newTotal)
        return updateOrder(updatedOrder)
    }
}
