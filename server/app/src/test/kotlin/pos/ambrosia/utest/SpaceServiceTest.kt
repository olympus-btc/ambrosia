package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.*
import pos.ambrosia.models.Space
import pos.ambrosia.services.SpaceService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.*

class SpaceServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    @Test
    fun `getSpaces returns list of spaces when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("space-1").thenReturn("space-2") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("Patio").thenReturn("Main Hall") // Arrange
            val service = SpaceService(mockConnection) // Arrange
            val result = service.getSpaces() // Act
            assertEquals(2, result.size) // Assert
            assertEquals("Patio", result[0].name) // Assert
        }
    }

    @Test
    fun `getSpaces returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = SpaceService(mockConnection) // Arrange
            val result = service.getSpaces() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getSpaceById returns space when found`() {
        runBlocking {
            val expectedSpace = Space(id = "space-1", name = "Patio") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn(expectedSpace.id) // Arrange
            whenever(mockResultSet.getString("name")).thenReturn(expectedSpace.name) // Arrange
            val service = SpaceService(mockConnection) // Arrange
            val result = service.getSpaceById("space-1") // Act
            assertNotNull(result) // Assert
            assertEquals(expectedSpace, result) // Assert
        }
    }

    @Test
    fun `getSpaceById returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = SpaceService(mockConnection) // Arrange
            val result = service.getSpaceById("not-found") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addSpace returns null if name already exists`() {
        runBlocking {
            val newSpace = Space(id = null, name = "Existing Patio") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = SpaceService(mockConnection) // Arrange
            val result = service.addSpace(newSpace) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addSpace returns new ID on success`() {
        runBlocking {
            val newSpace = Space(id = null, name = "New Balcony") // Arrange
            val nameCheckStatement: PreparedStatement = mock() // Arrange
            val addStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT id FROM spaces"))).thenReturn(nameCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO spaces"))).thenReturn(addStatement) // Arrange
            val nameCheckResultSet: ResultSet = mock() // Arrange
            whenever(nameCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(nameCheckStatement.executeQuery()).thenReturn(nameCheckResultSet) // Arrange
            whenever(addStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = SpaceService(mockConnection) // Arrange
            val result = service.addSpace(newSpace) // Act
            assertNotNull(result) // Assert
            assertTrue(result.isNotBlank()) // Assert
        }
    }

    @Test
    fun `addSpace returns null when database insert fails`() {
        runBlocking {
            val newSpace = Space(id = null, name = "New Balcony") // Arrange
            val nameCheckStatement: PreparedStatement = mock() // Arrange
            val addStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT id FROM spaces"))).thenReturn(nameCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO spaces"))).thenReturn(addStatement) // Arrange
            val nameCheckResultSet: ResultSet = mock() // Arrange
            whenever(nameCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(nameCheckStatement.executeQuery()).thenReturn(nameCheckResultSet) // Arrange
            whenever(addStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = SpaceService(mockConnection) // Arrange
            val result = service.addSpace(newSpace) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `updateSpace returns false if ID is null`() {
        runBlocking {
            val spaceWithNullId = Space(id = null, name = "A Name") // Arrange
            val service = SpaceService(mockConnection) // Arrange
            val result = service.updateSpace(spaceWithNullId) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `updateSpace returns false if name already exists`() {
        runBlocking {
            val spaceToUpdate = Space(id = "space-1", name = "Existing Name") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = SpaceService(mockConnection) // Arrange
            val result = service.updateSpace(spaceToUpdate) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateSpace returns true on success`() {
        runBlocking {
            val spaceToUpdate = Space(id = "space-1", name = "New Valid Name") // Arrange
            val nameCheckStatement: PreparedStatement = mock() // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(
                mockConnection.prepareStatement(contains("SELECT id FROM spaces WHERE name = ? AND id != ?")),
            ).thenReturn(nameCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE spaces"))).thenReturn(updateStatement) // Arrange
            val nameCheckResultSet: ResultSet = mock() // Arrange
            whenever(nameCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(nameCheckStatement.executeQuery()).thenReturn(nameCheckResultSet) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = SpaceService(mockConnection) // Arrange
            val result = service.updateSpace(spaceToUpdate) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `updateSpace returns false when database update fails`() {
        runBlocking {
            val spaceToUpdate = Space(id = "space-1", name = "New Valid Name") // Arrange
            val nameCheckStatement: PreparedStatement = mock() // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(
                mockConnection.prepareStatement(contains("SELECT id FROM spaces WHERE name = ? AND id != ?")),
            ).thenReturn(nameCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE spaces"))).thenReturn(updateStatement) // Arrange
            val nameCheckResultSet: ResultSet = mock() // Arrange
            whenever(nameCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(nameCheckStatement.executeQuery()).thenReturn(nameCheckResultSet) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = SpaceService(mockConnection) // Arrange
            val result = service.updateSpace(spaceToUpdate) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `deleteSpace returns false if space is in use`() {
        runBlocking {
            val spaceId = "space-1" // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getInt("count")).thenReturn(1) // Arrange
            val service = SpaceService(mockConnection) // Arrange
            val result = service.deleteSpace(spaceId) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(contains("UPDATE spaces SET is_deleted")) // Assert
        }
    }

    @Test
    fun `deleteSpace returns true on success`() {
        runBlocking {
            val spaceId = "space-1" // Arrange
            val checkInUseStatement: PreparedStatement = mock() // Arrange
            val deleteStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT COUNT(*)"))).thenReturn(checkInUseStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE spaces SET is_deleted"))).thenReturn(deleteStatement) // Arrange
            val checkInUseResultSet: ResultSet = mock() // Arrange
            whenever(checkInUseResultSet.next()).thenReturn(true) // Arrange
            whenever(checkInUseResultSet.getInt("count")).thenReturn(0) // Arrange
            whenever(checkInUseStatement.executeQuery()).thenReturn(checkInUseResultSet) // Arrange
            whenever(deleteStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = SpaceService(mockConnection) // Arrange
            val result = service.deleteSpace(spaceId) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `deleteSpace returns false when space not found`() {
        runBlocking {
            val spaceId = "not-found-space" // Arrange
            val checkInUseStatement: PreparedStatement = mock() // Arrange
            val deleteStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT COUNT(*)"))).thenReturn(checkInUseStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE spaces SET is_deleted"))).thenReturn(deleteStatement) // Arrange
            val checkInUseResultSet: ResultSet = mock() // Arrange
            whenever(checkInUseResultSet.next()).thenReturn(true) // Arrange
            whenever(checkInUseResultSet.getInt("count")).thenReturn(0) // Arrange
            whenever(checkInUseStatement.executeQuery()).thenReturn(checkInUseResultSet) // Arrange
            whenever(deleteStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = SpaceService(mockConnection) // Arrange
            val result = service.deleteSpace(spaceId) // Act
            assertFalse(result) // Assert
        }
    }
}
