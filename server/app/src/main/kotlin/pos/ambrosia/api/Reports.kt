package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.services.ReportService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection

fun Application.configureReports() {
    val connection: Connection = DatabaseConnection.getConnection()
    val reportService = ReportService(connection)
    routing { route("/reports") { reports(reportService) } }
}

fun Route.reports(reportService: ReportService) {
    authorizePermission("tickets_read") {
        get("") {
            val startDate = call.request.queryParameters["startDate"]
            val endDate = call.request.queryParameters["endDate"]

            if (startDate == null || endDate == null) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    mapOf("message" to "startDate and endDate are required"),
                )
                return@get
            }

            val report = reportService.getReport(startDate, endDate)
            call.respond(HttpStatusCode.OK, report)
        }
    }
}
