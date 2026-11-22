package pos.ambrosia.utest

import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.configureInitialSetup
import pos.ambrosia.api.handler
import pos.ambrosia.services.ConfigService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.testJwtConfig
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class InitialSetupBusinessTypeRouteTest {
    private lateinit var databaseFile: File

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    @Test
    fun `initial setup rejects an unknown business type`() =
        testApplication {
            ExposedTestDb.seedCurrency("USD")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureInitialSetup()
            }

            val initialSetupResponse =
                client.post("/initial-setup") {
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{
                            "businessType":"bakery",
                            "userName":"admin",
                            "userPassword":"Password123!",
                            "userPin":"123456",
                            "businessName":"Test Bakery",
                            "businessCurrency":"USD",
                            "timezone":"America/Mexico_City"
                        }""",
                    )
                }

            assertEquals(HttpStatusCode.BadRequest, initialSetupResponse.status)
        }

    @Test
    fun `initial setup accepts a freelance business type and persists the profession`() =
        testApplication {
            ExposedTestDb.seedCurrency("USD")
            environment { config = testJwtConfig() }
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureInitialSetup()
            }

            val initialSetupResponse =
                client.post("/initial-setup") {
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{
                            "businessType":"freelance",
                            "userName":"admin",
                            "userPassword":"Password123!",
                            "userPin":"123456",
                            "businessName":"Jane Doe",
                            "businessProfession":"Software Developer",
                            "businessCurrency":"USD",
                            "timezone":"America/Mexico_City"
                        }""",
                    )
                }

            assertEquals(HttpStatusCode.Created, initialSetupResponse.status)
            val userId =
                Json
                    .parseToJsonElement(initialSetupResponse.bodyAsText())
                    .jsonObject["userId"]!!
                    .jsonPrimitive.content
            assertNotNull(userId)

            val config = ConfigService().getConfig()
            assertNotNull(config)
            assertEquals("freelance", config.businessType)
            assertEquals("Software Developer", config.businessProfession)
        }
}
