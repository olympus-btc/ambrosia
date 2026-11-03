package pos.ambrosia.utest

import org.junit.After
import org.junit.Before
import pos.ambrosia.models.FreelanceTaskUpsert
import pos.ambrosia.services.TaskService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TaskServiceTest {
    private lateinit var databaseFile: File
    private val taskService = TaskService()

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    @Test
    fun `addTask returns id for valid request`() {
        val taskId = taskService.addTask(FreelanceTaskUpsert(name = "Development", isBillable = true))

        assertNotNull(taskId)
        val task = taskService.getTaskById(taskId)
        assertNotNull(task)
        assertEquals("Development", task.name)
        assertTrue(task.isBillable)
    }

    @Test
    fun `addTask rejects blank name`() {
        assertNull(taskService.addTask(FreelanceTaskUpsert(name = "   ")))
    }

    @Test
    fun `getTasks excludes deleted tasks`() {
        ExposedTestDb.seedTask(name = "Active")
        ExposedTestDb.seedTask(name = "Deleted", isDeleted = true)

        val tasks = taskService.getTasks()

        assertEquals(1, tasks.size)
        assertEquals("Active", tasks[0].name)
    }

    @Test
    fun `getTaskById returns null for invalid missing or deleted task`() {
        val deletedTaskId = ExposedTestDb.seedTask(isDeleted = true)

        assertNull(taskService.getTaskById("not-a-uuid"))
        assertNull(taskService.getTaskById(UUID.randomUUID().toString()))
        assertNull(taskService.getTaskById(deletedTaskId))
    }

    @Test
    fun `updateTask updates active task`() {
        val taskId = ExposedTestDb.seedTask()

        val taskWasUpdated = taskService.updateTask(taskId, FreelanceTaskUpsert(name = "Design", isBillable = false))

        assertTrue(taskWasUpdated)
        val task = taskService.getTaskById(taskId)
        assertNotNull(task)
        assertEquals("Design", task.name)
        assertFalse(task.isBillable)
    }

    @Test
    fun `updateTask returns false for invalid missing or deleted task`() {
        val deletedTaskId = ExposedTestDb.seedTask(isDeleted = true)
        val validRequest = FreelanceTaskUpsert(name = "Updated")

        assertFalse(taskService.updateTask("not-a-uuid", validRequest))
        assertFalse(taskService.updateTask(UUID.randomUUID().toString(), validRequest))
        assertFalse(taskService.updateTask(deletedTaskId, validRequest))
        assertFalse(taskService.updateTask(deletedTaskId, validRequest.copy(name = " ")))
    }

    @Test
    fun `deleteTask soft deletes task`() {
        val taskId = ExposedTestDb.seedTask()

        val taskWasDeleted = taskService.deleteTask(taskId)

        assertTrue(taskWasDeleted)
        assertNull(taskService.getTaskById(taskId))
    }

    @Test
    fun `deleteTask returns false for invalid missing or already deleted task`() {
        val deletedTaskId = ExposedTestDb.seedTask(isDeleted = true)

        assertFalse(taskService.deleteTask("not-a-uuid"))
        assertFalse(taskService.deleteTask(UUID.randomUUID().toString()))
        assertFalse(taskService.deleteTask(deletedTaskId))
    }
}
