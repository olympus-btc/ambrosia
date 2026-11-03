package pos.ambrosia.utest

import io.ktor.client.request.get
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.testApplication
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.configureShifts
import pos.ambrosia.api.handler
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.grantPermission
import pos.ambrosia.utils.installAdminAuth
import pos.ambrosia.utils.installNonAdminAuth
import pos.ambrosia.utils.withAuthCookies
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals

class ShiftsReportRouteTest {
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
    fun `admin with shifts_report_read permission can fetch the shifts report`() =
        testApplication {
            val adminAuthCookies = installAdminAuth()
            grantPermission("admin-test-role", "shifts_report_read")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureShifts()
            }

            val shiftsReportResponse =
                client.get("/shifts/report?period=month") { withAuthCookies(adminAuthCookies) }

            assertEquals(HttpStatusCode.OK, shiftsReportResponse.status)
        }

    @Test
    fun `admin without shifts_report_read permission is denied`() =
        testApplication {
            val adminAuthCookies = installAdminAuth()
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureShifts()
            }

            val shiftsReportResponse =
                client.get("/shifts/report?period=month") { withAuthCookies(adminAuthCookies) }

            assertEquals(HttpStatusCode.Forbidden, shiftsReportResponse.status)
        }

    @Test
    fun `non admin with shifts_report_read permission is still denied`() =
        testApplication {
            val nonAdminAuthCookies = installNonAdminAuth()
            grantPermission("non-admin-test-role", "shifts_report_read")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureShifts()
            }

            val shiftsReportResponse =
                client.get("/shifts/report?period=month") { withAuthCookies(nonAdminAuthCookies) }

            assertEquals(HttpStatusCode.Forbidden, shiftsReportResponse.status)
        }

    @Test
    fun `shifts report rejects an invalid period`() =
        testApplication {
            val adminAuthCookies = installAdminAuth()
            grantPermission("admin-test-role", "shifts_report_read")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureShifts()
            }

            val shiftsReportResponse =
                client.get("/shifts/report?period=decade") { withAuthCookies(adminAuthCookies) }

            assertEquals(HttpStatusCode.BadRequest, shiftsReportResponse.status)
        }

    @Test
    fun `shifts report requires either period or a full date range`() =
        testApplication {
            val adminAuthCookies = installAdminAuth()
            grantPermission("admin-test-role", "shifts_report_read")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureShifts()
            }

            val shiftsReportResponse = client.get("/shifts/report") { withAuthCookies(adminAuthCookies) }

            assertEquals(HttpStatusCode.BadRequest, shiftsReportResponse.status)
        }

    @Test
    fun `admin with shifts_report_read permission can fetch a shift breakdown`() =
        testApplication {
            val adminAuthCookies = installAdminAuth()
            grantPermission("admin-test-role", "shifts_report_read")
            val roleId = ExposedTestDb.seedRole("cashier", isAdmin = false)
            val userId = ExposedTestDb.seedUser("Alice", roleId)
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-10", endTime = "2pm")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureShifts()
            }

            val shiftBreakdownResponse =
                client.get("/shifts/$shiftId/breakdown") { withAuthCookies(adminAuthCookies) }

            assertEquals(HttpStatusCode.OK, shiftBreakdownResponse.status)
        }

    @Test
    fun `shift breakdown returns not found for an unknown shift`() =
        testApplication {
            val adminAuthCookies = installAdminAuth()
            grantPermission("admin-test-role", "shifts_report_read")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureShifts()
            }

            val shiftBreakdownResponse =
                client.get("/shifts/${UUID.randomUUID()}/breakdown") { withAuthCookies(adminAuthCookies) }

            assertEquals(HttpStatusCode.NotFound, shiftBreakdownResponse.status)
        }

    @Test
    fun `non admin with shifts_report_read permission is denied a shift breakdown`() =
        testApplication {
            val nonAdminAuthCookies = installNonAdminAuth()
            grantPermission("non-admin-test-role", "shifts_report_read")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureShifts()
            }

            val shiftBreakdownResponse =
                client.get("/shifts/${UUID.randomUUID()}/breakdown") { withAuthCookies(nonAdminAuthCookies) }

            assertEquals(HttpStatusCode.Forbidden, shiftBreakdownResponse.status)
        }
}
