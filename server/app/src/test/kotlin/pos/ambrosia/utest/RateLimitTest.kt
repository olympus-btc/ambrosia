package pos.ambrosia.utest

import io.ktor.client.request.get
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import pos.ambrosia.configureRateLimit
import kotlin.test.Test
import kotlin.test.assertEquals

class RateLimitTest {
    @Test
    fun `global rate limit allows 300 requests per minute and rejects the 301st`() =
        testApplication {
            environment {
                config = MapApplicationConfig("rate-limit.requestsPerMinute" to "300")
            }
            application {
                configureRateLimit()
                routing {
                    get("/rate-limit-probe") { call.respondText("ok") }
                }
            }

            repeat(300) { attemptIndex ->
                val allowedResponse = client.get("/rate-limit-probe")
                assertEquals(
                    HttpStatusCode.OK,
                    allowedResponse.status,
                    "Request ${attemptIndex + 1} of 300 should be allowed",
                )
            }

            val rejectedResponse = client.get("/rate-limit-probe")

            assertEquals(HttpStatusCode.TooManyRequests, rejectedResponse.status)
        }
}
