package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.StoreCheckoutRequest
import pos.ambrosia.models.StoreCheckoutResponse
import pos.ambrosia.models.StoreOrder
import pos.ambrosia.models.StoreOrderItem
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.Types
import java.util.UUID

private fun <T : Any> PreparedStatement.setNullable(
    index: Int,
    value: T?,
    sqlType: Int,
) {
    if (value != null) setObject(index, value, sqlType) else setNull(index, sqlType)
}

class CheckoutService(
    private val connection: Connection,
) {
    companion object {
        private const val STORE_GET_ORDER =
            "SELECT o.id, o.user_id, u.name as user_name, o.status, CAST(o.total AS INTEGER) as total, o.created_at FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ? AND o.is_deleted = 0 AND o.table_id IS NULL"
        private const val STORE_GET_ORDERS =
            "SELECT o.id, o.user_id, u.name as user_name, o.status, CAST(o.total AS INTEGER) as total, o.created_at FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.is_deleted = 0 AND o.table_id IS NULL ORDER BY o.created_at DESC"
        private const val STORE_GET_ORDERS_BY_STATUS =
            "SELECT o.id, o.user_id, u.name as user_name, o.status, CAST(o.total AS INTEGER) as total, o.created_at FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.is_deleted = 0 AND o.table_id IS NULL AND o.status = ? ORDER BY o.created_at DESC"
        private const val STORE_INSERT_CHECKOUT_ORDER =
            "INSERT INTO orders (id, user_id, table_id, status, total, created_at) VALUES (?, ?, NULL, 'paid', ?, datetime('now'))"
        private const val STORE_INSERT_ORDER_ITEM =
            "INSERT INTO order_products (order_id, product_id, quantity, price_at_order) VALUES (?, ?, ?, ?)"
        private const val STORE_DECREMENT_STOCK =
            "UPDATE products SET quantity = quantity - ? WHERE id = ? AND is_deleted = 0 AND quantity >= ?"
        private const val STORE_INSERT_TICKET =
            "INSERT INTO tickets (id, order_id, user_id, ticket_date, status, total_amount, notes) VALUES (?, ?, ?, datetime('now'), 1, ?, ?)"
        private const val STORE_INSERT_PAYMENT =
            "INSERT INTO payments (id, method_id, currency_id, transaction_id, amount, satoshi_amount, exchange_rate_at_payment, payment_hash, exchange_rate_currency, fiat_amount_at_payment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        private const val STORE_INSERT_TICKET_PAYMENT =
            "INSERT INTO ticket_payments (payment_id, ticket_id) VALUES (?, ?)"
        private const val STORE_GET_ITEMS =
            "SELECT product_id, quantity, price_at_order FROM order_products WHERE order_id = ?"
        private const val STORE_CANCEL_ORDER =
            "UPDATE orders SET status = 'closed' WHERE id = ? AND status = 'open' AND table_id IS NULL"
    }

    private fun mapStoreItems(orderId: String): List<StoreOrderItem> {
        val statement = connection.prepareStatement(STORE_GET_ITEMS)
        statement.setString(1, orderId)
        val resultSet = statement.executeQuery()
        val items = mutableListOf<StoreOrderItem>()
        while (resultSet.next()) {
            items.add(
                StoreOrderItem(
                    productId = resultSet.getString("product_id"),
                    quantity = resultSet.getInt("quantity"),
                    priceAtOrder = resultSet.getInt("price_at_order"),
                ),
            )
        }
        return items
    }

    private fun mapStoreOrder(resultSet: ResultSet): StoreOrder {
        val id = resultSet.getString("id")
        return StoreOrder(
            id = id,
            userId = resultSet.getString("user_id"),
            userName = resultSet.getString("user_name"),
            status = resultSet.getString("status"),
            total = resultSet.getInt("total"),
            createdAt = resultSet.getString("created_at").replace(" ", "T"),
            items = mapStoreItems(id),
        )
    }

    suspend fun getStoreOrders(status: String? = null): List<StoreOrder> {
        val sql = if (status != null) STORE_GET_ORDERS_BY_STATUS else STORE_GET_ORDERS
        val statement = connection.prepareStatement(sql)
        if (status != null) statement.setString(1, status)
        val resultSet = statement.executeQuery()
        val orders = mutableListOf<StoreOrder>()
        while (resultSet.next()) orders.add(mapStoreOrder(resultSet))
        return orders
    }

    suspend fun getStoreOrderById(id: String): StoreOrder? {
        val statement = connection.prepareStatement(STORE_GET_ORDER)
        statement.setString(1, id)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) mapStoreOrder(resultSet) else null
    }

    suspend fun cancelStoreOrder(id: String): Boolean {
        val statement = connection.prepareStatement(STORE_CANCEL_ORDER)
        statement.setString(1, id)
        val rows = statement.executeUpdate()
        if (rows > 0) logger.info("Store order cancelled: $id")
        return rows > 0
    }

    suspend fun findCheckoutByPaymentHash(paymentHash: String): Map<String, String>? {
        val sql =
            """
            SELECT p.id AS paymentId, t.id AS ticketId, o.id AS orderId
            FROM payments p
            JOIN ticket_payments tp ON tp.payment_id = p.id
            JOIN tickets t ON t.id = tp.ticket_id
            JOIN orders o ON o.id = t.order_id
            WHERE p.payment_hash = ?
            """.trimIndent()
        connection.prepareStatement(sql).use { statement ->
            statement.setString(1, paymentHash)
            val resultSet = statement.executeQuery()
            if (!resultSet.next()) return null
            return mapOf(
                "status" to "completed",
                "paymentId" to resultSet.getString("paymentId"),
                "ticketId" to resultSet.getString("ticketId"),
                "orderId" to resultSet.getString("orderId"),
            )
        }
    }

    suspend fun checkout(request: StoreCheckoutRequest): StoreCheckoutResponse? {
        if (request.items.isEmpty()) return null
        if (request.items.any { it.quantity <= 0 }) return null

        val prev = connection.autoCommit
        connection.autoCommit = false
        try {
            val orderId = UUID.randomUUID().toString()
            connection.prepareStatement(STORE_INSERT_CHECKOUT_ORDER).use { statement ->
                statement.setString(1, orderId)
                statement.setString(2, request.userId)
                statement.setDouble(3, request.amount)
                statement.executeUpdate()
            }

            for (item in request.items) {
                connection.prepareStatement(STORE_INSERT_ORDER_ITEM).use { statement ->
                    statement.setString(1, orderId)
                    statement.setString(2, item.productId)
                    statement.setInt(3, item.quantity)
                    statement.setInt(4, item.priceAtOrder)
                    statement.executeUpdate()
                }

                val rows =
                    connection.prepareStatement(STORE_DECREMENT_STOCK).use { statement ->
                        statement.setInt(1, item.quantity)
                        statement.setString(2, item.productId)
                        statement.setInt(3, item.quantity)
                        statement.executeUpdate()
                    }
                if (rows == 0) {
                    connection.rollback()
                    return null
                }
            }

            val ticketId = UUID.randomUUID().toString()
            connection.prepareStatement(STORE_INSERT_TICKET).use { statement ->
                statement.setString(1, ticketId)
                statement.setString(2, orderId)
                statement.setString(3, request.userId)
                statement.setDouble(4, request.amount)
                statement.setString(5, request.ticketNotes)
                statement.executeUpdate()
            }

            val paymentId = UUID.randomUUID().toString()
            connection.prepareStatement(STORE_INSERT_PAYMENT).use { statement ->
                statement.setString(1, paymentId)
                statement.setString(2, request.paymentMethodId)
                statement.setString(3, request.currencyId)
                statement.setString(4, request.transactionId ?: "")
                statement.setDouble(5, request.amount)
                statement.setNullable(6, request.satoshiAmount, Types.INTEGER)
                statement.setNullable(7, request.exchangeRateAtPayment, Types.REAL)
                statement.setNullable(8, request.paymentHash, Types.VARCHAR)
                statement.setNullable(9, request.exchangeRateCurrency, Types.VARCHAR)
                statement.setNullable(10, request.fiatAmountAtPayment, Types.REAL)
                statement.executeUpdate()
            }

            connection.prepareStatement(STORE_INSERT_TICKET_PAYMENT).use { statement ->
                statement.setString(1, paymentId)
                statement.setString(2, ticketId)
                statement.executeUpdate()
            }

            connection.commit()
            logger.info("Store checkout: order=$orderId ticket=$ticketId payment=$paymentId")
            return StoreCheckoutResponse(orderId, ticketId, paymentId)
        } catch (e: Exception) {
            connection.rollback()
            throw e
        } finally {
            connection.autoCommit = prev
        }
    }
}
