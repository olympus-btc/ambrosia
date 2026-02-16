package pos.ambrosia.utest

import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.config.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.testing.*
import pos.ambrosia.api.calculatePhoenixSignature
import pos.ambrosia.api.configurePhoenixWebhook
import kotlin.test.Test
import kotlin.test.assertEquals

class PhoenixWebhookRouteTest {
    @Test
    fun `rejects webhook without signature header`() =
        testApplication {
            environment {
                config = MapApplicationConfig("phoenix.webhook-secret" to "supersecret")
            }
            application {
                this@application.install(ContentNegotiation) { json() }
                configurePhoenixWebhook()
            }

            val response =
                client.post("/webhook/phoenixd") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"type":"payment_received"}""")
                }

            assertEquals(HttpStatusCode.Unauthorized, response.status)
        }

    @Test
    fun `accepts valid signed webhook`() =
        testApplication {
            val secret = "supersecret"
            val body =
                """
                {"type":"payment_received","amountSat":15,"paymentHash":"abc123"}
                """.trimIndent()

            environment {
                config = MapApplicationConfig("phoenix.webhook-secret" to secret)
            }
            application {
                this@application.install(ContentNegotiation) { json() }
                configurePhoenixWebhook()
            }

            val response =
                client.post("/webhook/phoenixd") {
                    header("X-Phoenix-Signature", calculatePhoenixSignature(body, secret))
                    contentType(ContentType.Application.Json)
                    setBody(body)
                }

            assertEquals(HttpStatusCode.Accepted, response.status)
            assertEquals("""{"status":"ok"}""", response.bodyAsText())
        }
}
