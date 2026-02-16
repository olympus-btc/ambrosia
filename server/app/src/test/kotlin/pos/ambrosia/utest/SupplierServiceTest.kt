package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.*
import pos.ambrosia.models.Supplier
import pos.ambrosia.services.SupplierService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.*

class SupplierServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    @Test
    fun `getSuppliers returns list of suppliers when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("sup-1").thenReturn("sup-2") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("Sysco").thenReturn("US Foods") // Arrange
            whenever(mockResultSet.getString("contact")).thenReturn("John Doe").thenReturn("Jane Smith") // Arrange
            whenever(mockResultSet.getString("phone")).thenReturn("555-1111").thenReturn("555-2222") // Arrange
            whenever(mockResultSet.getString("email")).thenReturn("john@sysco.com").thenReturn("jane@usfoods.com") // Arrange
            whenever(mockResultSet.getString("address")).thenReturn("123 Supply St").thenReturn("456 Food Ave") // Arrange
            val service = SupplierService(mockConnection) // Arrange
            val result = service.getSuppliers() // Act
            assertEquals(2, result.size) // Assert
            assertEquals("Sysco", result[0].name) // Assert
        }
    }

    @Test
    fun `getSuppliers returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = SupplierService(mockConnection) // Arrange
            val result = service.getSuppliers() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getSupplierById returns supplier when found`() {
        runBlocking {
            val expectedSupplier = Supplier("sup-1", "Sysco", "John Doe", "555-1111", "john@sysco.com", "123 Supply St") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn(expectedSupplier.id) // Arrange
            whenever(mockResultSet.getString("name")).thenReturn(expectedSupplier.name) // Arrange
            whenever(mockResultSet.getString("contact")).thenReturn(expectedSupplier.contact) // Arrange
            whenever(mockResultSet.getString("phone")).thenReturn(expectedSupplier.phone) // Arrange
            whenever(mockResultSet.getString("email")).thenReturn(expectedSupplier.email) // Arrange
            whenever(mockResultSet.getString("address")).thenReturn(expectedSupplier.address) // Arrange
            val service = SupplierService(mockConnection) // Arrange
            val result = service.getSupplierById("sup-1") // Act
            assertNotNull(result) // Assert
            assertEquals(expectedSupplier, result) // Assert
        }
    }

    @Test
    fun `getSupplierById returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = SupplierService(mockConnection) // Arrange
            val result = service.getSupplierById("not-found") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addSupplier returns null if name already exists`() {
        runBlocking {
            val newSupplier = Supplier(null, "Existing Supplier", "", "", "", "") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = SupplierService(mockConnection) // Arrange
            val result = service.addSupplier(newSupplier) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addSupplier returns new ID on success`() {
        runBlocking {
            val newSupplier = Supplier(null, "New Supplier", "", "", "", "") // Arrange
            val nameCheckStatement: PreparedStatement = mock() // Arrange
            val addStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT id FROM suppliers"))).thenReturn(nameCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO suppliers"))).thenReturn(addStatement) // Arrange
            val nameCheckResultSet: ResultSet = mock() // Arrange
            whenever(nameCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(nameCheckStatement.executeQuery()).thenReturn(nameCheckResultSet) // Arrange
            whenever(addStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = SupplierService(mockConnection) // Arrange
            val result = service.addSupplier(newSupplier) // Act
            assertNotNull(result) // Assert
            assertTrue(result.isNotBlank()) // Assert
        }
    }

    @Test
    fun `addSupplier returns null when database insert fails`() {
        runBlocking {
            val newSupplier = Supplier(null, "New Supplier", "", "", "", "") // Arrange
            val nameCheckStatement: PreparedStatement = mock() // Arrange
            val addStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT id FROM suppliers"))).thenReturn(nameCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO suppliers"))).thenReturn(addStatement) // Arrange
            val nameCheckResultSet: ResultSet = mock() // Arrange
            whenever(nameCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(nameCheckStatement.executeQuery()).thenReturn(nameCheckResultSet) // Arrange
            whenever(addStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = SupplierService(mockConnection) // Arrange
            val result = service.addSupplier(newSupplier) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `updateSupplier returns false if ID is null`() {
        runBlocking {
            val supplierWithNullId = Supplier(id = null, name = "A Name", "", "", "", "") // Arrange
            val service = SupplierService(mockConnection) // Arrange
            val result = service.updateSupplier(supplierWithNullId) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `updateSupplier returns false if name already exists`() {
        runBlocking {
            val supplierToUpdate = Supplier(id = "sup-1", name = "Existing Name", "", "", "", "") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = SupplierService(mockConnection) // Arrange
            val result = service.updateSupplier(supplierToUpdate) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateSupplier returns true on success`() {
        runBlocking {
            val supplierToUpdate = Supplier(id = "sup-1", name = "New Valid Name", "", "", "", "") // Arrange
            val nameCheckStatement: PreparedStatement = mock() // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(
                mockConnection.prepareStatement(contains("SELECT id FROM suppliers WHERE name = ? AND id != ?")),
            ).thenReturn(nameCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE suppliers"))).thenReturn(updateStatement) // Arrange
            val nameCheckResultSet: ResultSet = mock() // Arrange
            whenever(nameCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(nameCheckStatement.executeQuery()).thenReturn(nameCheckResultSet) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = SupplierService(mockConnection) // Arrange
            val result = service.updateSupplier(supplierToUpdate) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `updateSupplier returns false when database update fails`() {
        runBlocking {
            val supplierToUpdate = Supplier(id = "sup-1", name = "New Valid Name", "", "", "", "") // Arrange
            val nameCheckStatement: PreparedStatement = mock() // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(
                mockConnection.prepareStatement(contains("SELECT id FROM suppliers WHERE name = ? AND id != ?")),
            ).thenReturn(nameCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE suppliers"))).thenReturn(updateStatement) // Arrange
            val nameCheckResultSet: ResultSet = mock() // Arrange
            whenever(nameCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(nameCheckStatement.executeQuery()).thenReturn(nameCheckResultSet) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = SupplierService(mockConnection) // Arrange
            val result = service.updateSupplier(supplierToUpdate) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `deleteSupplier returns false if supplier is in use`() {
        runBlocking {
            val supplierId = "sup-1" // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getInt("count")).thenReturn(1) // Arrange
            val service = SupplierService(mockConnection) // Arrange
            val result = service.deleteSupplier(supplierId) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(contains("UPDATE suppliers SET is_deleted")) // Assert
        }
    }

    @Test
    fun `deleteSupplier returns true on success`() {
        runBlocking {
            val supplierId = "sup-1" // Arrange
            val checkInUseStatement: PreparedStatement = mock() // Arrange
            val deleteStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT COUNT(*)"))).thenReturn(checkInUseStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE suppliers SET is_deleted"))).thenReturn(deleteStatement) // Arrange
            val checkInUseResultSet: ResultSet = mock() // Arrange
            whenever(checkInUseResultSet.next()).thenReturn(true) // Arrange
            whenever(checkInUseResultSet.getInt("count")).thenReturn(0) // Arrange
            whenever(checkInUseStatement.executeQuery()).thenReturn(checkInUseResultSet) // Arrange
            whenever(deleteStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = SupplierService(mockConnection) // Arrange
            val result = service.deleteSupplier(supplierId) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `deleteSupplier returns false when supplier not found`() {
        runBlocking {
            val supplierId = "not-found-sup" // Arrange
            val checkInUseStatement: PreparedStatement = mock() // Arrange
            val deleteStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT COUNT(*)"))).thenReturn(checkInUseStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE suppliers SET is_deleted"))).thenReturn(deleteStatement) // Arrange
            val checkInUseResultSet: ResultSet = mock() // Arrange
            whenever(checkInUseResultSet.next()).thenReturn(true) // Arrange
            whenever(checkInUseResultSet.getInt("count")).thenReturn(0) // Arrange
            whenever(checkInUseStatement.executeQuery()).thenReturn(checkInUseResultSet) // Arrange
            whenever(deleteStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = SupplierService(mockConnection) // Arrange
            val result = service.deleteSupplier(supplierId) // Act
            assertFalse(result) // Assert
        }
    }
}
