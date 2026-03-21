package pos.ambrosia.utest

import io.ktor.server.application.ApplicationEnvironment
import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.anyString
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.models.UpdateUserRequest
import pos.ambrosia.services.UsersService
import pos.ambrosia.utils.LastAdminRemovalException
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.Test
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class UsersServiceTest {
    private val mockConnection: Connection = mock()
    private val mockEnv: ApplicationEnvironment = mock()

    @Test
    fun `updateUser blocks reassigning last admin user to non admin role`() {
        runBlocking {
            val getUserStateStatement: PreparedStatement = mock()
            val getUserStateResult: ResultSet = mock()
            val countAdminsStatement: PreparedStatement = mock()
            val countAdminsResult: ResultSet = mock()
            val checkRoleStatement: PreparedStatement = mock()
            val checkRoleResult: ResultSet = mock()
            val getRoleStateStatement: PreparedStatement = mock()
            val getRoleStateResult: ResultSet = mock()

            whenever(mockConnection.prepareStatement(anyString())).thenAnswer { invocation ->
                when {
                    invocation
                        .getArgument<String>(
                            0,
                        ).contains("SELECT u.role_id, COALESCE(r.isAdmin, 0) AS isAdmin") -> getUserStateStatement

                    invocation
                        .getArgument<String>(
                            0,
                        ).contains("SELECT COUNT(*)\n            FROM users u\n            JOIN roles r") -> countAdminsStatement

                    invocation.getArgument<String>(0).contains("SELECT id FROM roles WHERE id = ? AND is_deleted = 0") -> checkRoleStatement

                    invocation.getArgument<String>(0).contains("SELECT isAdmin\n            FROM roles") -> getRoleStateStatement

                    else -> mock()
                }
            }

            whenever(getUserStateStatement.executeQuery()).thenReturn(getUserStateResult)
            whenever(getUserStateResult.next()).thenReturn(true)
            whenever(getUserStateResult.getString("role_id")).thenReturn("admin-role")
            whenever(getUserStateResult.getBoolean("isAdmin")).thenReturn(true)

            whenever(countAdminsStatement.executeQuery()).thenReturn(countAdminsResult)
            whenever(countAdminsResult.next()).thenReturn(true)
            whenever(countAdminsResult.getLong(1)).thenReturn(1L)

            whenever(checkRoleStatement.executeQuery()).thenReturn(checkRoleResult)
            whenever(checkRoleResult.next()).thenReturn(true)

            whenever(getRoleStateStatement.executeQuery()).thenReturn(getRoleStateResult)
            whenever(getRoleStateResult.next()).thenReturn(true)
            whenever(getRoleStateResult.getBoolean("isAdmin")).thenReturn(false)

            val service = UsersService(mockEnv, mockConnection)

            assertFailsWith<LastAdminRemovalException> {
                service.updateUser("user-1", UpdateUserRequest(roleId = "cashier-role"))
            }
        }
    }

    @Test
    fun `deleteUser blocks deleting last admin user`() {
        runBlocking {
            val countUsersStatement: PreparedStatement = mock()
            val countUsersResult: ResultSet = mock()
            val getUserStateStatement: PreparedStatement = mock()
            val getUserStateResult: ResultSet = mock()
            val countAdminsStatement: PreparedStatement = mock()
            val countAdminsResult: ResultSet = mock()

            whenever(mockConnection.prepareStatement(anyString())).thenAnswer { invocation ->
                when {
                    invocation.getArgument<String>(0).contains("SELECT COUNT(*) FROM users WHERE is_deleted = 0") -> countUsersStatement

                    invocation
                        .getArgument<String>(
                            0,
                        ).contains("SELECT u.role_id, COALESCE(r.isAdmin, 0) AS isAdmin") -> getUserStateStatement

                    invocation
                        .getArgument<String>(
                            0,
                        ).contains("SELECT COUNT(*)\n            FROM users u\n            JOIN roles r") -> countAdminsStatement

                    else -> mock()
                }
            }

            whenever(countUsersStatement.executeQuery()).thenReturn(countUsersResult)
            whenever(countUsersResult.next()).thenReturn(true)
            whenever(countUsersResult.getLong(1)).thenReturn(2L)

            whenever(getUserStateStatement.executeQuery()).thenReturn(getUserStateResult)
            whenever(getUserStateResult.next()).thenReturn(true)
            whenever(getUserStateResult.getString("role_id")).thenReturn("admin-role")
            whenever(getUserStateResult.getBoolean("isAdmin")).thenReturn(true)

            whenever(countAdminsStatement.executeQuery()).thenReturn(countAdminsResult)
            whenever(countAdminsResult.next()).thenReturn(true)
            whenever(countAdminsResult.getLong(1)).thenReturn(1L)

            val service = UsersService(mockEnv, mockConnection)

            assertFailsWith<LastAdminRemovalException> {
                service.deleteUser("user-1")
            }
        }
    }

    @Test
    fun `deleteUser allows deleting non admin user when another admin remains`() {
        runBlocking {
            val countUsersStatement: PreparedStatement = mock()
            val countUsersResult: ResultSet = mock()
            val getUserStateStatement: PreparedStatement = mock()
            val getUserStateResult: ResultSet = mock()
            val deleteStatement: PreparedStatement = mock()

            whenever(mockConnection.prepareStatement(anyString())).thenAnswer { invocation ->
                when {
                    invocation.getArgument<String>(0).contains("SELECT COUNT(*) FROM users WHERE is_deleted = 0") -> countUsersStatement

                    invocation
                        .getArgument<String>(
                            0,
                        ).contains("SELECT u.role_id, COALESCE(r.isAdmin, 0) AS isAdmin") -> getUserStateStatement

                    invocation.getArgument<String>(0).contains("UPDATE users SET is_deleted = 1, name = ? WHERE id = ?") -> deleteStatement

                    else -> mock()
                }
            }

            whenever(countUsersStatement.executeQuery()).thenReturn(countUsersResult)
            whenever(countUsersResult.next()).thenReturn(true)
            whenever(countUsersResult.getLong(1)).thenReturn(2L)

            whenever(getUserStateStatement.executeQuery()).thenReturn(getUserStateResult)
            whenever(getUserStateResult.next()).thenReturn(true)
            whenever(getUserStateResult.getString("role_id")).thenReturn("cashier-role")
            whenever(getUserStateResult.getBoolean("isAdmin")).thenReturn(false)

            whenever(deleteStatement.executeUpdate()).thenReturn(1)

            val service = UsersService(mockEnv, mockConnection)

            assertTrue(service.deleteUser("user-2"))
            verify(deleteStatement).executeUpdate()
        }
    }
}
