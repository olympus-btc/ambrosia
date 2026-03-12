package pos.ambrosia.utest

import io.ktor.server.application.ApplicationEnvironment
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.any
import org.mockito.kotlin.doNothing
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.models.Permission
import pos.ambrosia.services.PermissionsService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class PermissionsServiceTest {
    private val env: ApplicationEnvironment = mock()
    private val conn: Connection = mock()

    @Test
    fun `getAll returns list when found`() {
        // Arrange
        val st: PreparedStatement = mock()
        val rs: ResultSet = mock()
        whenever(conn.prepareStatement(any())).thenReturn(st)
        whenever(st.executeQuery()).thenReturn(rs)
        whenever(rs.next()).thenReturn(true).thenReturn(true).thenReturn(false)
        whenever(rs.getString("id")).thenReturn("p1").thenReturn("p2")
        whenever(rs.getString("name")).thenReturn("perm.read").thenReturn("perm.write")
        whenever(rs.getString("description")).thenReturn("Read").thenReturn("Write")
        whenever(rs.getBoolean("enabled")).thenReturn(true).thenReturn(true)
        val service = PermissionsService(env, conn)
        // Act
        val list = service.getAll()
        // Assert
        assertEquals(2, list.size)
        assertEquals("perm.read", list[0].name)
        assertTrue(list.all { it.enabled })
    }

    @Test
    fun `getAll returns empty when none`() {
        // Arrange
        val st: PreparedStatement = mock()
        val rs: ResultSet = mock()
        whenever(conn.prepareStatement(any())).thenReturn(st)
        whenever(st.executeQuery()).thenReturn(rs)
        whenever(rs.next()).thenReturn(false)
        val service = PermissionsService(env, conn)
        // Act
        val list = service.getAll()
        // Assert
        assertTrue(list.isEmpty())
    }

    @Test
    fun `getByRole returns list when found`() {
        // Arrange
        val stRole: PreparedStatement = mock() // Arrange
        val rsRole: ResultSet = mock() // Arrange
        whenever(conn.prepareStatement(contains("FROM roles"))).thenReturn(stRole) // Arrange
        whenever(stRole.executeQuery()).thenReturn(rsRole) // Arrange
        whenever(rsRole.next()).thenReturn(true) // Arrange

        val st: PreparedStatement = mock() // Arrange
        val rs: ResultSet = mock() // Arrange
        whenever(conn.prepareStatement(contains("FROM role_permissions"))).thenReturn(st) // Arrange
        whenever(st.executeQuery()).thenReturn(rs) // Arrange
        whenever(rs.next()).thenReturn(true).thenReturn(false) // Arrange
        whenever(rs.getString("id")).thenReturn("p1") // Arrange
        whenever(rs.getString("name")).thenReturn("perm.read") // Arrange
        whenever(rs.getString("description")).thenReturn("Read") // Arrange
        whenever(rs.getBoolean("enabled")).thenReturn(true) // Arrange
        val service = PermissionsService(env, conn) // Arrange
        // Act
        val list = service.getByRole("role-1") // Act
        // Assert
        assertEquals(1, list?.size) // Assert
        assertEquals("perm.read", list?.get(0)?.name) // Assert
    }

    @Test
    fun `getByRole returns null when role does not exist`() {
        // Arrange
        val stRole: PreparedStatement = mock() // Arrange
        val rsRole: ResultSet = mock() // Arrange
        whenever(conn.prepareStatement(contains("FROM roles"))).thenReturn(stRole) // Arrange
        whenever(stRole.executeQuery()).thenReturn(rsRole) // Arrange
        whenever(rsRole.next()).thenReturn(false) // Arrange

        val service = PermissionsService(env, conn) // Arrange
        // Act
        val list = service.getByRole("role-not-existent") // Act
        // Assert
        assertTrue(list == null) // Assert
    }

    @Test
    fun `replaceRolePermissions returns 0 when role does not exist`() {
        // Arrange
        val stRole: PreparedStatement = mock()
        val rsRole: ResultSet = mock()
        whenever(conn.prepareStatement(contains("FROM roles"))).thenReturn(stRole)
        whenever(stRole.executeQuery()).thenReturn(rsRole)
        whenever(rsRole.next()).thenReturn(false)
        val service = PermissionsService(env, conn)
        // Act
        val count = service.replaceRolePermissions("role-x", listOf("perm.read"))
        // Assert
        assertEquals(0, count)
        verify(conn, never()).prepareStatement(contains("DELETE FROM role_permissions"))
    }

    @Test
    fun `replaceRolePermissions deletes only when empty keys`() {
        // Arrange
        val stRole: PreparedStatement = mock()
        val rsRole: ResultSet = mock()
        val stDelete: PreparedStatement = mock()
        whenever(conn.prepareStatement(contains("FROM roles"))).thenReturn(stRole)
        whenever(stRole.executeQuery()).thenReturn(rsRole)
        whenever(rsRole.next()).thenReturn(true)
        whenever(conn.prepareStatement(contains("DELETE FROM role_permissions"))).thenReturn(stDelete)
        whenever(stDelete.executeUpdate()).thenReturn(1)
        doNothing().whenever(conn).commit()
        val service = PermissionsService(env, conn)
        // Act
        val count = service.replaceRolePermissions("role-1", emptyList())
        // Assert
        assertEquals(0, count)
        verify(conn).prepareStatement(contains("DELETE FROM role_permissions"))
        verify(conn).commit()
    }

    @Test
    fun `replaceRolePermissions inserts resolved permission ids`() {
        // Arrange
        val stRole: PreparedStatement = mock()
        val rsRole: ResultSet = mock()
        val stDelete: PreparedStatement = mock()
        val stSelect: PreparedStatement = mock()
        val rsSelect: ResultSet = mock()
        val stInsert: PreparedStatement = mock()
        whenever(conn.prepareStatement(contains("FROM roles"))).thenReturn(stRole)
        whenever(stRole.executeQuery()).thenReturn(rsRole)
        whenever(rsRole.next()).thenReturn(true)
        whenever(conn.prepareStatement(contains("DELETE FROM role_permissions"))).thenReturn(stDelete)
        whenever(stDelete.executeUpdate()).thenReturn(1)
        whenever(conn.prepareStatement(contains("SELECT id FROM permissions"))).thenReturn(stSelect)
        whenever(stSelect.executeQuery()).thenReturn(rsSelect)
        whenever(rsSelect.next()).thenReturn(true).thenReturn(true).thenReturn(false)
        whenever(rsSelect.getString("id")).thenReturn("perm-1").thenReturn("perm-2")
        whenever(conn.prepareStatement(contains("INSERT OR IGNORE INTO role_permissions"))).thenReturn(stInsert)
        whenever(stInsert.executeUpdate()).thenReturn(1).thenReturn(1)
        doNothing().whenever(conn).commit()
        val service = PermissionsService(env, conn)
        // Act
        val count = service.replaceRolePermissions("role-1", listOf("perm.read", "perm.write"))
        // Assert
        assertEquals(2, count)
        verify(conn).commit()
    }

    @Test
    fun `replaceRolePermissions rolls back on failure`() {
        // Arrange
        val stRole: PreparedStatement = mock()
        val rsRole: ResultSet = mock()
        whenever(conn.prepareStatement(contains("FROM roles"))).thenReturn(stRole)
        whenever(stRole.executeQuery()).thenReturn(rsRole)
        whenever(rsRole.next()).thenReturn(true)
        whenever(conn.prepareStatement(contains("DELETE FROM role_permissions"))).thenThrow(RuntimeException("boom"))
        doNothing().whenever(conn).rollback()
        val service = PermissionsService(env, conn)
        // Act
        val count = service.replaceRolePermissions("role-1", listOf("perm.read"))
        // Assert
        assertEquals(0, count)
        verify(conn).rollback()
    }
}
