package pos.ambrosia.utest

import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.Json
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.configureShifts
import pos.ambrosia.api.handler
import pos.ambrosia.models.PrintShiftReportRequest
import pos.ambrosia.utils.AuthCookies
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.grantPermission
import pos.ambrosia.utils.installAdminAuth
import pos.ambrosia.utils.shiftReportLabels
import pos.ambrosia.utils.withAuthCookies
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class ShiftReportPrintRouteTest {
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
    fun `printing the report of a missing shift responds not found`() =
        testApplication {
            val adminAuthCookies = configureShiftReportApplication()

            val printReportResponse =
                client.post("/shifts/00000000-0000-0000-0000-000000000000/print-report") {
                    withAuthCookies(adminAuthCookies)
                    contentType(ContentType.Application.Json)
                    setBody(printShiftReportRequestBody)
                }

            assertEquals(HttpStatusCode.NotFound, printReportResponse.status)
        }

    @Test
    fun `printing the report of an existing shift responds ok`() =
        testApplication {
            val adminAuthCookies = configureShiftReportApplication()
            val userId = ExposedTestDb.seedUser("alice", ExposedTestDb.seedRole("alice-role"))
            val shiftId = ExposedTestDb.seedShift(userId, endTime = "18:00:00")

            val printReportResponse =
                client.post("/shifts/$shiftId/print-report") {
                    withAuthCookies(adminAuthCookies)
                    contentType(ContentType.Application.Json)
                    setBody(printShiftReportRequestBody)
                }

            assertEquals(HttpStatusCode.OK, printReportResponse.status)
        }

    private fun ApplicationTestBuilder.configureShiftReportApplication(): AuthCookies {
        val adminAuthCookies = installAdminAuth()
        grantPermission("admin-test-role", "shifts_create")
        application {
            install(ContentNegotiation) { json() }
            handler()
            configureShifts()
        }
        return adminAuthCookies
    }

    private val printShiftReportRequestBody = Json.encodeToString(PrintShiftReportRequest(shiftReportLabels()))
}
