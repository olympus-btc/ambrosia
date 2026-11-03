package pos.ambrosia.utest

import org.junit.After
import org.junit.Before
import pos.ambrosia.services.FreelanceReportService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FreelanceReportServiceTest {
    private lateinit var testDatabaseFile: File
    private val freelanceReportService = FreelanceReportService()

    @Before
    fun setUp() {
        testDatabaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(testDatabaseFile)
    }

    @Test
    fun `groups billable hours and amounts by project and task within a currency`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientId = ExposedTestDb.seedClient("Client", currencyId, hourlyRateCents = 6_000)
        val projectId = ExposedTestDb.seedProject(clientId, name = "Website Revamp")
        val developmentTaskId = ExposedTestDb.seedTask("Development")
        val designTaskId = ExposedTestDb.seedTask("Design")
        ExposedTestDb.seedTimeEntry(projectId, developmentTaskId, entryDate = "2026-08-19", durationMinutes = 60)
        ExposedTestDb.seedTimeEntry(projectId, developmentTaskId, entryDate = "2026-08-20", durationMinutes = 30)
        ExposedTestDb.seedTimeEntry(projectId, designTaskId, entryDate = "2026-08-21", durationMinutes = 60)

        val report = freelanceReportService.getBillingReport("2026-08-17", "2026-08-23")

        val currencyGroup = report.currencies.single()
        assertEquals("USD", currencyGroup.currencyAcronym)
        assertEquals(150, currencyGroup.totalDurationMinutes)
        assertEquals(15_000, currencyGroup.totalAmountCents)

        val projectGroup = currencyGroup.projects.single()
        assertEquals("Website Revamp", projectGroup.projectName)
        assertEquals(150, projectGroup.durationMinutes)
        assertEquals(15_000, projectGroup.amountCents)

        val developmentTaskGroup = projectGroup.tasks.first { it.taskName == "Development" }
        assertEquals(90, developmentTaskGroup.durationMinutes)
        assertEquals(9_000, developmentTaskGroup.amountCents)

        val designTaskGroup = projectGroup.tasks.first { it.taskName == "Design" }
        assertEquals(60, designTaskGroup.durationMinutes)
        assertEquals(6_000, designTaskGroup.amountCents)
    }

    @Test
    fun `keeps clients billed in different currencies in separate currency groups with no conversion`() {
        val usdCurrencyId = ExposedTestDb.seedCurrency("USD")
        val eurCurrencyId = ExposedTestDb.seedCurrency("EUR")
        val usdClientId = ExposedTestDb.seedClient("USD Client", usdCurrencyId, hourlyRateCents = 5_000)
        val eurClientId = ExposedTestDb.seedClient("EUR Client", eurCurrencyId, hourlyRateCents = 4_000)
        val usdProjectId = ExposedTestDb.seedProject(usdClientId, name = "USD Project")
        val eurProjectId = ExposedTestDb.seedProject(eurClientId, name = "EUR Project")
        val taskId = ExposedTestDb.seedTask("Development")
        ExposedTestDb.seedTimeEntry(usdProjectId, taskId, entryDate = "2026-08-19", durationMinutes = 60)
        ExposedTestDb.seedTimeEntry(eurProjectId, taskId, entryDate = "2026-08-19", durationMinutes = 60)

        val report = freelanceReportService.getBillingReport("2026-08-17", "2026-08-23")

        assertEquals(setOf("EUR", "USD"), report.currencies.map { it.currencyAcronym }.toSet())
        val usdGroup = report.currencies.first { it.currencyAcronym == "USD" }
        val eurGroup = report.currencies.first { it.currencyAcronym == "EUR" }
        assertEquals(5_000, usdGroup.totalAmountCents)
        assertEquals(4_000, eurGroup.totalAmountCents)
    }

    @Test
    fun `includes non-billable time entries in the totals with a zero amount`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientId = ExposedTestDb.seedClient("Client", currencyId, hourlyRateCents = 6_000)
        val nonBillableProjectId = ExposedTestDb.seedProject(clientId, isBillable = false)
        val taskId = ExposedTestDb.seedTask("Development")
        ExposedTestDb.seedTimeEntry(nonBillableProjectId, taskId, entryDate = "2026-08-19", durationMinutes = 60)

        val report = freelanceReportService.getBillingReport("2026-08-17", "2026-08-23")

        val currencyGroup = report.currencies.single()
        assertEquals(60, currencyGroup.totalDurationMinutes)
        assertEquals(0, currencyGroup.totalAmountCents)
    }

    @Test
    fun `returns no currency groups for a range with no time entries`() {
        val report = freelanceReportService.getBillingReport("2026-08-17", "2026-08-23")

        assertTrue(report.currencies.isEmpty())
    }
}
