package pos.ambrosia.utest

import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.Json
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.configureFreelanceReports
import pos.ambrosia.api.handler
import pos.ambrosia.models.FreelanceReportResponse
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.grantPermission
import pos.ambrosia.utils.installNonAdminAuth
import pos.ambrosia.utils.withAuthCookies
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class FreelanceReportsRouteTest {
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
    fun `route requires authentication and the matching permission`() =
        testApplication {
            val authWithoutPermission =
                installNonAdminAuth("freelance-reports-no-permission", "freelance-reports-no-permission-user")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureFreelanceReports()
            }

            assertEquals(
                HttpStatusCode.Unauthorized,
                client.get("/freelance/billing-reports?from=2026-08-17&to=2026-08-23").status,
            )
            assertEquals(
                HttpStatusCode.Forbidden,
                client
                    .get("/freelance/billing-reports?from=2026-08-17&to=2026-08-23") {
                        withAuthCookies(authWithoutPermission)
                    }.status,
            )
        }

    @Test
    fun `missing from or to returns bad request`() =
        testApplication {
            val authWithPermission = installNonAdminAuth("freelance-reports-invalid", "freelance-reports-invalid-user")
            grantPermission("freelance-reports-invalid", "freelance_reports_read")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureFreelanceReports()
            }

            assertEquals(
                HttpStatusCode.BadRequest,
                client.get("/freelance/billing-reports?from=2026-08-17") { withAuthCookies(authWithPermission) }.status,
            )
            assertEquals(
                HttpStatusCode.BadRequest,
                client
                    .get("/freelance/billing-reports?from=2026-08-24&to=2026-08-17") {
                        withAuthCookies(authWithPermission)
                    }.status,
            )
        }

    @Test
    fun `happy path returns the grouped report`() =
        testApplication {
            val authWithPermission = installNonAdminAuth("freelance-reports-read", "freelance-reports-read-user")
            grantPermission("freelance-reports-read", "freelance_reports_read")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val clientId = ExposedTestDb.seedClient("Client Alpha", currencyId, hourlyRateCents = 6_000)
            val projectId = ExposedTestDb.seedProject(clientId, name = "Project Alpha")
            val taskId = ExposedTestDb.seedTask("Development")
            ExposedTestDb.seedTimeEntry(projectId, taskId, entryDate = "2026-08-19", durationMinutes = 60)
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureFreelanceReports()
            }

            val billingReportResponse =
                client.get("/freelance/billing-reports?from=2026-08-17&to=2026-08-23&client_id=$clientId") {
                    withAuthCookies(authWithPermission)
                }

            assertEquals(HttpStatusCode.OK, billingReportResponse.status)
            val report = Json.decodeFromString<FreelanceReportResponse>(billingReportResponse.bodyAsText())
            val currencyGroup = report.currencies.single()
            assertEquals("USD", currencyGroup.currencyAcronym)
            val projectGroup = currencyGroup.projects.single()
            assertEquals("Project Alpha", projectGroup.projectName)
            assertEquals(6_000, projectGroup.amountCents)
        }
}
