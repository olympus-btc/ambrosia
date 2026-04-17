package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.ProductSaleItem
import pos.ambrosia.models.ProductSalesReport
import java.sql.Connection
import java.sql.PreparedStatement
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneOffset

class ReportService(
    private val connection: Connection,
) {
    companion object {
        private const val GET_PRODUCT_SALES_BASE =
            """
            SELECT p.name AS product_name,
                   op.quantity,
                   op.price_at_order,
                   u.name AS user_name,
                   pm.name AS payment_method,
                   o.created_at AS sale_date
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
              AND p.is_deleted = 0
            """
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

        val statement = connection.prepareStatement(query)
        bindQueryParameters(statement, parameters)
        val resultSet = statement.executeQuery()

        val sales = mutableListOf<ProductSaleItem>()
        while (resultSet.next()) {
            sales.add(
                ProductSaleItem(
                    productName = resultSet.getString("product_name"),
                    quantity = resultSet.getInt("quantity"),
                    priceAtOrder = resultSet.getInt("price_at_order"),
                    userName = resultSet.getString("user_name"),
                    paymentMethod = resultSet.getString("payment_method"),
                    saleDate = resultSet.getString("sale_date").replace(" ", "T"),
                ),
            )
        }

        logger.info("Product sales report: ${sales.size} line items")

        return ProductSalesReport(
            totalRevenueCents = sales.sumOf { it.priceAtOrder.toLong() * it.quantity },
            totalItemsSold = sales.sumOf { it.quantity },
            sales = sales,
        )
    }
}
