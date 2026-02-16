package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.*
import pos.ambrosia.models.Table
import pos.ambrosia.services.TableService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.*

class TableServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    @Test
    fun `getTables returns list of tables when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("table-1").thenReturn("table-2") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("T1").thenReturn("T2") // Arrange
            whenever(mockResultSet.getString("space_id")).thenReturn("space-1").thenReturn("space-1") // Arrange
            whenever(mockResultSet.getString("order_id")).thenReturn("order-1").thenReturn(null) // Arrange
            whenever(mockResultSet.getString("status")).thenReturn("occupied").thenReturn("available") // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.getTables() // Act
            assertEquals(2, result.size) // Assert
            assertEquals("T1", result[0].name) // Assert
        }
    }

    @Test
    fun `getTables returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.getTables() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getTableById returns table when found`() {
        runBlocking {
            val expectedTable = Table("table-1", "T1", "space-1", "order-1", "occupied") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn(expectedTable.id) // Arrange
            whenever(mockResultSet.getString("name")).thenReturn(expectedTable.name) // Arrange
            whenever(mockResultSet.getString("space_id")).thenReturn(expectedTable.space_id) // Arrange
            whenever(mockResultSet.getString("order_id")).thenReturn(expectedTable.order_id) // Arrange
            whenever(mockResultSet.getString("status")).thenReturn(expectedTable.status) // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.getTableById("table-1") // Act
            assertNotNull(result) // Assert
            assertEquals(expectedTable, result) // Assert
        }
    }

    @Test
    fun `getTableById returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.getTableById("not-found") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `getTablesBySpace returns tables when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("table-1") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("T1") // Arrange
            whenever(mockResultSet.getString("space_id")).thenReturn("space-1") // Arrange
            whenever(mockResultSet.getString("order_id")).thenReturn("order-1") // Arrange
            whenever(mockResultSet.getString("status")).thenReturn("occupied") // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.getTablesBySpace("space-1") // Act
            assertEquals(1, result.size) // Assert
            assertEquals("T1", result[0].name) // Assert
        }
    }

    @Test
    fun `getTablesBySpace returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.getTablesBySpace("space-2") // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `addTable returns null if space does not exist`() {
        runBlocking {
            val newTable = Table(null, "T3", "non-existent-space", "", "available") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.addTable(newTable) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addTable returns null if table name already exists in space`() {
        runBlocking {
            val newTable = Table(null, "T1", "space-1", "", "available") // Arrange
            val spaceCheckStatement: PreparedStatement = mock() // Arrange
            val nameCheckStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("FROM spaces"))).thenReturn(spaceCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("FROM tables"))).thenReturn(nameCheckStatement) // Arrange
            val spaceResultSet: ResultSet = mock() // Arrange
            whenever(spaceResultSet.next()).thenReturn(true) // Arrange
            whenever(spaceCheckStatement.executeQuery()).thenReturn(spaceResultSet) // Arrange
            val nameResultSet: ResultSet = mock() // Arrange
            whenever(nameResultSet.next()).thenReturn(true) // Arrange
            whenever(nameCheckStatement.executeQuery()).thenReturn(nameResultSet) // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.addTable(newTable) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addTable returns null when database insert fails`() {
        runBlocking {
            val newTable = Table(null, "T4", "space-1", "", "available") // Arrange
            val spaceCheckStatement: PreparedStatement = mock() // Arrange
            val nameCheckStatement: PreparedStatement = mock() // Arrange
            val addStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("FROM spaces"))).thenReturn(spaceCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("FROM tables"))).thenReturn(nameCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO tables"))).thenReturn(addStatement) // Arrange
            val spaceResultSet: ResultSet = mock() // Arrange
            whenever(spaceResultSet.next()).thenReturn(true) // Arrange
            whenever(spaceCheckStatement.executeQuery()).thenReturn(spaceResultSet) // Arrange
            val nameResultSet: ResultSet = mock() // Arrange
            whenever(nameResultSet.next()).thenReturn(false) // Arrange
            whenever(nameCheckStatement.executeQuery()).thenReturn(nameResultSet) // Arrange
            whenever(addStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.addTable(newTable) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addTable returns null if status is invalid`() {
        runBlocking {
            val newTable = Table(null, "T3", "space-1", "", "invalid-status") // Arrange
            val spaceCheckStatement: PreparedStatement = mock() // Arrange
            val nameCheckStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("FROM spaces"))).thenReturn(spaceCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("FROM tables"))).thenReturn(nameCheckStatement) // Arrange
            val spaceResultSet: ResultSet = mock() // Arrange
            whenever(spaceResultSet.next()).thenReturn(true) // Arrange
            whenever(spaceCheckStatement.executeQuery()).thenReturn(spaceResultSet) // Arrange
            val nameResultSet: ResultSet = mock() // Arrange
            whenever(nameResultSet.next()).thenReturn(false) // Arrange
            whenever(nameCheckStatement.executeQuery()).thenReturn(nameResultSet) // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.addTable(newTable) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `updateTable returns false if ID is null`() {
        runBlocking {
            val tableWithNullId = Table(id = null, name = "A Name", space_id = "space-1", order_id = "", status = "available") // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.updateTable(tableWithNullId) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `updateTable returns false if space does not exist`() {
        runBlocking {
            val tableToUpdate = Table(id = "table-1", name = "A Name", space_id = "non-existent-space", order_id = "", status = "available")
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.updateTable(tableToUpdate) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateTable returns false if name already exists in space`() {
        runBlocking {
            val tableToUpdate = Table(id = "table-1", name = "Existing Name", space_id = "space-1", order_id = "", status = "available")
            val spaceCheckStatement: PreparedStatement = mock() // Arrange
            val nameCheckStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("FROM spaces"))).thenReturn(spaceCheckStatement) // Arrange
            whenever(
                mockConnection.prepareStatement(contains("FROM tables WHERE name = ? AND space_id = ? AND id != ?")),
            ).thenReturn(nameCheckStatement) // Arrange
            val spaceResultSet: ResultSet = mock() // Arrange
            whenever(spaceResultSet.next()).thenReturn(true) // Arrange
            whenever(spaceCheckStatement.executeQuery()).thenReturn(spaceResultSet) // Arrange
            val nameResultSet: ResultSet = mock() // Arrange
            whenever(nameResultSet.next()).thenReturn(true) // Arrange
            whenever(nameCheckStatement.executeQuery()).thenReturn(nameResultSet) // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.updateTable(tableToUpdate) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateTable returns false if status is invalid`() {
        runBlocking {
            val tableToUpdate = Table(id = "table-1", name = "A Name", space_id = "space-1", order_id = "", status = "invalid-status")
            val spaceCheckStatement: PreparedStatement = mock() // Arrange
            val nameCheckStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("FROM spaces"))).thenReturn(spaceCheckStatement) // Arrange
            whenever(
                mockConnection.prepareStatement(contains("FROM tables WHERE name = ? AND space_id = ? AND id != ?")),
            ).thenReturn(nameCheckStatement) // Arrange
            val spaceResultSet: ResultSet = mock() // Arrange
            whenever(spaceResultSet.next()).thenReturn(true) // Arrange
            whenever(spaceCheckStatement.executeQuery()).thenReturn(spaceResultSet) // Arrange
            val nameResultSet: ResultSet = mock() // Arrange
            whenever(nameResultSet.next()).thenReturn(false) // Arrange
            whenever(nameCheckStatement.executeQuery()).thenReturn(nameResultSet) // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.updateTable(tableToUpdate) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateTable returns true on success`() {
        runBlocking {
            val tableToUpdate =
                Table(id = "table-1", name = "Updated Name", space_id = "space-1", order_id = "order-1", status = "occupied") // Arrange
            val spaceCheckStatement: PreparedStatement = mock() // Arrange
            val nameCheckStatement: PreparedStatement = mock() // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("FROM spaces"))).thenReturn(spaceCheckStatement) // Arrange
            whenever(
                mockConnection.prepareStatement(contains("FROM tables WHERE name = ? AND space_id = ? AND id != ?")),
            ).thenReturn(nameCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE tables"))).thenReturn(updateStatement) // Arrange
            val spaceResultSet: ResultSet = mock() // Arrange
            whenever(spaceResultSet.next()).thenReturn(true) // Arrange
            whenever(spaceCheckStatement.executeQuery()).thenReturn(spaceResultSet) // Arrange
            val nameResultSet: ResultSet = mock() // Arrange
            whenever(nameResultSet.next()).thenReturn(false) // Arrange
            whenever(nameCheckStatement.executeQuery()).thenReturn(nameResultSet) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.updateTable(tableToUpdate) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `updateTable returns false when database update fails`() {
        runBlocking {
            val tableToUpdate =
                Table(id = "table-1", name = "Updated Name", space_id = "space-1", order_id = "order-1", status = "occupied") // Arrange
            val spaceCheckStatement: PreparedStatement = mock() // Arrange
            val nameCheckStatement: PreparedStatement = mock() // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("FROM spaces"))).thenReturn(spaceCheckStatement) // Arrange
            whenever(
                mockConnection.prepareStatement(contains("FROM tables WHERE name = ? AND space_id = ? AND id != ?")),
            ).thenReturn(nameCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE tables"))).thenReturn(updateStatement) // Arrange
            val spaceResultSet: ResultSet = mock() // Arrange
            whenever(spaceResultSet.next()).thenReturn(true) // Arrange
            whenever(spaceCheckStatement.executeQuery()).thenReturn(spaceResultSet) // Arrange
            val nameResultSet: ResultSet = mock() // Arrange
            whenever(nameResultSet.next()).thenReturn(false) // Arrange
            whenever(nameCheckStatement.executeQuery()).thenReturn(nameResultSet) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.updateTable(tableToUpdate) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `deleteTable returns true on success`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.deleteTable("table-1") // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `deleteTable returns false when table not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = TableService(mockConnection) // Arrange
            val result = service.deleteTable("not-found-table") // Act
            assertFalse(result) // Assert
        }
    }
}
