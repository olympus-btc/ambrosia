package pos.ambrosia.utest

import io.ktor.client.request.header
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
import pos.ambrosia.api.handler
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.grantPermission
import pos.ambrosia.utils.installNonAdminAuth
import pos.ambrosia.utils.withAuthCookies
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class PriceStepValidationRouteTest {
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
    fun `put config rejects a zero price step`() =
        testApplication {
            val authCookies = installNonAdminAuth()
            grantPermission("non-admin-test-role", "settings_update")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureConfig()
            }

            val updateConfigResponse =
                client.put("/config") {
                    withAuthCookies(authCookies)
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
                            "priceStep":0
                        }""",
                    )
                }

            assertEquals(HttpStatusCode.BadRequest, updateConfigResponse.status)
        }

    @Test
    fun `put config rejects a negative price step`() =
        testApplication {
            val authCookies = installNonAdminAuth()
            grantPermission("non-admin-test-role", "settings_update")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureConfig()
            }

            val updateConfigResponse =
                client.put("/config") {
                    withAuthCookies(authCookies)
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
                            "priceStep":-0.5
                        }""",
                    )
                }

            assertEquals(HttpStatusCode.BadRequest, updateConfigResponse.status)
        }

    @Test
    fun `put config accepts a non-default price step`() =
        testApplication {
            val authCookies = installNonAdminAuth()
            grantPermission("non-admin-test-role", "settings_update")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureConfig()
            }

            val updateConfigResponse =
                client.put("/config") {
                    withAuthCookies(authCookies)
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
                            "priceStep":0.5
                        }""",
                    )
                }

            assertEquals(HttpStatusCode.OK, updateConfigResponse.status)
        }

    @Test
    fun `put config accepts the default price step`() =
        testApplication {
            val authCookies = installNonAdminAuth()
            grantPermission("non-admin-test-role", "settings_update")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureConfig()
            }

            val updateConfigResponse =
                client.put("/config") {
                    withAuthCookies(authCookies)
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
                            "priceStep":0.01
                        }""",
                    )
                }

            assertEquals(HttpStatusCode.OK, updateConfigResponse.status)
        }
}
