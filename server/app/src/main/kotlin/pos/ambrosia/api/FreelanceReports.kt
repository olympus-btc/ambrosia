package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.services.FreelanceReportService
import pos.ambrosia.utils.InvalidTimeEntryException
import pos.ambrosia.utils.authorizePermission

fun Application.configureFreelanceReports() {
    val freelanceReportService = FreelanceReportService()
    routing { route("/freelance/billing-reports") { freelanceBillingReports(freelanceReportService) } }
}

fun Route.freelanceBillingReports(freelanceReportService: FreelanceReportService) {
    authorizePermission("freelance_reports_read") {
        get("") {
            val startDate =
                call.request.queryParameters["from"]
                    ?: throw InvalidTimeEntryException("Both from and to dates are required")
            val endDate =
                call.request.queryParameters["to"]
                    ?: throw InvalidTimeEntryException("Both from and to dates are required")
            val requestedClientId = call.request.queryParameters["client_id"]

            call.respond(
                HttpStatusCode.OK,
                freelanceReportService.getBillingReport(
                    startDate = startDate,
                    endDate = endDate,
                    clientId = requestedClientId,
                ),
            )
        }
    }
}
