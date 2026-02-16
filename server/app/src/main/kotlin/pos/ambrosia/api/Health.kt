package pos.ambrosia.api

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Application.configureHealth() {
    routing { route("/api") { healthRoutes() } }
}

fun Route.healthRoutes() {
    route("/health") {
        get {
            call.respond(
                HttpStatusCode.OK,
                mapOf(
                    "status" to "healthy",
                    "timestamp" to System.currentTimeMillis().toString(),
                ),
            )
        }
    }
}
