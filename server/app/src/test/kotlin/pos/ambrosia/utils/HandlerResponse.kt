package pos.ambrosia.utils

import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import pos.ambrosia.api.handler

data class HandlerResponse(
    val status: HttpStatusCode,
    val body: String,
)

fun responseForThrowing(exception: Throwable): HandlerResponse {
    lateinit var capturedHandlerResponse: HandlerResponse
    testApplication {
        application {
            this@application.install(ContentNegotiation) { json() }
            handler()
            routing {
                get("/throws") { throw exception }
            }
        }
        val httpResponseFromThrowingRoute = client.get("/throws")
        capturedHandlerResponse =
            HandlerResponse(
                httpResponseFromThrowingRoute.status,
                httpResponseFromThrowingRoute.bodyAsText(),
            )
    }
    return capturedHandlerResponse
}
