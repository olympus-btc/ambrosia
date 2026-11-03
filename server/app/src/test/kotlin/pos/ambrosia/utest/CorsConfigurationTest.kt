package pos.ambrosia.utest

import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.testApplication
import pos.ambrosia.api.configureHealth
import pos.ambrosia.configureCors
import kotlin.test.Test
import kotlin.test.assertEquals

class CorsConfigurationTest {
    @Test
    fun `same-origin request works normally without an Origin header`() =
        testApplication {
            application {
                install(ContentNegotiation) { json() }
                configureCors()
                configureHealth()
            }

            val healthCheckResponse = client.get("/api/health")

            assertEquals(HttpStatusCode.OK, healthCheckResponse.status)
        }

    @Test
    fun `cross-origin request is rejected since no host is allowlisted`() =
        testApplication {
            application {
                install(ContentNegotiation) { json() }
                configureCors()
                configureHealth()
            }

            val healthCheckResponse =
                client.get("/api/health") {
                    header(HttpHeaders.Origin, "https://evil.com")
                }

            assertEquals(HttpStatusCode.Forbidden, healthCheckResponse.status)
        }
}
