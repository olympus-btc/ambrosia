    package pos.ambrosia.api

    import io.ktor.http.HttpStatusCode
    import io.ktor.server.application.Application
    import io.ktor.server.response.respond
    import io.ktor.server.routing.Route
    import io.ktor.server.routing.get
    import io.ktor.server.routing.post
    import io.ktor.server.routing.route
    import io.ktor.server.routing.routing

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
