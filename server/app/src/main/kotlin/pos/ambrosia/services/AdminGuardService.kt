package pos.ambrosia.services

import java.sql.Connection

data class UserAdminState(
    val roleId: String?,
    val isAdmin: Boolean,
)

class AdminGuardService(
    private val connection: Connection,
) {
    companion object {
        private const val COUNT_ACTIVE_ADMIN_USERS =
            """
            SELECT COUNT(*)
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.is_deleted = 0 AND r.is_deleted = 0 AND r.isAdmin = 1
            """

        private const val COUNT_ACTIVE_ADMIN_USERS_BY_ROLE =
            """
            SELECT COUNT(*)
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.is_deleted = 0 AND r.is_deleted = 0 AND r.isAdmin = 1 AND u.role_id = ?
            """

        private const val GET_ROLE_ADMIN_STATE =
            """
            SELECT isAdmin
            FROM roles
            WHERE id = ? AND is_deleted = 0
            """

        private const val GET_USER_ADMIN_STATE =
            """
            SELECT u.role_id, COALESCE(r.isAdmin, 0) AS isAdmin
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id AND r.is_deleted = 0
            WHERE u.id = ? AND u.is_deleted = 0
            """
    }

    fun activeAdminUserCount(): Long {
        val statement = connection.prepareStatement(COUNT_ACTIVE_ADMIN_USERS)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) resultSet.getLong(1) else 0L
    }

    fun activeAdminUsersByRole(roleId: String): Long {
        val statement = connection.prepareStatement(COUNT_ACTIVE_ADMIN_USERS_BY_ROLE)
        statement.setString(1, roleId)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) resultSet.getLong(1) else 0L
    }

    fun isRoleAdmin(roleId: String): Boolean? {
        val statement = connection.prepareStatement(GET_ROLE_ADMIN_STATE)
        statement.setString(1, roleId)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) resultSet.getBoolean("isAdmin") else null
    }

    fun getUserAdminState(userId: String): UserAdminState? {
        val statement = connection.prepareStatement(GET_USER_ADMIN_STATE)
        statement.setString(1, userId)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) {
            UserAdminState(
                roleId = resultSet.getString("role_id"),
                isAdmin = resultSet.getBoolean("isAdmin"),
            )
        } else {
            null
        }
    }
}
