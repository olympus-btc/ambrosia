package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.Config
import pos.ambrosia.services.ConfigService
import pos.ambrosia.utils.authorizePermission
import java.time.ZoneId

fun Application.configureConfig() {
    val configService = ConfigService()
    routing { route("/config") { config(configService) } }
}

fun Route.config(configService: ConfigService) {
    get("") {
        val config = configService.getConfig()
        if (config == null) {
            call.respond(HttpStatusCode.NotFound, "Config not found")
            return@get
        }
        call.respond(HttpStatusCode.OK, config)
    }
    authorizePermission("settings_update") {
        put("") {
            val config = call.receive<Config>()
            if (config.timezone !in ZoneId.getAvailableZoneIds()) {
                call.respond(HttpStatusCode.BadRequest, "Invalid timezone: ${config.timezone}")
                return@put
            }
            val isUpdated = configService.updateConfig(config)
            if (!isUpdated) {
                call.respond(HttpStatusCode.NotFound, "Failed to update config")
                return@put
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Config updated successfully"))
        }
    }
}
