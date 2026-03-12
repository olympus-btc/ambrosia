package pos.ambrosia.utest

import io.ktor.server.application.ApplicationEnvironment
import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.models.Role
import pos.ambrosia.services.RolesService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class RoleServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()
    private val mockEnv: ApplicationEnvironment = mock()

    @Test
    fun `getRoles returns list of roles when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("role-1").thenReturn("role-2") // Arrange
            whenever(mockResultSet.getString("role")).thenReturn("Admin").thenReturn("Cashier") // Arrange
            whenever(mockResultSet.getString("password")).thenReturn("pass-hash-1").thenReturn("pass-hash-2") // Arrange
            whenever(mockResultSet.getBoolean("isAdmin")).thenReturn(true).thenReturn(false) // Arrange
            val service = RolesService(mockEnv, mockConnection) // Arrange
            val result = service.getRoles() // Act
            assertEquals(2, result.size) // Assert
            assertEquals("Admin", result[0].role) // Assert
            assertFalse(result[1].isAdmin ?: true) // Assert
        }
    }

    @Test
    fun `getRoles returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = RolesService(mockEnv, mockConnection) // Arrange
            val result = service.getRoles() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getRoleById returns role when found`() {
        runBlocking {
            val expectedRole = Role(id = "role-1", role = "Admin", isAdmin = true) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn(expectedRole.id) // Arrange
            whenever(mockResultSet.getString("role")).thenReturn(expectedRole.role) // Arrange
            whenever(mockResultSet.getBoolean("isAdmin")).thenReturn(expectedRole.isAdmin) // Arrange
            val service = RolesService(mockEnv, mockConnection) // Arrange
            val result = service.getRoleById("role-1") // Act
            assertNotNull(result) // Assert
            assertEquals(expectedRole, result) // Assert
        }
    }

    @Test
    fun `getRoleById returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = RolesService(mockEnv, mockConnection) // Arrange
            val result = service.getRoleById("not-found") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `deleteRole unassigns users and returns true on success`() {
        runBlocking {
            val roleId = "role-1"
            val unassignStatement: PreparedStatement = mock()
            val deleteStatement: PreparedStatement = mock()
            whenever(mockConnection.prepareStatement(contains("UPDATE users SET role_id = NULL"))).thenReturn(unassignStatement)
            whenever(mockConnection.prepareStatement(contains("UPDATE roles SET role"))).thenReturn(deleteStatement)
            whenever(unassignStatement.executeUpdate()).thenReturn(1)
            whenever(deleteStatement.executeUpdate()).thenReturn(1)
            val service = RolesService(mockEnv, mockConnection)
            val result = service.deleteRole(roleId)
            assertTrue(result)
            verify(unassignStatement).executeUpdate()
        }
    }

    @Test
    fun `deleteRole returns false when role not found`() {
        runBlocking {
            val roleId = "not-found-role"
            val unassignStatement: PreparedStatement = mock()
            val deleteStatement: PreparedStatement = mock()
            whenever(mockConnection.prepareStatement(contains("UPDATE users SET role_id = NULL"))).thenReturn(unassignStatement)
            whenever(mockConnection.prepareStatement(contains("UPDATE roles SET role"))).thenReturn(deleteStatement)
            whenever(unassignStatement.executeUpdate()).thenReturn(0)
            whenever(deleteStatement.executeUpdate()).thenReturn(0)
            val service = RolesService(mockEnv, mockConnection)
            val result = service.deleteRole(roleId)
            assertFalse(result)
        }
    }
}
