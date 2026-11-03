package pos.ambrosia.utest

import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.testApplication
import kotlinx.io.files.Path
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.calculatePhoenixSignature
import pos.ambrosia.api.configurePhoenixWebhook
import pos.ambrosia.services.SecretsStore
import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals

class PhoenixWebhookRouteTest {
    private lateinit var configFile: File

    @Before
    fun setUp() {
        configFile = Files.createTempFile("phoenixWebhookRouteTestConfig", ".conf").toFile()
        SecretsStore.resetForTesting()
        SecretsStore.ambrosiaConfigFile = Path(configFile.absolutePath)
    }

    @After
    fun tearDown() {
        SecretsStore.resetForTesting()
        configFile.delete()
    }

    @Test
    fun `rejects webhook without signature header`() =
        testApplication {
            configFile.writeText("phoenixd-webhook-secret=supersecret\n")
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

            configFile.writeText("phoenixd-webhook-secret=$secret\n")
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

            assertEquals(HttpStatusCode.OK, response.status)
            assertEquals("Ok", response.bodyAsText())
        }
}
