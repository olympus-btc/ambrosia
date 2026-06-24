package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.OrderWithPayment
import pos.ambrosia.models.OrderWithPaymentFilters
import pos.ambrosia.models.ProductSaleItem
import pos.ambrosia.models.ProductSalesReport
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneOffset

class ReportService(
    private val connection: Connection,
) {
    companion object {
        private const val GET_PRODUCT_SALES_BASE =
            """
            SELECT o.id AS order_id,
                   p.name AS product_name,
                   op.quantity,
                   op.price_at_order,
                   u.name AS user_name,
                   pm.name AS payment_method,
                   o.created_at AS sale_date,
                   pay.satoshi_amount,
                   pay.exchange_rate_at_payment,
                   pay.exchange_rate_currency,
                   pay.fiat_amount_at_payment,
                   pay.id AS payment_id
            FROM order_products op
            JOIN orders o           ON o.id  = op.order_id
            JOIN products p         ON p.id  = op.product_id
            JOIN users u            ON u.id  = o.user_id
            JOIN tickets t          ON t.order_id = o.id
            JOIN ticket_payments tp ON tp.ticket_id = t.id
            JOIN payments pay       ON pay.id = tp.payment_id
            JOIN payment_methods pm ON pm.id = pay.method_id
            WHERE o.status = 'paid'
              AND o.is_deleted = 0
            """

        private const val GET_ORDERS_WITH_PAYMENTS_BASE =
            """
            SELECT o.id,
                   o.user_id,
                   u.name AS user_name,
                   o.table_id,
                   o.status,
                   o.total,
                   o.created_at,
                   GROUP_CONCAT(DISTINCT pm.name) AS payment_method,
                   GROUP_CONCAT(DISTINCT p.id) AS payment_method_ids,
                   MAX(p.satoshi_amount) AS satoshi_amount,
                   MAX(p.exchange_rate_at_payment) AS exchange_rate_at_payment,
                   MAX(p.exchange_rate_currency) AS exchange_rate_currency,
                   MAX(p.fiat_amount_at_payment) AS fiat_amount_at_payment
            FROM orders o
            LEFT JOIN users u ON u.id = o.user_id
            LEFT JOIN tickets t ON t.order_id = o.id
            LEFT JOIN ticket_payments tp ON tp.ticket_id = t.id
            LEFT JOIN payments p ON p.id = tp.payment_id
            LEFT JOIN payment_methods pm ON pm.id = p.method_id
            WHERE o.is_deleted = 0
            """

        private const val GET_TOTAL_SALES_BY_DATE =
            "SELECT SUM(total) AS total_sales FROM orders WHERE DATE(created_at) = ? AND status = 'paid' AND is_deleted = 0"
    }

    private val validStatuses = setOf("open", "closed", "paid")
    private val validSortByColumns =
        mapOf(
            "date" to "datetime(o.created_at)",
            "total" to "o.total",
        )
    private val validSortOrders = setOf("asc", "desc")

    private fun isValidStatus(status: String): Boolean = validStatuses.contains(status)

    private fun mapRowToProductSaleItem(resultSet: ResultSet): ProductSaleItem =
        ProductSaleItem(
            orderId = resultSet.getString("order_id"),
            productName = resultSet.getString("product_name"),
            quantity = resultSet.getInt("quantity"),
            priceAtOrder = resultSet.getInt("price_at_order"),
            userName = resultSet.getString("user_name"),
            paymentMethod = resultSet.getString("payment_method"),
            saleDate = resultSet.getString("sale_date").replace(" ", "T"),
            satoshiAmount = (resultSet.getObject("satoshi_amount") as? Number)?.toLong(),
            exchangeRateAtPayment = (resultSet.getObject("exchange_rate_at_payment") as? Number)?.toDouble(),
            exchangeRateCurrency = resultSet.getString("exchange_rate_currency"),
            fiatAmountAtPayment = (resultSet.getObject("fiat_amount_at_payment") as? Number)?.toDouble(),
            paymentId = resultSet.getString("payment_id"),
        )

    private fun mapResultSetToOrderWithPayment(resultSet: ResultSet): OrderWithPayment {
        val paymentNames = resultSet.getString("payment_method") ?: ""
        val paymentIdsConcat = resultSet.getString("payment_method_ids") ?: ""
        val paymentIds =
            paymentIdsConcat.split(",").mapNotNull { it.takeIf { id -> id.isNotBlank() } }

        return OrderWithPayment(
            id = resultSet.getString("id"),
            userId = resultSet.getString("user_id"),
            userName = resultSet.getString("user_name"),
            tableId = resultSet.getString("table_id"),
            status = resultSet.getString("status"),
            total = resultSet.getDouble("total"),
            createdAt = resultSet.getString("created_at").replace(" ", "T"),
            paymentMethod = paymentNames,
            paymentMethodIds = paymentIds,
            satoshiAmount = (resultSet.getObject("satoshi_amount") as? Number)?.toLong(),
            exchangeRateAtPayment = (resultSet.getObject("exchange_rate_at_payment") as? Number)?.toDouble(),
            exchangeRateCurrency = resultSet.getString("exchange_rate_currency"),
            fiatAmountAtPayment = (resultSet.getObject("fiat_amount_at_payment") as? Number)?.toDouble(),
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

    private fun resolveDateRange(
        period: String?,
        startDate: String?,
        endDate: String?,
    ): Pair<String, String>? {
        if (period != null) {
            val today = LocalDate.now(ZoneOffset.UTC)
            val start =
                when (period) {
                    "week" -> today.with(DayOfWeek.MONDAY)

                    "month" -> today.withDayOfMonth(1)

                    "year" -> today.withDayOfYear(1)

                    else -> throw IllegalArgumentException(
                        "Invalid period: $period. Must be week, month, or year",
                    )
                }
            return Pair(start.toString(), today.toString())
        }
        if (startDate != null && endDate != null) return Pair(startDate, endDate)
        return null
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

    fun getProductSalesReport(
        period: String?,
        startDate: String?,
        endDate: String?,
        productName: String?,
        userId: String?,
        paymentMethod: String?,
    ): ProductSalesReport {
        val dateRange = resolveDateRange(period, startDate, endDate)

        val whereClauses = mutableListOf<String>()
        val parameters = mutableListOf<Any>()

        dateRange?.let { (start, end) ->
            whereClauses.add("date(o.created_at) >= date(?)")
            parameters.add(start)
            whereClauses.add("date(o.created_at) <= date(?)")
            parameters.add(end)
        }
        productName?.let {
            whereClauses.add("p.name LIKE ?")
            parameters.add("%$it%")
        }
        userId?.let {
            whereClauses.add("o.user_id = ?")
            parameters.add(it)
        }
        paymentMethod?.let {
            whereClauses.add("lower(pm.name) = lower(?)")
            parameters.add(it)
        }

        val query =
            buildString {
                append(GET_PRODUCT_SALES_BASE)
                if (whereClauses.isNotEmpty()) {
                    append("\n  AND ")
                    append(whereClauses.joinToString("\n  AND "))
                }
                append("\nORDER BY o.created_at DESC")
            }

        val sales = mutableListOf<ProductSaleItem>()
        connection.prepareStatement(query).use { statement ->
            bindQueryParameters(statement, parameters)
            statement.executeQuery().use { resultSet ->
                while (resultSet.next()) {
                    sales.add(mapRowToProductSaleItem(resultSet))
                }
            }
        }

        logger.info("Product sales report: ${sales.size} line items")

        val totalBtcSatoshis =
            sales
                .filter { it.satoshiAmount != null && it.paymentId != null }
                .distinctBy { it.paymentId }
                .sumOf { it.satoshiAmount!! }

        return ProductSalesReport(
            totalRevenueCents = sales.sumOf { it.priceAtOrder.toLong() * it.quantity },
            totalItemsSold = sales.sumOf { it.quantity },
            sales = sales,
            totalBtcSatoshis = totalBtcSatoshis,
        )
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
}
