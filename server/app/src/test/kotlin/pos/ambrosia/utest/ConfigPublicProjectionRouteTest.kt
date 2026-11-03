package pos.ambrosia.utest

import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
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
import pos.ambrosia.api.configureConfig
import pos.ambrosia.api.handler
import pos.ambrosia.models.Config
import pos.ambrosia.services.ConfigService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.installNonAdminAuth
import pos.ambrosia.utils.withAuthCookies
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class ConfigPublicProjectionRouteTest {
    private lateinit var databaseFile: File

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
        ConfigService().updateConfig(
            Config(
                businessType = "store",
                businessName = "Test Store",
                businessAddress = "123 Main St",
                businessPhone = "555-0100",
                businessEmail = "store@example.com",
                businessTaxId = "TAX-123",
                businessLogoUrl = "https://example.com/logo.png",
                businessTypeConfirmed = true,
            ),
        )
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    @Test
    fun `get config without a session returns only the public fields`() =
        testApplication {
            installNonAdminAuth()
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureConfig()
            }

            val configResponse = client.get("/config")

            assertEquals(HttpStatusCode.OK, configResponse.status)
            val responseBody = Json.parseToJsonElement(configResponse.bodyAsText()).jsonObject
            assertEquals("store", responseBody["businessType"]?.jsonPrimitive?.content)
            assertEquals("Test Store", responseBody["businessName"]?.jsonPrimitive?.content)
            assertEquals("https://example.com/logo.png", responseBody["businessLogoUrl"]?.jsonPrimitive?.content)
            assertNull(responseBody["businessAddress"])
            assertNull(responseBody["businessPhone"])
            assertNull(responseBody["businessEmail"])
            assertNull(responseBody["businessTaxId"])
        }

    @Test
    fun `get config with a valid session returns the full config`() =
        testApplication {
            val authCookies = installNonAdminAuth()
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureConfig()
            }

            val configResponse = client.get("/config") { withAuthCookies(authCookies) }

            assertEquals(HttpStatusCode.OK, configResponse.status)
            val responseBody = Json.parseToJsonElement(configResponse.bodyAsText()).jsonObject
            assertEquals("store", responseBody["businessType"]?.jsonPrimitive?.content)
            assertEquals("Test Store", responseBody["businessName"]?.jsonPrimitive?.content)
            assertEquals("123 Main St", responseBody["businessAddress"]?.jsonPrimitive?.content)
            assertEquals("555-0100", responseBody["businessPhone"]?.jsonPrimitive?.content)
            assertEquals("store@example.com", responseBody["businessEmail"]?.jsonPrimitive?.content)
            assertEquals("TAX-123", responseBody["businessTaxId"]?.jsonPrimitive?.content)
        }
}
