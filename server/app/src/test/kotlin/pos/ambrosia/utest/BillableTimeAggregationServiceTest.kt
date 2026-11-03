package pos.ambrosia.utest

import org.junit.After
import org.junit.Before
import pos.ambrosia.services.BillableTimeAggregationService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class BillableTimeAggregationServiceTest {
    private lateinit var testDatabaseFile: File
    private val billableTimeAggregationService = BillableTimeAggregationService()

    @Before
    fun setUp() {
        testDatabaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(testDatabaseFile)
    }

    @Test
    fun `resolves the project rate over the client rate when the project has its own rate`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientId = ExposedTestDb.seedClient("Client", currencyId, hourlyRateCents = 10_000)
        val projectId = ExposedTestDb.seedProject(clientId, hourlyRateCents = 15_000)
        val taskId = ExposedTestDb.seedTask("Development")
        ExposedTestDb.seedTimeEntry(projectId, taskId, entryDate = "2026-08-19", durationMinutes = 60)

        val billableTimeEntryLines =
            billableTimeAggregationService.getBillableTimeEntryLines("2026-08-17", "2026-08-23")

        assertEquals(15_000, billableTimeEntryLines.single().rateCents)
        assertEquals(15_000, billableTimeEntryLines.single().amountCents)
    }

    @Test
    fun `falls back to the client rate when the project has no rate of its own`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientId = ExposedTestDb.seedClient("Client", currencyId, hourlyRateCents = 10_000)
        val projectId = ExposedTestDb.seedProject(clientId, hourlyRateCents = null)
        val taskId = ExposedTestDb.seedTask("Development")
        ExposedTestDb.seedTimeEntry(projectId, taskId, entryDate = "2026-08-19", durationMinutes = 30)

        val billableTimeEntryLines =
            billableTimeAggregationService.getBillableTimeEntryLines("2026-08-17", "2026-08-23")

        assertEquals(10_000, billableTimeEntryLines.single().rateCents)
        assertEquals(5_000, billableTimeEntryLines.single().amountCents)
    }

    @Test
    fun `zeroes the rate and amount for non-billable entries but still reports the duration`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientId = ExposedTestDb.seedClient("Client", currencyId, hourlyRateCents = 10_000)
        val nonBillableProjectId = ExposedTestDb.seedProject(clientId, hourlyRateCents = 15_000, isBillable = false)
        val taskId = ExposedTestDb.seedTask("Development")
        ExposedTestDb.seedTimeEntry(nonBillableProjectId, taskId, entryDate = "2026-08-19", durationMinutes = 45)

        val billableTimeEntryLine =
            billableTimeAggregationService.getBillableTimeEntryLines("2026-08-17", "2026-08-23").single()

        assertFalse(billableTimeEntryLine.isBillable)
        assertEquals(0, billableTimeEntryLine.rateCents)
        assertEquals(0, billableTimeEntryLine.amountCents)
        assertEquals(45, billableTimeEntryLine.durationMinutes)
    }

    @Test
    fun `filters entries outside the requested date range`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientId = ExposedTestDb.seedClient("Client", currencyId, hourlyRateCents = 10_000)
        val projectId = ExposedTestDb.seedProject(clientId)
        val taskId = ExposedTestDb.seedTask("Development")
        val inRangeEntryId = ExposedTestDb.seedTimeEntry(projectId, taskId, entryDate = "2026-08-19")
        ExposedTestDb.seedTimeEntry(projectId, taskId, entryDate = "2026-09-01")

        val billableTimeEntryLines =
            billableTimeAggregationService.getBillableTimeEntryLines("2026-08-17", "2026-08-23")

        assertEquals(listOf(inRangeEntryId), billableTimeEntryLines.map { it.timeEntryId })
    }

    @Test
    fun `filters entries by client id across that client's projects`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val matchingClientId = ExposedTestDb.seedClient("Matching Client", currencyId)
        val matchingProjectId = ExposedTestDb.seedProject(matchingClientId)
        val otherClientId = ExposedTestDb.seedClient("Other Client", currencyId)
        val otherProjectId = ExposedTestDb.seedProject(otherClientId)
        val taskId = ExposedTestDb.seedTask("Development")
        val matchingEntryId = ExposedTestDb.seedTimeEntry(matchingProjectId, taskId, entryDate = "2026-08-19")
        ExposedTestDb.seedTimeEntry(otherProjectId, taskId, entryDate = "2026-08-19")

        val billableTimeEntryLines =
            billableTimeAggregationService.getBillableTimeEntryLines(
                "2026-08-17",
                "2026-08-23",
                clientId = matchingClientId,
            )

        assertEquals(listOf(matchingEntryId), billableTimeEntryLines.map { it.timeEntryId })
    }

    @Test
    fun `returns an empty list when the client filter has no matching projects`() {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientWithoutProjectsId = ExposedTestDb.seedClient("Idle Client", currencyId)

        val billableTimeEntryLines =
            billableTimeAggregationService.getBillableTimeEntryLines(
                "2026-08-17",
                "2026-08-23",
                clientId = clientWithoutProjectsId,
            )

        assertTrue(billableTimeEntryLines.isEmpty())
    }
}
