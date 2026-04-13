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

fun Application.configureReports() {
    val connection: Connection = DatabaseConnection.getConnection()
    val reportService = ReportService(connection)
    routing { route("/reports") { reports(reportService) } }
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
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.BadRequest, Message(e.message ?: "Invalid query parameters"))
                return@get
            }

            val report =
                try {
                    reportService.getProductSalesReport(
                        period = period,
                        startDate = startDate,
                        endDate = endDate,
                        productName = productName,
                        userId = userId,
                        paymentMethod = paymentMethod,
                    )
                } catch (e: IllegalArgumentException) {
                    call.respond(HttpStatusCode.BadRequest, Message(e.message ?: "Invalid query parameters"))
                    return@get
                }

            call.respond(HttpStatusCode.OK, report)
        }
    }
}
