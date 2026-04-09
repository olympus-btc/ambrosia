package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.DayReport
import pos.ambrosia.models.ReportResponse
import pos.ambrosia.models.ReportTicketItem
import java.sql.Connection
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class ReportService(
    private val connection: Connection,
) {
    companion object {
        private val DAY_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy")

        private const val GET_REPORT =
            """
            SELECT
                t.ticket_date,
                t.total_amount,
                o.waiter,
                pm.name AS payment_method_name
            FROM tickets t
            JOIN orders o           ON o.id  = t.order_id
            JOIN ticket_payments tp ON tp.ticket_id = t.id
            JOIN payments p         ON p.id  = tp.payment_id
            JOIN payment_methods pm ON pm.id = p.method_id
            WHERE CAST(t.ticket_date AS INTEGER) >= ?
              AND CAST(t.ticket_date AS INTEGER) <= ?
            ORDER BY CAST(t.ticket_date AS INTEGER) ASC
            """
    }

    fun getReport(
        startDate: String,
        endDate: String,
    ): ReportResponse {
        val zone = ZoneId.systemDefault()
        val startMs =
            LocalDate
                .parse(startDate)
                .atStartOfDay(zone)
                .toInstant()
                .toEpochMilli()
        val endMs =
            LocalDate
                .parse(endDate)
                .plusDays(1)
                .atStartOfDay(zone)
                .toInstant()
                .toEpochMilli() - 1

        val statement = connection.prepareStatement(GET_REPORT)
        statement.setLong(1, startMs)
        statement.setLong(2, endMs)

        val resultSet = statement.executeQuery()
        val reportsByDate = linkedMapOf<String, MutableList<ReportTicketItem>>()

        while (resultSet.next()) {
            val rawDate = resultSet.getString("ticket_date")
            val date =
                Instant
                    .ofEpochMilli(rawDate.toLong())
                    .atZone(zone)
                    .toLocalDate()
                    .format(DAY_FORMATTER)

            val item =
                ReportTicketItem(
                    amount = resultSet.getDouble("total_amount"),
                    paymentMethod = resultSet.getString("payment_method_name"),
                    userName = resultSet.getString("waiter") ?: "Desconocido",
                )
            reportsByDate.getOrPut(date) { mutableListOf() }.add(item)
        }

        val reports =
            reportsByDate.map { (date, tickets) ->
                DayReport(
                    date = date,
                    balance = tickets.sumOf { it.amount },
                    tickets = tickets,
                )
            }

        val totalBalance = reports.sumOf { it.balance }
        logger.info("Report generated: ${reports.size} days, totalBalance=$totalBalance")

        return ReportResponse(
            startDate = startDate,
            endDate = endDate,
            totalBalance = totalBalance,
            reports = reports,
        )
    }
}
