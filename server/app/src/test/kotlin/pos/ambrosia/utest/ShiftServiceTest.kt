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
                Shift(
                    id = "shift-1",
                    user_id = "user-1",
                    shift_date = "date-1",
                    start_time = "7am",
                    end_time = "2pm",
                    notes = "note1",
                    initial_amount = 0.0,
                    final_amount = null,
                    difference = null,
                ) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn(expectedShift.id) // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn(expectedShift.user_id) // Arrange
            whenever(mockResultSet.getString("shift_date")).thenReturn(expectedShift.shift_date) // Arrange
            whenever(mockResultSet.getString("start_time")).thenReturn(expectedShift.start_time) // Arrange
            whenever(mockResultSet.getString("end_time")).thenReturn(expectedShift.end_time) // Arrange
            whenever(mockResultSet.getString("notes")).thenReturn(expectedShift.notes) // Arrange
            whenever(mockResultSet.getDouble("initial_amount")).thenReturn(0.0) // Arrange
            whenever(mockResultSet.getDouble("final_amount")).thenReturn(0.0) // Arrange
            whenever(mockResultSet.getDouble("difference")).thenReturn(0.0) // Arrange
            whenever(mockResultSet.wasNull()).thenReturn(true).thenReturn(true) // Arrange: final_amount=null, difference=null
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
    fun `getOpenShift returns null when no open shift`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = ShiftService(mockConnection) // Arrange
            val result = service.getOpenShift() // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `getOpenShift returns open shift with amounts when found`() {
        runBlocking {
            val expectedShift =
                Shift(
                    id = "shift-1",
                    user_id = "user-1",
                    shift_date = "2026-03-04",
                    start_time = "08:00:00",
                    end_time = null,
                    notes = "",
                    initial_amount = 100.0,
                    final_amount = null,
                    difference = null,
                ) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn(expectedShift.id) // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn(expectedShift.user_id) // Arrange
            whenever(mockResultSet.getString("shift_date")).thenReturn(expectedShift.shift_date) // Arrange
            whenever(mockResultSet.getString("start_time")).thenReturn(expectedShift.start_time) // Arrange
            whenever(mockResultSet.getString("end_time")).thenReturn(null) // Arrange
            whenever(mockResultSet.getString("notes")).thenReturn(expectedShift.notes) // Arrange
            whenever(mockResultSet.getDouble("initial_amount")).thenReturn(100.0) // Arrange
            whenever(mockResultSet.getDouble("final_amount")).thenReturn(0.0) // Arrange
            whenever(mockResultSet.getDouble("difference")).thenReturn(0.0) // Arrange
            whenever(mockResultSet.wasNull()).thenReturn(true).thenReturn(true) // Arrange: final_amount=null, difference=null
            val service = ShiftService(mockConnection) // Arrange
            val result = service.getOpenShift() // Act
            assertNotNull(result) // Assert
            assertEquals(expectedShift, result) // Assert
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
            whenever(mockResultSet.next()).thenReturn(false) // Arrange: no open shift, then user not found
            val service = ShiftService(mockConnection) // Arrange
            val result = service.addShift(newShift) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(contains("INSERT INTO")) // Assert
        }
    }

    @Test
    fun `addShift returns null if there is already an open shift`() {
        runBlocking {
            val newShift =
                Shift(
                    id = null,
                    user_id = "user-1",
                    shift_date = "date-1",
                    start_time = "7am",
                    end_time = null,
                    notes = "note-1",
                ) // Arrange
            val openShiftStatement: PreparedStatement = mock() // Arrange
            val openShiftResultSet: ResultSet = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("end_time IS NULL"))).thenReturn(openShiftStatement) // Arrange
            whenever(openShiftStatement.executeQuery()).thenReturn(openShiftResultSet) // Arrange
            whenever(openShiftResultSet.next()).thenReturn(true) // Arrange: open shift exists
            whenever(openShiftResultSet.getString("id")).thenReturn("existing-shift") // Arrange
            whenever(openShiftResultSet.getString("user_id")).thenReturn("user-0") // Arrange
            whenever(openShiftResultSet.getString("shift_date")).thenReturn("date-0") // Arrange
            whenever(openShiftResultSet.getString("start_time")).thenReturn("6am") // Arrange
            whenever(openShiftResultSet.getString("end_time")).thenReturn(null) // Arrange
            whenever(openShiftResultSet.getString("notes")).thenReturn("") // Arrange
            whenever(openShiftResultSet.getDouble("initial_amount")).thenReturn(0.0) // Arrange
            whenever(openShiftResultSet.getDouble("final_amount")).thenReturn(0.0) // Arrange
            whenever(openShiftResultSet.getDouble("difference")).thenReturn(0.0) // Arrange
            whenever(openShiftResultSet.wasNull()).thenReturn(true).thenReturn(true) // Arrange
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
                Shift(
                    id = null,
                    user_id = "user-1",
                    shift_date = "date-1",
                    start_time = "7am",
                    end_time = "2pm",
                    notes = "note-1",
                ) // Arrange
            val openShiftStatement: PreparedStatement = mock() // Arrange
            val openShiftResultSet: ResultSet = mock() // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val addShiftStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("end_time IS NULL"))).thenReturn(openShiftStatement) // Arrange
            whenever(openShiftStatement.executeQuery()).thenReturn(openShiftResultSet) // Arrange
            whenever(openShiftResultSet.next()).thenReturn(false) // Arrange: no open shift
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
                Shift(
                    id = null,
                    user_id = "user-1",
                    shift_date = "date-1",
                    start_time = "7am",
                    end_time = "2pm",
                    notes = "note-1",
                ) // Arrange
            val openShiftStatement: PreparedStatement = mock() // Arrange
            val openShiftResultSet: ResultSet = mock() // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val addShiftStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("end_time IS NULL"))).thenReturn(openShiftStatement) // Arrange
            whenever(openShiftStatement.executeQuery()).thenReturn(openShiftResultSet) // Arrange
            whenever(openShiftResultSet.next()).thenReturn(false) // Arrange: no open shift
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
    fun `closeShift returns true with finalAmount and difference`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = ShiftService(mockConnection) // Arrange
            val result = service.closeShift("shift-1", finalAmount = 150.0, difference = 50.0) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `closeShift returns true with null amounts`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = ShiftService(mockConnection) // Arrange
            val result = service.closeShift("shift-1") // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `closeShift returns false when shift not found or already closed`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = ShiftService(mockConnection) // Arrange
            val result = service.closeShift("not-found-shift", finalAmount = 100.0, difference = 0.0) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateShift returns false if ID is null`() {
        runBlocking {
            val shiftWithNullId =
                Shift(
                    id = null,
                    user_id = "user-1",
                    shift_date = "date-1",
                    start_time = "7am",
                    end_time = "2pm",
                    notes = "note-1",
                ) // Arrange
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
