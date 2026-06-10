package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.models.Message
import pos.ambrosia.models.OrderWithPaymentFilters
import pos.ambrosia.services.ReportService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection
import java.time.LocalDate

private fun parseDateQueryParam(
    value: String?,
    name: String,
): String? {
    if (value.isNullOrBlank()) return null
    return try {
        LocalDate.parse(value).toString()
    } catch (_: Exception) {
        throw IllegalArgumentException("Invalid $name: $value. Expected format YYYY-MM-DD")
    }
}

private fun parseDoubleQueryParam(
    value: String?,
    name: String,
): Double? {
    if (value.isNullOrBlank()) return null
    return value.toDoubleOrNull() ?: throw IllegalArgumentException("Invalid $name: $value")
}

fun Application.configureReports() {
    val connection: Connection = DatabaseConnection.getConnection()
    val reportService = ReportService(connection)
    routing {
        route("/reports") { reports(reportService) }
        route("/orders") { orderReports(reportService) }
    }
}

fun Route.reports(reportService: ReportService) {
    authorizePermission("reports_read") {
        get("") {
            val period = call.request.queryParameters["period"]?.takeIf { it.isNotBlank() }
            val productName = call.request.queryParameters["productName"]?.takeIf { it.isNotBlank() }
            val userId = call.request.queryParameters["userId"]?.takeIf { it.isNotBlank() }
            val paymentMethod = call.request.queryParameters["paymentMethod"]?.takeIf { it.isNotBlank() }

            val startDate: String?
            val endDate: String?
            try {
                startDate = parseDateQueryParam(call.request.queryParameters["startDate"], "startDate")
                endDate = parseDateQueryParam(call.request.queryParameters["endDate"], "endDate")
                if (startDate != null && endDate == null) {
                    throw IllegalArgumentException("endDate is required when startDate is provided")
                }
                if (endDate != null && startDate == null) {
                    throw IllegalArgumentException("startDate is required when endDate is provided")
                }
                if (startDate != null && endDate != null && startDate > endDate) {
                    throw IllegalArgumentException("startDate cannot be after endDate")
                }
            } catch (exception: IllegalArgumentException) {
                call.respond(HttpStatusCode.BadRequest, Message(exception.message ?: "Invalid query parameters"))
                return@get
            }

            val productSalesReport =
                try {
                    reportService.getProductSalesReport(
                        period = period,
                        startDate = startDate,
                        endDate = endDate,
                        productName = productName,
                        userId = userId,
                        paymentMethod = paymentMethod,
                    )
                } catch (exception: IllegalArgumentException) {
                    call.respond(HttpStatusCode.BadRequest, Message(exception.message ?: "Invalid query parameters"))
                    return@get
                }

            call.respond(HttpStatusCode.OK, productSalesReport)
        }
    }
}

fun Route.orderReports(reportService: ReportService) {
    authorizePermission("orders_read") {
        get("/with-payments") {
            val filters =
                try {
                    OrderWithPaymentFilters(
                        startDate = parseDateQueryParam(call.request.queryParameters["startDate"], "startDate"),
                        endDate = parseDateQueryParam(call.request.queryParameters["endDate"], "endDate"),
                        status = call.request.queryParameters["status"]?.takeIf { it.isNotBlank() },
                        userId = call.request.queryParameters["userId"]?.takeIf { it.isNotBlank() },
                        paymentMethod = call.request.queryParameters["paymentMethod"]?.takeIf { it.isNotBlank() },
                        minTotal = parseDoubleQueryParam(call.request.queryParameters["minTotal"], "minTotal"),
                        maxTotal = parseDoubleQueryParam(call.request.queryParameters["maxTotal"], "maxTotal"),
                        sortBy = call.request.queryParameters["sortBy"]?.takeIf { it.isNotBlank() },
                        sortOrder = call.request.queryParameters["sortOrder"]?.takeIf { it.isNotBlank() },
                    ).also {
                        if (it.startDate != null && it.endDate != null && it.startDate > it.endDate) {
                            throw IllegalArgumentException("startDate cannot be greater than endDate")
                        }
                    }
                } catch (error: IllegalArgumentException) {
                    call.respond(HttpStatusCode.BadRequest, Message(error.message ?: "Invalid query parameters"))
                    return@get
                }

            val orders =
                try {
                    reportService.getOrdersWithPaymentsFiltered(filters)
                } catch (error: IllegalArgumentException) {
                    call.respond(HttpStatusCode.BadRequest, Message(error.message ?: "Invalid query parameters"))
                    return@get
                }

            if (orders.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No orders found")
                return@get
            }
            call.respond(HttpStatusCode.OK, orders)
        }

        get("/total-sales/{date}") {
            val date = call.parameters["date"]
            if (date.isNullOrEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed date")
                return@get
            }

            val totalSales = reportService.getTotalSalesByDate(date)
            call.respond(HttpStatusCode.OK, mapOf("date" to date, "total_sales" to totalSales.toString()))
        }
    }
}
