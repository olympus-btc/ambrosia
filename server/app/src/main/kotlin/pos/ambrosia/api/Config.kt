package pos.ambrosia.api

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.models.Config
import pos.ambrosia.services.ConfigService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection

fun Application.configureConfig() {
    val connection: Connection = DatabaseConnection.getConnection()
    val configService = ConfigService(connection)
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
            val isUpdated = configService.updateConfig(config)
            if (!isUpdated) {
                call.respond(HttpStatusCode.NotFound, "Failed to update config")
                return@put
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Config updated successfully"))
        }
    }
}
