package pos.ambrosia.utest

import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.testApplication
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.configureConfig
import pos.ambrosia.api.configureInitialSetup
import pos.ambrosia.api.handler
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.grantPermission
import pos.ambrosia.utils.installNonAdminAuth
import pos.ambrosia.utils.withAuthCookies
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class TimezoneValidationRouteTest {
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
    fun `put config rejects an unrecognized IANA timezone id`() =
        testApplication {
            val auth = installNonAdminAuth()
            grantPermission("non-admin-test-role", "settings_update")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureConfig()
            }

            val updateConfigResponse =
                client.put("/config") {
                    withAuthCookies(auth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{
                            "businessType":"store",
                            "businessName":"Test Store",
                            "businessAddress":null,
                            "businessPhone":null,
                            "businessEmail":null,
                            "businessTaxId":null,
                            "businessLogoUrl":null,
                            "businessTypeConfirmed":true,
                            "timezone":"Not/A_Real_Zone"
                        }""",
                    )
                }

            assertEquals(HttpStatusCode.BadRequest, updateConfigResponse.status)
        }

    @Test
    fun `put config accepts a recognized IANA timezone id`() =
        testApplication {
            val auth = installNonAdminAuth()
            grantPermission("non-admin-test-role", "settings_update")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureConfig()
            }

            val updateConfigResponse =
                client.put("/config") {
                    withAuthCookies(auth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{
                            "businessType":"store",
                            "businessName":"Test Store",
                            "businessAddress":null,
                            "businessPhone":null,
                            "businessEmail":null,
                            "businessTaxId":null,
                            "businessLogoUrl":null,
                            "businessTypeConfirmed":true,
                            "timezone":"Europe/Madrid"
                        }""",
                    )
                }

            assertEquals(HttpStatusCode.OK, updateConfigResponse.status)
        }

    @Test
    fun `initial setup rejects an unrecognized IANA timezone id`() =
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
                            "businessType":"store",
                            "userName":"admin",
                            "userPassword":"Password123!",
                            "userPin":"1234",
                            "businessName":"Test Store",
                            "businessCurrency":"USD",
                            "timezone":"Not/A_Real_Zone"
                        }""",
                    )
                }

            assertEquals(HttpStatusCode.BadRequest, initialSetupResponse.status)
        }
}
