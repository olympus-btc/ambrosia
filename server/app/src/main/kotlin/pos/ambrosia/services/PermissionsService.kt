package pos.ambrosia.services

import io.ktor.server.application.ApplicationEnvironment
import pos.ambrosia.logger
import pos.ambrosia.models.Permission
import java.sql.Connection

class PermissionsService(
    private val env: ApplicationEnvironment,
    private val connection: Connection,
) {
    companion object {
        private const val SELECT_ALL =
            "SELECT id, name, description, enabled FROM permissions ORDER BY name"
        private const val SELECT_BY_ROLE =
            """
    SELECT p.id, p.name, p.description, p.enabled
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = ?
    ORDER BY p.name
    """
        private const val SELECT_BY_NAMES =
            "SELECT id FROM permissions WHERE name IN (%s) AND enabled = 1"
        private const val ROLE_EXISTS = "SELECT id FROM roles WHERE id = ? AND is_deleted = 0"
        private const val DELETE_ROLE_PERMS = "DELETE FROM role_permissions WHERE role_id = ?"
        private const val INSERT_ROLE_PERM =
            "INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)"
        private const val SELECT_ENABLED_PERMISSION_IDS = "SELECT id FROM permissions WHERE enabled = 1"
    }

    fun getAll(): List<Permission> {
        val statement = connection.prepareStatement(SELECT_ALL)
        val resultSet = statement.executeQuery()
        val list = mutableListOf<Permission>()
        while (resultSet.next()) {
            list.add(
                Permission(
                    id = resultSet.getString("id"),
                    name = resultSet.getString("name"),
                    description = resultSet.getString("description"),
                    enabled = resultSet.getBoolean("enabled"),
                ),
            )
        }
        return list
    }

    fun getByRole(roleId: String?): List<Permission>? {
        if (roleId == null || !roleExists(roleId)) return null
        val statement = connection.prepareStatement(SELECT_BY_ROLE)
        statement.setString(1, roleId)
        val resultSet = statement.executeQuery()
        val list = mutableListOf<Permission>()
        while (resultSet.next()) {
            list.add(
                Permission(
                    id = resultSet.getString("id"),
                    name = resultSet.getString("name"),
                    description = resultSet.getString("description"),
                    enabled = resultSet.getBoolean("enabled"),
                ),
            )
        }
        return list
    }

    fun roleExists(roleId: String): Boolean {
        val statement = connection.prepareStatement(ROLE_EXISTS)
        statement.setString(1, roleId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    fun replaceRolePermissions(
        roleId: String,
        permissionKeys: List<String>,
    ): Int {
        if (!roleExists(roleId)) return 0
        connection.autoCommit = false
        try {
            connection.prepareStatement(DELETE_ROLE_PERMS).use { statement ->
                statement.setString(1, roleId)
                statement.executeUpdate()
            }

            if (permissionKeys.isEmpty()) {
                connection.commit()
                return 0
            }

            val placeholders = permissionKeys.joinToString(",") { "?" }
            val sql = String.format(SELECT_BY_NAMES, placeholders)
            val ids = mutableListOf<String>()
            connection.prepareStatement(sql).use { statement ->
                permissionKeys.forEachIndexed { idx, key -> statement.setString(idx + 1, key) }
                val resultSet = statement.executeQuery()
                while (resultSet.next()) ids.add(resultSet.getString("id"))
            }

            var count = 0
            connection.prepareStatement(INSERT_ROLE_PERM).use { statement ->
                ids.forEach { id ->
                    statement.setString(1, roleId)
                    statement.setString(2, id)
                    count += statement.executeUpdate()
                }
            }
            connection.commit()
            return count
        } catch (e: Exception) {
            logger.error("Failed to replace role permissions: ${e.message}")
            try {
                connection.rollback()
            } catch (_: Exception) {
            }
            return 0
        } finally {
            try {
                connection.autoCommit = true
            } catch (_: Exception) {
            }
        }
    }

    fun assignAllEnabledToRole(roleId: String): Int {
        if (!roleExists(roleId)) return 0
        val ids = mutableListOf<String>()
        connection.prepareStatement(SELECT_ENABLED_PERMISSION_IDS).use { statement ->
            val resultSet = statement.executeQuery()
            while (resultSet.next()) ids.add(resultSet.getString("id"))
        }

        var count = 0
        connection.prepareStatement(INSERT_ROLE_PERM).use { statement ->
            ids.forEach { id ->
                statement.setString(1, roleId)
                statement.setString(2, id)
                count += statement.executeUpdate()
            }
        }
        return count
    }
}
