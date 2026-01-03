package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.mockito.kotlin.*
import pos.ambrosia.models.*
import pos.ambrosia.services.TicketTemplateService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.Statement
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TicketTemplateServiceTest {

    private val mockConnection: Connection = mock()
    private val mockPreparedStatement: PreparedStatement = mock()
    private val mockStatement: Statement = mock()
    private val mockResultSet: ResultSet = mock()

    private val service = TicketTemplateService(mockConnection)

    @Test
    fun `addTemplate should return id on success`() {
        runBlocking {
            // Arrange
            val request = TicketTemplateRequest(
                name = "New Template",
                elements = listOf(
                    TicketElementCreateRequest(ElementType.TEXT, "Hello", ElementStyle())
                )
            )

            // Mock check name exists (returns false -> name available)
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockPreparedStatement)
            whenever(mockPreparedStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(false)

            // Act
            val resultId = service.addTemplate(request)

            // Assert
            assertNotNull(resultId)
            verify(mockConnection).commit()
        }
    }

    @Test
    fun `addTemplate should return null if name exists`() {
        runBlocking {
            // Arrange
            val request = TicketTemplateRequest(name = "Existing Template", elements = emptyList())

            // Mock check name exists (returns true -> name taken)
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockPreparedStatement)
            whenever(mockPreparedStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(true)

            // Act
            val resultId = service.addTemplate(request)

            // Assert
            assertNull(resultId)
            verify(mockConnection, never()).commit()
        }
    }

    @Test
    fun `getTemplates should return list of templates`() {
        runBlocking {
            // Arrange
            whenever(mockConnection.createStatement()).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery(any())).thenReturn(mockResultSet)
            
            // Mock templates result set
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false)
            val uuid = UUID.randomUUID()
            whenever(mockResultSet.getBytes("id")).thenReturn(uuid.toBytes())
            whenever(mockResultSet.getString("name")).thenReturn("My Template")

            // Mock elements query (called for each template)
            val mockElementsStmt: PreparedStatement = mock()
            val mockElementsRs: ResultSet = mock()
            // Using loose matching for simplicity to fix initialization error first
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockElementsStmt) 
            whenever(mockElementsStmt.executeQuery()).thenReturn(mockElementsRs)
            whenever(mockElementsRs.next()).thenReturn(false) // No elements for simplicity

            // Act
            val templates = service.getTemplates()

            // Assert
            assertEquals(1, templates.size)
            assertEquals("My Template", templates[0].name)
        }
    }
    
    @Test
    fun `updateTemplate should return true on success`() {
        runBlocking {
            // Arrange
            val id = UUID.randomUUID().toString()
            val request = TicketTemplateRequest(
                name = "Updated Name",
                elements = emptyList()
            )

            // Mock name check and update
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockPreparedStatement)
            whenever(mockPreparedStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(false)

            // Act
            val success = service.updateTemplate(id, request)

            // Assert
            assertTrue(success)
            verify(mockConnection).commit()
        }
    }

    @Test
    fun `deleteTemplate should return true if deleted`() {
        runBlocking {
            // Arrange
            val id = UUID.randomUUID().toString()
            
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockPreparedStatement)
            whenever(mockPreparedStatement.executeUpdate()).thenReturn(1) // 1 row deleted

            // Act
            val success = service.deleteTemplate(id)

            // Assert
            assertTrue(success)
        }
    }

    @Test
    fun `deleteTemplate should return false if not found`() {
        runBlocking {
            // Arrange
            val id = UUID.randomUUID().toString()
            
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockPreparedStatement)
            whenever(mockPreparedStatement.executeUpdate()).thenReturn(0) // 0 rows deleted

            // Act
            val success = service.deleteTemplate(id)

            // Assert
            assertFalse(success)
        }
    }

    // Helper to match UUID bytes logic in service
    private fun UUID.toBytes(): ByteArray {
        val byteArray = ByteArray(16)
        val bb = java.nio.ByteBuffer.wrap(byteArray)
        bb.putLong(this.mostSignificantBits)
        bb.putLong(this.leastSignificantBits)
        return byteArray
    }
}
