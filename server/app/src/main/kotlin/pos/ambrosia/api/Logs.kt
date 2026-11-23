package pos.ambrosia.api

import io.ktor.http.ContentDisposition
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.auth.authenticate
import io.ktor.server.plugins.ratelimit.RateLimitName
import io.ktor.server.plugins.ratelimit.rateLimit
import io.ktor.server.request.receive
import io.ktor.server.response.header
import io.ktor.server.response.respond
import io.ktor.server.response.respondOutputStream
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.ClientLogReport
import pos.ambrosia.models.LogEntriesResponse
import pos.ambrosia.models.LogLevelSetting
import pos.ambrosia.models.LogSourcesResponse
import pos.ambrosia.services.ClientLogReportService
import pos.ambrosia.services.LogsDiagnostics
import pos.ambrosia.services.LogsService
import pos.ambrosia.services.ServerLogLevelService
import pos.ambrosia.utils.authenticateAdmin
import pos.ambrosia.utils.deploymentModeName
import pos.ambrosia.utils.getCurrentUser
import pos.ambrosia.utils.isLocalPhoenixdLogAvailable
import pos.ambrosia.utils.lightningBackendName

val CLIENT_LOG_REPORTS_RATE_LIMIT = RateLimitName("client-log-reports")
const val CLIENT_LOG_REPORTS_PER_MINUTE = 30
internal const val CLIENT_LOG_REPORT_MAX_REQUEST_BODY_BYTES = 16L * 1024

fun Application.configureLogs(
    logsService: LogsService = LogsService(),
    serverLogLevelService: ServerLogLevelService = ServerLogLevelService(),
) {
    routing { route("/logs") { logsRoutes(logsService, serverLogLevelService) } }
}

fun Route.logsRoutes(
    logsService: LogsService,
    serverLogLevelService: ServerLogLevelService,
) {
    authenticate("auth-jwt") {
        rateLimit(CLIENT_LOG_REPORTS_RATE_LIMIT) {
            post("/client") {
                ClientLogReportService.record(call.receive<ClientLogReport>(), call.getCurrentUser()?.userId)
                call.respond(HttpStatusCode.NoContent)
            }
        }
    }

    authenticateAdmin {
        get("") {
            val logHistoryQuery =
                logsService.parseLogHistoryQuery(
                    sourceParameter = call.request.queryParameters["source"],
                    levelParameter = call.request.queryParameters["level"],
                    linesParameter = call.request.queryParameters["lines"],
                    searchParameter = call.request.queryParameters["search"],
                )
            val logEntries = logsService.readEntries(logHistoryQuery, call.isLocalPhoenixdLogAvailable())
            call.respond(HttpStatusCode.OK, LogEntriesResponse(entries = logEntries))
        }

        get("/sources") {
            call.respond(HttpStatusCode.OK, LogSourcesResponse(logsService.sources(call.isLocalPhoenixdLogAvailable())))
        }

        get("/level") {
            call.respond(HttpStatusCode.OK, LogLevelSetting(serverLogLevelService.currentLevel()))
        }

        put("/level") {
            val requestedLogLevelSetting = call.receive<LogLevelSetting>()
            val appliedLogLevel = serverLogLevelService.changeLevel(requestedLogLevelSetting.level)
            call.respond(HttpStatusCode.OK, LogLevelSetting(appliedLogLevel))
        }

        get("/download") {
            val includePhoenixdLogs = logsService.phoenixdAvailability(call.isLocalPhoenixdLogAvailable()).available
            val diagnosticsSummary = LogsDiagnostics.buildSummary(call.deploymentModeName(), call.lightningBackendName())
            call.response.header(
                HttpHeaders.ContentDisposition,
                ContentDisposition.Attachment
                    .withParameter(ContentDisposition.Parameters.FileName, LogsDiagnostics.archiveFileName())
                    .toString(),
            )
            call.respondOutputStream(ContentType.Application.Zip, HttpStatusCode.OK) {
                logsService.writeLogsArchive(this, includePhoenixdLogs, diagnosticsSummary)
            }
        }
    }
}
