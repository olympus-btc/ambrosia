package pos.ambrosia.utest

import io.ktor.client.request.get
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.handler
import pos.ambrosia.utils.AuthCookies
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.authenticateAdmin
import pos.ambrosia.utils.installAdminAuth
import pos.ambrosia.utils.installNonAdminAuth
import pos.ambrosia.utils.withAuthCookies
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class AdminAuthTestFixtureTest {
    private lateinit var databaseFile: File

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    private fun adminOnlyRouteStatus(
        attachCookies: Boolean = true,
        installAuth: ApplicationTestBuilder.() -> AuthCookies,
    ): HttpStatusCode {
        lateinit var capturedAdminOnlyRouteStatus: HttpStatusCode
        testApplication {
            val authCookies = installAuth()
            application {
                this@application.install(ContentNegotiation) { json() }
                handler()
                routing {
                    authenticateAdmin {
                        get("/admin-only") { call.respond(HttpStatusCode.OK) }
                    }
                }
            }

            val adminOnlyRouteResponse = client.get("/admin-only") { if (attachCookies) withAuthCookies(authCookies) }
            capturedAdminOnlyRouteStatus = adminOnlyRouteResponse.status
        }
        return capturedAdminOnlyRouteStatus
    }

    @Test
    fun `request without auth cookies is rejected as unauthorized`() {
        val actualStatus = adminOnlyRouteStatus(attachCookies = false) { installAdminAuth() }

        assertEquals(HttpStatusCode.Unauthorized, actualStatus)
    }

    @Test
    fun `request with real admin cookies reaches the protected route`() {
        val actualStatus = adminOnlyRouteStatus { installAdminAuth() }

        assertEquals(HttpStatusCode.OK, actualStatus)
    }

    @Test
    fun `request with real non-admin cookies is rejected as forbidden`() {
        val actualStatus = adminOnlyRouteStatus { installNonAdminAuth() }

        assertEquals(HttpStatusCode.Forbidden, actualStatus)
    }
}
