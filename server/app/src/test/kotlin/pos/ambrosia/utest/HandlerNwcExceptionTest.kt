package pos.ambrosia.utest

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
import pos.ambrosia.utils.NwcConnectionException
import pos.ambrosia.utils.NwcServiceException
import pos.ambrosia.utils.UnsupportedBackendOperationException
import kotlin.test.Test
import kotlin.test.assertEquals

private data class HandlerResponse(
    val status: HttpStatusCode,
    val body: String,
)

private fun responseForThrowing(exception: Throwable): HandlerResponse {
    lateinit var capturedResponse: HandlerResponse
    testApplication {
        application {
            this@application.install(ContentNegotiation) { json() }
            handler()
            routing {
                get("/throws") { throw exception }
            }
        }
        val response = client.get("/throws")
        capturedResponse = HandlerResponse(response.status, response.bodyAsText())
    }
    return capturedResponse
}

class HandlerNwcExceptionTest {
    @Test
    fun `maps NwcConnectionException to 503 without leaking the internal message`() {
        val response = responseForThrowing(NwcConnectionException("relay socket reset by peer"))

        assertEquals(HttpStatusCode.ServiceUnavailable, response.status)
        assertEquals(
            """{"message":"NWC wallet relay is unavailable","code":"nwc_connection_failed","source":"ambrosia"}""",
            response.body,
        )
    }

    @Test
    fun `maps NwcServiceException to 503 without leaking the internal message`() {
        val response = responseForThrowing(NwcServiceException("NWC get_balance failed: [500] internal error"))

        assertEquals(HttpStatusCode.ServiceUnavailable, response.status)
        assertEquals("""{"message":"NWC wallet service error"}""", response.body)
    }

    @Test
    fun `maps UnsupportedBackendOperationException to 501 with its own message`() {
        val response = responseForThrowing(UnsupportedBackendOperationException("Seed export is not available with NWC backend"))

        assertEquals(HttpStatusCode.NotImplemented, response.status)
        assertEquals(
            """{"message":"Seed export is not available with NWC backend","code":"unsupported_operation","source":"ambrosia"}""",
            response.body,
        )
    }
}
