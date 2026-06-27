package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.Shift
import pos.ambrosia.services.ShiftService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ShiftServiceTest {
    private lateinit var dbFile: File
    private val service = ShiftService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    private fun seedUser(): String {
        val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        return ExposedTestDb.seedUser("Alice", roleId)
    }

    @Test
    fun `getShifts returns list of shifts when found`() {
        runBlocking {
            val userId = seedUser()
            val shiftId1 = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-01", endTime = "2pm")
            val shiftId2 = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-02", endTime = "2pm")

            val result = service.getShifts()
            assertEquals(2, result.size)
            assertTrue(result.any { it.id == shiftId1 })
            assertTrue(result.any { it.id == shiftId2 })
        }
    }

    @Test
    fun `getShifts returns empty list when not found`() {
        runBlocking {
            val result = service.getShifts()
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getShiftById returns shift when found`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-01", endTime = "2pm", notes = "note1")

            val result = service.getShiftById(shiftId)
            assertNotNull(result)
            assertEquals(shiftId, result.id)
            assertEquals(userId, result.userId)
            assertEquals("note1", result.notes)
            assertNull(result.finalAmount)
            assertNull(result.difference)
        }
    }

    @Test
    fun `getShiftById returns null when not found`() {
        runBlocking {
            val result = service.getShiftById(UUID.randomUUID().toString())
            assertNull(result)
        }
    }

    @Test
    fun `getOpenShift returns null when no open shift`() {
        runBlocking {
            val userId = seedUser()
            ExposedTestDb.seedShift(userId, shiftDate = "2024-01-01", endTime = "2pm")

            val result = service.getOpenShift()
            assertNull(result)
        }
    }

    @Test
    fun `getOpenShift returns open shift with amounts when found`() {
        runBlocking {
            val userId = seedUser()
            val shiftId =
                ExposedTestDb.seedShift(
                    userId,
                    shiftDate = "2026-03-04",
                    startTime = "08:00:00",
                    endTime = null,
                    notes = "",
                    initialAmount = 100.0,
                )

            val result = service.getOpenShift()
            assertNotNull(result)
            assertEquals(shiftId, result.id)
            assertEquals(100.0, result.initialAmount)
            assertNull(result.endTime)
            assertNull(result.finalAmount)
            assertNull(result.difference)
        }
    }

    @Test
    fun `getShiftsByUser returns shifts when found`() {
        runBlocking {
            val userId = seedUser()
            val otherUserId = ExposedTestDb.seedUser("Bob", ExposedTestDb.seedRole("admin", isAdmin = true))
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-01", endTime = "2pm")
            ExposedTestDb.seedShift(otherUserId, shiftDate = "2024-01-01", endTime = "2pm")

            val result = service.getShiftsByUser(userId)
            assertEquals(1, result.size)
            assertEquals(shiftId, result[0].id)
        }
    }

    @Test
    fun `getShiftsByDate returns shifts when found`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-01", endTime = "2pm")
            ExposedTestDb.seedShift(userId, shiftDate = "2024-01-02", endTime = "2pm")

            val result = service.getShiftsByDate("2024-01-01")
            assertEquals(1, result.size)
            assertEquals(shiftId, result[0].id)
        }
    }

    @Test
    fun `deleteShift returns true on success`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-01", endTime = "2pm")

            val result = service.deleteShift(shiftId)
            assertTrue(result)
            assertNull(service.getShiftById(shiftId))
        }
    }

    @Test
    fun `deleteShift returns false when shift not found`() {
        runBlocking {
            val result = service.deleteShift(UUID.randomUUID().toString())
            assertFalse(result)
        }
    }

    @Test
    fun `addShift returns null if user does not exist`() {
        runBlocking {
            val newShift =
                Shift(
                    id = null,
                    userId = UUID.randomUUID().toString(),
                    shiftDate = "date-1",
                    startTime = "7am",
                    endTime = "2pm",
                    notes = "note-1",
                )
            val result = service.addShift(newShift)
            assertNull(result)
        }
    }

    @Test
    fun `addShift returns null if there is already an open shift`() {
        runBlocking {
            val userId = seedUser()
            ExposedTestDb.seedShift(userId, shiftDate = "date-0", startTime = "6am", endTime = null)

            val newShift =
                Shift(
                    id = null,
                    userId = userId,
                    shiftDate = "date-1",
                    startTime = "7am",
                    endTime = null,
                    notes = "note-1",
                )
            val result = service.addShift(newShift)
            assertNull(result)
        }
    }

    @Test
    fun `addShift returns new ID on success`() {
        runBlocking {
            val userId = seedUser()
            val newShift =
                Shift(
                    id = null,
                    userId = userId,
                    shiftDate = "date-1",
                    startTime = "7am",
                    endTime = "2pm",
                    notes = "note-1",
                )
            val result = service.addShift(newShift)
            assertNotNull(result)
            assertTrue(result.isNotBlank())
        }
    }

    @Test
    fun `closeShift returns true with finalAmount and difference`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "date-1", startTime = "7am", endTime = null)

            val result = service.closeShift(shiftId, finalAmount = 150.0, difference = 50.0)
            assertTrue(result)

            val updated = service.getShiftById(shiftId)
            assertEquals(150.0, updated?.finalAmount)
            assertEquals(50.0, updated?.difference)
            assertNotNull(updated?.endTime)
        }
    }

    @Test
    fun `closeShift returns true with null amounts`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "date-1", startTime = "7am", endTime = null)

            val result = service.closeShift(shiftId)
            assertTrue(result)
        }
    }

    @Test
    fun `closeShift returns false when shift not found or already closed`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "date-1", startTime = "7am", endTime = "2pm")

            val result = service.closeShift(shiftId, finalAmount = 100.0, difference = 0.0)
            assertFalse(result)
        }
    }

    @Test
    fun `updateShift returns false if ID is null`() {
        runBlocking {
            val userId = seedUser()
            val shiftWithNullId =
                Shift(
                    id = null,
                    userId = userId,
                    shiftDate = "date-1",
                    startTime = "7am",
                    endTime = "2pm",
                    notes = "note-1",
                )
            val result = service.updateShift(shiftWithNullId)
            assertFalse(result)
        }
    }

    @Test
    fun `updateShift returns false if user does not exist`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "date-1", endTime = "2pm")
            val shiftToUpdate =
                Shift(
                    id = shiftId,
                    userId = UUID.randomUUID().toString(),
                    shiftDate = "date-1",
                    startTime = "7am",
                    endTime = "2pm",
                    notes = "note-1",
                )
            val result = service.updateShift(shiftToUpdate)
            assertFalse(result)
        }
    }

    @Test
    fun `updateShift returns true on success`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "date-1", endTime = "2pm")
            val shiftToUpdate =
                Shift(
                    id = shiftId,
                    userId = userId,
                    shiftDate = "date-1",
                    startTime = "8am",
                    endTime = "3pm",
                    notes = "updated note",
                )
            val result = service.updateShift(shiftToUpdate)
            assertTrue(result)

            val updated = service.getShiftById(shiftId)
            assertEquals("8am", updated?.startTime)
            assertEquals("updated note", updated?.notes)
        }
    }

    @Test
    fun `updateShift returns false when not found`() {
        runBlocking {
            val userId = seedUser()
            val shiftToUpdate =
                Shift(
                    id = UUID.randomUUID().toString(),
                    userId = userId,
                    shiftDate = "date-1",
                    startTime = "8am",
                    endTime = "3pm",
                    notes = "updated note",
                )
            val result = service.updateShift(shiftToUpdate)
            assertFalse(result)
        }
    }
}
