package pos.ambrosia.utest

import io.ktor.server.application.ApplicationEnvironment
import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.models.Shift
import pos.ambrosia.services.ShiftService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ShiftServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    @Test
    fun `getShifts returns list of shifts when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("shift-1").thenReturn("shift-2") // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn("user-1").thenReturn("user-2") // Arrange
            whenever(mockResultSet.getString("shift_date")).thenReturn("date-1").thenReturn("date-2") // Arrange
            whenever(mockResultSet.getString("start_time")).thenReturn("7am").thenReturn("2pm") // Arrange
            whenever(mockResultSet.getString("end_time")).thenReturn("2pm").thenReturn("9pm") // Arrange
            whenever(mockResultSet.getString("notes")).thenReturn("note-1").thenReturn("note-2") // Arrange
            val service = ShiftService(mockConnection) // Arrange
            val result = service.getShifts() // Act
            assertEquals(2, result.size) // Assert
            assertEquals("shift-1", result[0].id) // Assert
        }
    }

    @Test
    fun `getShifts returns empty list when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = ShiftService(mockConnection) // Arrange
            val result = service.getShifts() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getShiftById returns shift when found`() {
        runBlocking {
            val expectedShift =
                Shift(id = "shift-1", user_id = "user-1", shift_date = "date-1", start_time = "7am", end_time = "2pm", notes = "note1")
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn(expectedShift.id) // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn(expectedShift.user_id) // Arrange
            whenever(mockResultSet.getString("shift_date")).thenReturn(expectedShift.shift_date) // Arrange
            whenever(mockResultSet.getString("start_time")).thenReturn(expectedShift.start_time) // Arrange
            whenever(mockResultSet.getString("end_time")).thenReturn(expectedShift.end_time) // Arrange
            whenever(mockResultSet.getString("notes")).thenReturn(expectedShift.notes) // Arrange
            val service = ShiftService(mockConnection) // Arrange
            val result = service.getShiftById("shift-1") // Act
            assertNotNull(result) // Assert
            assertEquals(expectedShift, result) // Assert
        }
    }

    @Test
    fun `getShiftById returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = ShiftService(mockConnection) // Arrange
            val result = service.getShiftById("not-found") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `deleteShift returns true on success`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = ShiftService(mockConnection) // Arrange
            val result = service.deleteShift("shift-1") // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `deleteShift returns false when shift not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = ShiftService(mockConnection) // Arrange
            val result = service.deleteShift("not-found-shift") // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `addShift returns null if user does not exist`() {
        runBlocking {
            val newShift =
                Shift(
                    id = null,
                    user_id = "non-existent-user",
                    shift_date = "date-1",
                    start_time = "7am",
                    end_time = "2pm",
                    notes = "note-1",
                ) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange: Simulate user not found
            val service = ShiftService(mockConnection) // Arrange
            val result = service.addShift(newShift) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(contains("INSERT INTO")) // Assert
        }
    }

    @Test
    fun `addShift returns new ID on success`() {
        runBlocking {
            val newShift =
                Shift(id = null, user_id = "user-1", shift_date = "date-1", start_time = "7am", end_time = "2pm", notes = "note-1")
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val addShiftStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT id FROM users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO shifts"))).thenReturn(addShiftStatement) // Arrange
            val userCheckResultSet: ResultSet = mock() // Arrange
            whenever(userCheckResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userCheckResultSet) // Arrange
            whenever(addShiftStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = ShiftService(mockConnection) // Arrange
            val result = service.addShift(newShift) // Act
            assertNotNull(result) // Assert
            assertTrue(result.isNotBlank()) // Assert
        }
    }

    @Test
    fun `addShift returns null when database insert fails`() {
        runBlocking {
            val newShift =
                Shift(id = null, user_id = "user-1", shift_date = "date-1", start_time = "7am", end_time = "2pm", notes = "note-1")
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val addShiftStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT id FROM users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO shifts"))).thenReturn(addShiftStatement) // Arrange
            val userCheckResultSet: ResultSet = mock() // Arrange
            whenever(userCheckResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userCheckResultSet) // Arrange
            whenever(addShiftStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = ShiftService(mockConnection) // Arrange
            val result = service.addShift(newShift) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `updateShift returns false if ID is null`() {
        runBlocking {
            val shiftWithNullId =
                Shift(id = null, user_id = "user-1", shift_date = "date-1", start_time = "7am", end_time = "2pm", notes = "note-1")
            val service = ShiftService(mockConnection) // Arrange
            val result = service.updateShift(shiftWithNullId) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `updateShift returns false if user does not exist`() {
        runBlocking {
            val shiftToUpdate =
                Shift(
                    id = "shift-1",
                    user_id = "non-existent-user",
                    shift_date = "date-1",
                    start_time = "7am",
                    end_time = "2pm",
                    notes = "note-1",
                ) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange: Simulate user not found
            val service = ShiftService(mockConnection) // Arrange
            val result = service.updateShift(shiftToUpdate) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateShift returns true on success`() {
        runBlocking {
            val shiftToUpdate =
                Shift(
                    id = "shift-1",
                    user_id = "user-1",
                    shift_date = "date-1",
                    start_time = "8am",
                    end_time = "3pm",
                    notes = "updated note",
                ) // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val updateShiftStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT id FROM users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE shifts"))).thenReturn(updateShiftStatement) // Arrange
            val userCheckResultSet: ResultSet = mock() // Arrange
            whenever(userCheckResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userCheckResultSet) // Arrange
            whenever(updateShiftStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = ShiftService(mockConnection) // Arrange
            val result = service.updateShift(shiftToUpdate) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `updateShift returns false when database update fails`() {
        runBlocking {
            val shiftToUpdate =
                Shift(
                    id = "shift-1",
                    user_id = "user-1",
                    shift_date = "date-1",
                    start_time = "8am",
                    end_time = "3pm",
                    notes = "updated note",
                ) // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val updateShiftStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT id FROM users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE shifts"))).thenReturn(updateShiftStatement) // Arrange
            val userCheckResultSet: ResultSet = mock() // Arrange
            whenever(userCheckResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userCheckResultSet) // Arrange
            whenever(updateShiftStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = ShiftService(mockConnection) // Arrange
            val result = service.updateShift(shiftToUpdate) // Act
            assertFalse(result) // Assert
        }
    }
}
