package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.CustomFunction
import org.jetbrains.exposed.v1.core.JoinType
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.VarCharColumnType
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.greaterEq
import org.jetbrains.exposed.v1.core.lessEq
import org.jetbrains.exposed.v1.core.like
import org.jetbrains.exposed.v1.jdbc.andWhere
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.statements.jdbc.JdbcConnectionImpl
import org.jetbrains.exposed.v1.jdbc.transactions.TransactionManager
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.OrderProductsTable
import pos.ambrosia.db.tables.OrdersTable
import pos.ambrosia.db.tables.PaymentMethodsTable
import pos.ambrosia.db.tables.PaymentsTable
import pos.ambrosia.db.tables.ProductsTable
import pos.ambrosia.db.tables.TicketPaymentsTable
import pos.ambrosia.db.tables.TicketsTable
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.logger
import pos.ambrosia.models.OrderItem
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
import java.util.UUID

class ReportService {
    companion object {
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
                   MAX(p.fiat_amount_at_payment) AS fiat_amount_at_payment,
                   MAX(p.payment_hash) AS payment_hash,
                   GROUP_CONCAT(pr.name || '|||' || op.quantity || '|||' || op.price_at_order, ';;;') AS items
            FROM orders o
            LEFT JOIN users u ON u.id = o.user_id
            LEFT JOIN tickets t ON t.order_id = o.id
            LEFT JOIN ticket_payments tp ON tp.ticket_id = t.id
            LEFT JOIN payments p ON p.id = tp.payment_id
            LEFT JOIN payment_methods pm ON pm.id = p.method_id
            LEFT JOIN order_products op ON op.order_id = o.id
            LEFT JOIN products pr ON pr.id = op.product_id
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

    private fun currentConnection(): Connection = (TransactionManager.current().connection as JdbcConnectionImpl).connection

    private fun dateFunc(column: org.jetbrains.exposed.v1.core.Expression<String>) =
        CustomFunction<String>("date", VarCharColumnType(), column)

    private fun lowerFunc(column: org.jetbrains.exposed.v1.core.Expression<String>) =
        CustomFunction<String>("lower", VarCharColumnType(), column)

    private fun isValidStatus(status: String): Boolean = validStatuses.contains(status)

    private fun parseOrderItems(rawItems: String?): List<OrderItem> =
        rawItems
            ?.split(";;;")
            ?.mapNotNull { entry ->
                val parts = entry.split("|||")
                if (parts.size == 3) {
                    OrderItem(
                        productName = parts[0],
                        quantity = parts[1].toIntOrNull() ?: 1,
                        priceAtOrder = parts[2].toIntOrNull() ?: 0,
                    )
                } else {
                    null
                }
            } ?: emptyList()

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
            paymentHash = resultSet.getString("payment_hash"),
            items = parseOrderItems(resultSet.getString("items")),
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
    ): ProductSalesReport =
        transaction {
            val dateRange = resolveDateRange(period, startDate, endDate)

            val join =
                OrderProductsTable
                    .join(OrdersTable, JoinType.INNER, OrderProductsTable.orderId, OrdersTable.id)
                    .join(ProductsTable, JoinType.INNER, OrderProductsTable.productId, ProductsTable.id)
                    .join(UsersTable, JoinType.INNER, OrdersTable.userId, UsersTable.id)
                    .join(TicketsTable, JoinType.INNER, TicketsTable.orderId, OrdersTable.id)
                    .join(TicketPaymentsTable, JoinType.INNER, TicketPaymentsTable.ticketId, TicketsTable.id)
                    .join(PaymentsTable, JoinType.INNER, PaymentsTable.id, TicketPaymentsTable.paymentId)
                    .join(PaymentMethodsTable, JoinType.INNER, PaymentMethodsTable.id, PaymentsTable.methodId)

            var query =
                join
                    .selectAll()
                    .where { (OrdersTable.status eq "paid") and (OrdersTable.isDeleted eq false) }

            dateRange?.let { (start, end) ->
                query = query.andWhere { dateFunc(OrdersTable.createdAt) greaterEq start }
                query = query.andWhere { dateFunc(OrdersTable.createdAt) lessEq end }
            }
            productName?.let { name ->
                query = query.andWhere { ProductsTable.name like "%$name%" }
            }
            userId?.let { uid ->
                query = query.andWhere { OrdersTable.userId eq EntityID(UUID.fromString(uid), UsersTable) }
            }
            paymentMethod?.let { method ->
                query = query.andWhere { lowerFunc(PaymentMethodsTable.name) eq method.lowercase() }
            }

            val sales =
                query
                    .orderBy(OrdersTable.createdAt, SortOrder.DESC)
                    .map { row: ResultRow ->
                        ProductSaleItem(
                            orderId = row[OrdersTable.id].value.toString(),
                            productName = row[ProductsTable.name],
                            variantId = row[OrderProductsTable.variantId]?.toString(),
                            quantity = row[OrderProductsTable.quantity],
                            priceAtOrder = row[OrderProductsTable.priceAtOrder],
                            userName = row[UsersTable.name],
                            paymentMethod = row[PaymentMethodsTable.name],
                            saleDate = row[OrdersTable.createdAt].replace(" ", "T"),
                            satoshiAmount = row[PaymentsTable.satoshiAmount],
                            exchangeRateAtPayment = row[PaymentsTable.exchangeRateAtPayment],
                            exchangeRateCurrency = row[PaymentsTable.exchangeRateCurrency],
                            fiatAmountAtPayment = row[PaymentsTable.fiatAmountAtPayment],
                            paymentId = row[PaymentsTable.id].value.toString(),
                        )
                    }

            logger.info("Product sales report: ${sales.size} line items")

            val totalBtcSatoshis =
                sales
                    .filter { it.satoshiAmount != null && it.paymentId != null }
                    .distinctBy { it.paymentId }
                    .sumOf { it.satoshiAmount!! }

            ProductSalesReport(
                totalRevenueCents = sales.sumOf { it.priceAtOrder.toLong() * it.quantity },
                totalItemsSold = sales.sumOf { it.quantity },
                sales = sales,
                totalBtcSatoshis = totalBtcSatoshis,
            )
        }

    fun getOrdersWithPaymentsFiltered(filters: OrderWithPaymentFilters = OrderWithPaymentFilters()): List<OrderWithPayment> =
        transaction {
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

            val orders = mutableListOf<OrderWithPayment>()
            currentConnection().prepareStatement(query).use { statement ->
                bindQueryParameters(statement, parameters)
                statement.executeQuery().use { resultSet ->
                    while (resultSet.next()) {
                        orders.add(mapResultSetToOrderWithPayment(resultSet))
                    }
                }
            }
            logger.info("Retrieved ${orders.size} orders with payments using filters: $filters")
            orders
        }

    fun getTotalSalesByDate(date: String): Double =
        transaction {
            val total =
                OrdersTable
                    .selectAll()
                    .where {
                        (dateFunc(OrdersTable.createdAt) eq date) and
                            (OrdersTable.status eq "paid") and
                            (OrdersTable.isDeleted eq false)
                    }.sumOf { it[OrdersTable.total] }
            logger.info("Total sales for $date: $total")
            total
        }
}
