package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.services.PermissionsService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection

fun Application.configurePermissions() {
    val connection: Connection = DatabaseConnection.getConnection()
    val permissionsService = PermissionsService(environment, connection)
    routing {
        route("/permissions") {
            authorizePermission("permissions_read") {
                get("") {
                    val list = permissionsService.getAll()
                    if (list.isEmpty()) {
                        call.respond(HttpStatusCode.NoContent)
                    } else {
                        call.respond(HttpStatusCode.OK, list)
                    }
                }
            }
        }
    }
}
