package pos.ambrosia.api

import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.http.*

fun Route.healthRoutes() {
  route("/health") {
    get {
      call.respond(
        HttpStatusCode.OK, mapOf(
          "status" to "healthy",
          "timestamp" to System.currentTimeMillis().toString()
        )
      )
    }
  }
}
