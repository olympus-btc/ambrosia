package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.StoreCheckoutRequest
import pos.ambrosia.models.StoreCheckoutResponse
import pos.ambrosia.models.StoreOrder
import pos.ambrosia.models.StoreOrderItem
import java.sql.Connection
import java.util.UUID

class StoreOrderService(
    private val connection: Connection,
) {
    companion object {
        private const val INSERT_CHECKOUT_ORDER =
            "INSERT INTO orders (id, user_id, table_id, waiter, status, total, created_at) VALUES (?, ?, NULL, ?, 'paid', ?, datetime('now'))"
        private const val INSERT_ORDER_ITEM =
            "INSERT INTO order_products (order_id, product_id, quantity, price_at_order) VALUES (?, ?, ?, ?)"
        private const val DECREMENT_STOCK =
            "UPDATE products SET quantity = quantity - ? WHERE id = ? AND is_deleted = 0 AND quantity >= ?"
        private const val INSERT_TICKET =
            "INSERT INTO tickets (id, order_id, user_id, ticket_date, status, total_amount, notes) VALUES (?, ?, ?, datetime('now'), 1, ?, ?)"
        private const val INSERT_PAYMENT =
            "INSERT INTO payments (id, method_id, currency_id, transaction_id, amount) VALUES (?, ?, ?, ?, ?)"
        private const val INSERT_TICKET_PAYMENT =
            "INSERT INTO ticket_payments (payment_id, ticket_id) VALUES (?, ?)"
        private const val GET_ORDER =
            "SELECT id, user_id, status, CAST(total AS INTEGER) as total, created_at FROM orders WHERE id = ? AND is_deleted = 0 AND table_id IS NULL AND waiter IS NULL"
        private const val GET_ITEMS =
            "SELECT product_id, quantity, price_at_order FROM order_products WHERE order_id = ?"
        private const val GET_ORDERS =
            "SELECT id, user_id, status, CAST(total AS INTEGER) as total, created_at FROM orders WHERE is_deleted = 0 AND table_id IS NULL AND waiter IS NULL ORDER BY created_at DESC"
        private const val GET_ORDERS_BY_STATUS =
            "SELECT id, user_id, status, CAST(total AS INTEGER) as total, created_at FROM orders WHERE is_deleted = 0 AND table_id IS NULL AND waiter IS NULL AND status = ? ORDER BY created_at DESC"
        private const val CANCEL_ORDER =
            "UPDATE orders SET status = 'closed' WHERE id = ? AND status = 'open' AND table_id IS NULL AND waiter IS NULL"
    }

    private fun mapItems(orderId: String): List<StoreOrderItem> {
        val st = connection.prepareStatement(GET_ITEMS)
        st.setString(1, orderId)
        val rs = st.executeQuery()
        val items = mutableListOf<StoreOrderItem>()
        while (rs.next()) {
            items.add(
                StoreOrderItem(
                    product_id = rs.getString("product_id"),
                    quantity = rs.getInt("quantity"),
                    price_at_order = rs.getInt("price_at_order"),
                ),
            )
        }
        return items
    }

    private fun mapOrder(rs: java.sql.ResultSet): StoreOrder {
        val id = rs.getString("id")
        return StoreOrder(
            id = id,
            user_id = rs.getString("user_id"),
            status = rs.getString("status"),
            total = rs.getInt("total"),
            created_at = rs.getString("created_at"),
            items = mapItems(id),
        )
    }

    suspend fun getOrders(status: String? = null): List<StoreOrder> {
        val sql = if (status != null) GET_ORDERS_BY_STATUS else GET_ORDERS
        val st = connection.prepareStatement(sql)
        if (status != null) st.setString(1, status)
        val rs = st.executeQuery()
        val orders = mutableListOf<StoreOrder>()
        while (rs.next()) orders.add(mapOrder(rs))
        return orders
    }

    suspend fun getOrderById(id: String): StoreOrder? {
        val st = connection.prepareStatement(GET_ORDER)
        st.setString(1, id)
        val rs = st.executeQuery()
        return if (rs.next()) mapOrder(rs) else null
    }

    suspend fun cancelOrder(id: String): Boolean {
        val st = connection.prepareStatement(CANCEL_ORDER)
        st.setString(1, id)
        val rows = st.executeUpdate()
        if (rows > 0) logger.info("Store order cancelled: $id")
        return rows > 0
    }

    suspend fun checkout(request: StoreCheckoutRequest): StoreCheckoutResponse? {
        if (request.items.isEmpty()) return null
        if (request.items.any { it.quantity <= 0 }) return null

        val prev = connection.autoCommit
        connection.autoCommit = false
        try {
            val orderId = UUID.randomUUID().toString()
            val orderSt = connection.prepareStatement(INSERT_CHECKOUT_ORDER)
            orderSt.setString(1, orderId)
            orderSt.setString(2, request.user_id)
            orderSt.setString(3, request.waiter)
            orderSt.setDouble(4, request.amount)
            orderSt.executeUpdate()

            val itemSt = connection.prepareStatement(INSERT_ORDER_ITEM)
            val stockSt = connection.prepareStatement(DECREMENT_STOCK)
            for (item in request.items) {
                itemSt.setString(1, orderId)
                itemSt.setString(2, item.product_id)
                itemSt.setInt(3, item.quantity)
                itemSt.setInt(4, item.price_at_order)
                itemSt.executeUpdate()

                stockSt.setInt(1, item.quantity)
                stockSt.setString(2, item.product_id)
                stockSt.setInt(3, item.quantity)
                val rows = stockSt.executeUpdate()
                if (rows == 0) {
                    connection.rollback()
                    return null
                }
            }

            val ticketId = UUID.randomUUID().toString()
            val ticketSt = connection.prepareStatement(INSERT_TICKET)
            ticketSt.setString(1, ticketId)
            ticketSt.setString(2, orderId)
            ticketSt.setString(3, request.user_id)
            ticketSt.setDouble(4, request.amount)
            ticketSt.setString(5, request.ticket_notes)
            ticketSt.executeUpdate()

            val paymentId = UUID.randomUUID().toString()
            val paymentSt = connection.prepareStatement(INSERT_PAYMENT)
            paymentSt.setString(1, paymentId)
            paymentSt.setString(2, request.payment_method_id)
            paymentSt.setString(3, request.currency_id)
            paymentSt.setString(4, request.transaction_id ?: "")
            paymentSt.setDouble(5, request.amount)
            paymentSt.executeUpdate()

            val tpSt = connection.prepareStatement(INSERT_TICKET_PAYMENT)
            tpSt.setString(1, paymentId)
            tpSt.setString(2, ticketId)
            tpSt.executeUpdate()

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
