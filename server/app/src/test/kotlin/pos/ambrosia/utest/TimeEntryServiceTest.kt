package pos.ambrosia.utest

import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.db.tables.TaskEntity
import pos.ambrosia.db.tables.TasksTable
import pos.ambrosia.models.CreateTimeEntryRequest
import pos.ambrosia.models.UpdateTimeEntryRequest
import pos.ambrosia.services.TimeEntryService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.InvalidTimeEntryException
import pos.ambrosia.utils.PermissionDeniedException
import pos.ambrosia.utils.TimeEntryLockedException
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TimeEntryServiceTest {
    private lateinit var testDatabaseFile: File
    private val timeEntryService = TimeEntryService()

    @Before
    fun setUp() {
        testDatabaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(testDatabaseFile)
    }

    @Test
    fun `creates a time entry without user or price`() {
        val timeEntryFixture = createTimeEntryFixture()
        val createdTimeEntry = timeEntryService.createTimeEntry(createTimeEntryRequest(timeEntryFixture))

        assertEquals(timeEntryFixture.projectId, createdTimeEntry.projectId)
        assertEquals(timeEntryFixture.taskId, createdTimeEntry.taskId)
        assertEquals(60, createdTimeEntry.durationMinutes)
        assertNull(createdTimeEntry.invoiceId)
    }

    @Test
    fun `reuses an existing task when the task name matches ignoring case and spaces`() {
        val timeEntryFixture = createTimeEntryFixture()
        val createdTimeEntry =
            timeEntryService.createTimeEntry(createTimeEntryRequestByTaskName(timeEntryFixture, "  development "))

        assertEquals(timeEntryFixture.taskId, createdTimeEntry.taskId)
        assertEquals(1, countActiveTasks())
    }

    @Test
    fun `creates the task from the task name when it does not exist and creation is allowed`() {
        val timeEntryFixture = createTimeEntryFixture()
        val createdTimeEntry =
            timeEntryService.createTimeEntry(
                createTimeEntryRequestByTaskName(timeEntryFixture, "  Code review "),
                hasTasksCreatePermission = true,
            )

        assertEquals("Code review", createdTimeEntry.taskName)
        assertNotEquals(timeEntryFixture.taskId, createdTimeEntry.taskId)
        assertTrue(createdTimeEntry.isBillable)
        assertEquals(2, countActiveTasks())
    }

    @Test
    fun `does not reuse a deleted task with the same name`() {
        val timeEntryFixture = createTimeEntryFixture()
        val deletedTaskId = ExposedTestDb.seedTask("Code review", isDeleted = true)
        val createdTimeEntry =
            timeEntryService.createTimeEntry(
                createTimeEntryRequestByTaskName(timeEntryFixture, "Code review"),
                hasTasksCreatePermission = true,
            )

        assertNotEquals(deletedTaskId, createdTimeEntry.taskId)
    }

    @Test
    fun `rejects a new task name without permission to create tasks and creates nothing`() {
        val timeEntryFixture = createTimeEntryFixture()

        assertFailsWith<PermissionDeniedException> {
            timeEntryService.createTimeEntry(createTimeEntryRequestByTaskName(timeEntryFixture, "Code review"))
        }
        assertEquals(1, countActiveTasks())
    }

    @Test
    fun `rejects a request without task id or task name`() {
        val timeEntryFixture = createTimeEntryFixture()

        assertFailsWith<InvalidTimeEntryException> {
            timeEntryService.createTimeEntry(createTimeEntryRequestByTaskName(timeEntryFixture, "   "), hasTasksCreatePermission = true)
        }
    }

    @Test
    fun `updates an entry to a new task created from the task name`() {
        val timeEntryFixture = createTimeEntryFixture()
        val createdTimeEntry = timeEntryService.createTimeEntry(createTimeEntryRequest(timeEntryFixture))
        val updatedTimeEntry =
            timeEntryService.updateTimeEntry(
                createdTimeEntry.id,
                updateTimeEntryRequest(timeEntryFixture).copy(taskId = null, taskName = "Code review"),
                hasTasksCreatePermission = true,
            )

        assertEquals("Code review", updatedTimeEntry.taskName)
    }

    @Test
    fun `lists entries by date and project`() {
        val timeEntryFixture = createTimeEntryFixture()
        val inRangeTimeEntry = timeEntryService.createTimeEntry(createTimeEntryRequest(timeEntryFixture, "2026-08-19"))
        timeEntryService.createTimeEntry(createTimeEntryRequest(timeEntryFixture, "2026-08-25"))

        val retrievedTimeEntries = timeEntryService.getTimeEntries("2026-08-17", "2026-08-23", timeEntryFixture.projectId)

        assertEquals(listOf(inRangeTimeEntry.id), retrievedTimeEntries.map { timeEntry -> timeEntry.id })
    }

    @Test
    fun `lists entries by client`() {
        val timeEntryFixture = createTimeEntryFixture()
        val otherClientId = ExposedTestDb.seedClient("Other Client", timeEntryFixture.currencyId, 10_000)
        val otherClientProjectId = ExposedTestDb.seedProject(otherClientId)
        val clientTimeEntry = timeEntryService.createTimeEntry(createTimeEntryRequest(timeEntryFixture, "2026-08-19"))
        timeEntryService.createTimeEntry(
            createTimeEntryRequest(timeEntryFixture.copy(projectId = otherClientProjectId), "2026-08-19"),
        )

        val retrievedTimeEntries =
            timeEntryService.getTimeEntries(
                startDate = "2026-08-17",
                endDate = "2026-08-23",
                selectedClientId = timeEntryFixture.clientId,
            )

        assertEquals(listOf(clientTimeEntry.id), retrievedTimeEntries.map { timeEntry -> timeEntry.id })
    }

    @Test
    fun `lists no entries for a client without projects`() {
        val timeEntryFixture = createTimeEntryFixture()
        val clientWithoutProjectsId = ExposedTestDb.seedClient("Empty Client", timeEntryFixture.currencyId, 10_000)
        timeEntryService.createTimeEntry(createTimeEntryRequest(timeEntryFixture, "2026-08-19"))

        val retrievedTimeEntries =
            timeEntryService.getTimeEntries(
                startDate = "2026-08-17",
                endDate = "2026-08-23",
                selectedClientId = clientWithoutProjectsId,
            )

        assertEquals(emptyList(), retrievedTimeEntries)
    }

    @Test
    fun `rejects a malformed client id filter`() {
        assertFailsWith<InvalidTimeEntryException> {
            timeEntryService.getTimeEntries("2026-08-17", "2026-08-23", selectedClientId = "not-a-uuid")
        }
    }

    @Test
    fun `preserves whether an entry is billable`() {
        val timeEntryFixture = createTimeEntryFixture(isBillable = false)

        assertFalse(timeEntryService.createTimeEntry(createTimeEntryRequest(timeEntryFixture)).isBillable)
    }

    @Test
    fun `rejects durations that are not a multiple of fifteen minutes`() {
        val timeEntryFixture = createTimeEntryFixture()

        val invalidDurationException =
            assertFailsWith<InvalidTimeEntryException> {
                timeEntryService.createTimeEntry(createTimeEntryRequest(timeEntryFixture).copy(durationMinutes = 20))
            }
        assertEquals("durationMinutes must be a multiple of 15", invalidDurationException.message)
    }

    @Test
    fun `accepts durations that are a multiple of fifteen minutes`() {
        val timeEntryFixture = createTimeEntryFixture()

        val createdTimeEntry =
            timeEntryService.createTimeEntry(createTimeEntryRequest(timeEntryFixture).copy(durationMinutes = 105))

        assertEquals(105, createdTimeEntry.durationMinutes)
    }

    @Test
    fun `invoice linked entries cannot be changed or deleted`() {
        val timeEntryFixture = createTimeEntryFixture()
        val invoiceId = ExposedTestDb.seedInvoice(timeEntryFixture.clientId, timeEntryFixture.currencyId)
        val invoiceLinkedTimeEntryId =
            ExposedTestDb.seedTimeEntry(timeEntryFixture.projectId, timeEntryFixture.taskId, invoiceId = invoiceId)

        assertFailsWith<TimeEntryLockedException> {
            timeEntryService.updateTimeEntry(invoiceLinkedTimeEntryId, updateTimeEntryRequest(timeEntryFixture))
        }
        assertFailsWith<TimeEntryLockedException> { timeEntryService.deleteTimeEntry(invoiceLinkedTimeEntryId) }
    }

    private fun createTimeEntryFixture(isBillable: Boolean = true): TimeEntryFixture {
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val clientId = ExposedTestDb.seedClient("Client", currencyId, 10_000)
        val projectId = ExposedTestDb.seedProject(clientId, isBillable = isBillable)
        return TimeEntryFixture(currencyId, clientId, projectId, ExposedTestDb.seedTask("Development"))
    }

    private fun createTimeEntryRequest(
        timeEntryFixture: TimeEntryFixture,
        entryDate: String = "2026-08-19",
    ): CreateTimeEntryRequest =
        CreateTimeEntryRequest(
            projectId = timeEntryFixture.projectId,
            taskId = timeEntryFixture.taskId,
            entryDate = entryDate,
            durationMinutes = 60,
        )

    private fun createTimeEntryRequestByTaskName(
        timeEntryFixture: TimeEntryFixture,
        taskName: String,
    ): CreateTimeEntryRequest =
        CreateTimeEntryRequest(
            projectId = timeEntryFixture.projectId,
            taskName = taskName,
            entryDate = "2026-08-19",
            durationMinutes = 60,
        )

    private fun countActiveTasks(): Long = transaction { TaskEntity.find { TasksTable.isDeleted eq false }.count() }

    private fun updateTimeEntryRequest(timeEntryFixture: TimeEntryFixture): UpdateTimeEntryRequest =
        UpdateTimeEntryRequest(
            projectId = timeEntryFixture.projectId,
            taskId = timeEntryFixture.taskId,
            entryDate = "2026-08-20",
            durationMinutes = 60,
        )

    private data class TimeEntryFixture(
        val currencyId: String,
        val clientId: String,
        val projectId: String,
        val taskId: String,
    )
}
