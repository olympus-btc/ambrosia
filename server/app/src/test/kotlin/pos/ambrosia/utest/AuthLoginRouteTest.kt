package pos.ambrosia.utest

import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.testApplication
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.configureAuth
import pos.ambrosia.api.handler
import pos.ambrosia.utils.ADMIN_AUTH_TEST_SECRET
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.grantPermission
import pos.ambrosia.utils.installAdminAuth
import pos.ambrosia.utils.testEnvironmentWithSecret
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class AuthLoginRouteTest {
    private lateinit var databaseFile: File
    private val testEnv = testEnvironmentWithSecret(ADMIN_AUTH_TEST_SECRET)

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    @Test
    fun `login accepts a legacy four digit pin`() =
        testApplication {
            installAdminAuth()
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            grantPermission("Cashier", "products_read")
            ExposedTestDb.seedUserWithPin("legacy-user", "1234", testEnv, roleId)
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureAuth()
            }

            val legacyPinLoginResponse =
                client.post("/auth/login") {
                    header(HttpHeaders.ContentType, "application/json")
                    setBody("""{"name":"legacy-user","pin":"1234"}""")
                }

            assertEquals(HttpStatusCode.OK, legacyPinLoginResponse.status)
        }

    @Test
    fun `login accepts a six digit pin`() =
        testApplication {
            installAdminAuth()
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            grantPermission("Cashier", "products_read")
            ExposedTestDb.seedUserWithPin("current-user", "123456", testEnv, roleId)
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureAuth()
            }

            val sixDigitPinLoginResponse =
                client.post("/auth/login") {
                    header(HttpHeaders.ContentType, "application/json")
                    setBody("""{"name":"current-user","pin":"123456"}""")
                }

            assertEquals(HttpStatusCode.OK, sixDigitPinLoginResponse.status)
        }
}
