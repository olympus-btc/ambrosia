package pos.ambrosia.utest

import io.ktor.client.request.post
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.testApplication
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.configurePrinters
import pos.ambrosia.api.configureShifts
import pos.ambrosia.api.handler
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.grantPermission
import pos.ambrosia.utils.installAdminAuth
import pos.ambrosia.utils.withAuthCookies
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class CashDrawerRoutesTest {
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
    fun `opening the cash drawer manually requires the cash_drawer_open permission`() =
        testApplication {
            val adminAuthCookies = installAdminAuth()
            application {
                install(ContentNegotiation) { json() }
                handler()
                configurePrinters()
            }

            val openCashDrawerResponse = client.post("/printers/cash-drawer/open") { withAuthCookies(adminAuthCookies) }

            assertEquals(HttpStatusCode.Forbidden, openCashDrawerResponse.status)
        }

    @Test
    fun `opening the cash drawer manually fails when no printer has a cash drawer`() =
        testApplication {
            val adminAuthCookies = installAdminAuth()
            grantPermission("admin-test-role", "cash_drawer_open")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configurePrinters()
            }

            val openCashDrawerResponse = client.post("/printers/cash-drawer/open") { withAuthCookies(adminAuthCookies) }

            assertEquals(HttpStatusCode.ServiceUnavailable, openCashDrawerResponse.status)
        }

    @Test
    fun `opening the cash drawer for a shift close needs the open shift`() =
        testApplication {
            val adminAuthCookies = installAdminAuth()
            grantPermission("admin-test-role", "shifts_create")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureShifts()
            }

            val shiftCloseCashDrawerResponse =
                client.post("/shifts/00000000-0000-0000-0000-000000000000/cash-drawer") { withAuthCookies(adminAuthCookies) }

            assertEquals(HttpStatusCode.NotFound, shiftCloseCashDrawerResponse.status)
        }
}
