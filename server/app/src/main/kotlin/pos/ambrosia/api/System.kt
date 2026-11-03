package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.Message
import pos.ambrosia.models.RestartCapabilitiesResponse
import pos.ambrosia.scheduleProcessRestart
import pos.ambrosia.services.PhoenixdProcessService
import pos.ambrosia.services.PhoenixdRestartResult
import pos.ambrosia.utils.authenticateAdmin
import pos.ambrosia.utils.canRestartSelf
import pos.ambrosia.utils.isLocalPhoenixd

fun Application.configureSystem() {
    val phoenixdProcessService = PhoenixdProcessService()
    routing { route("/system") { systemRoutes(phoenixdProcessService) } }
}

fun Route.systemRoutes(phoenixdProcessService: PhoenixdProcessService) {
    authenticateAdmin {
        get("/restart-capabilities") {
            val serverRestartSupported = call.canRestartSelf()
            val phoenixdRestartSupported =
                serverRestartSupported && call.isLocalPhoenixd() && phoenixdProcessService.isRunning()
            call.respond(
                HttpStatusCode.OK,
                RestartCapabilitiesResponse(serverRestartSupported, phoenixdRestartSupported),
            )
        }

        post("/restart-server") {
            if (!call.canRestartSelf()) {
                call.respond(HttpStatusCode.Conflict, Message("Restarting the server is not supported on this deployment"))
                return@post
            }
            scheduleProcessRestart()
            call.respond(HttpStatusCode.OK, Message("Server restarting"))
        }

        post("/restart-phoenixd") {
            if (!call.canRestartSelf() || !call.isLocalPhoenixd()) {
                call.respond(HttpStatusCode.Conflict, Message("Restarting phoenixd is not supported on this deployment"))
                return@post
            }
            when (phoenixdProcessService.requestRestart()) {
                PhoenixdRestartResult.Requested -> {
                    call.respond(HttpStatusCode.OK, Message("phoenixd restarting"))
                }

                PhoenixdRestartResult.NotRunning -> {
                    call.respond(HttpStatusCode.Conflict, Message("phoenixd is not running"))
                }

                PhoenixdRestartResult.NoPidFile -> {
                    call.respond(HttpStatusCode.Conflict, Message("phoenixd is not managed by the restart wrapper"))
                }
            }
        }
    }
}
