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
        val rs = statement.executeQuery()
        val list = mutableListOf<Permission>()
        while (rs.next()) {
            list.add(
                Permission(
                    id = rs.getString("id"),
                    name = rs.getString("name"),
                    description = rs.getString("description"),
                    enabled = rs.getBoolean("enabled"),
                ),
            )
        }
        return list
    }

    fun getByRole(roleId: String?): List<Permission>? {
        if (roleId == null || !roleExists(roleId)) return null
        val statement = connection.prepareStatement(SELECT_BY_ROLE)
        statement.setString(1, roleId)
        val rs = statement.executeQuery()
        val list = mutableListOf<Permission>()
        while (rs.next()) {
            list.add(
                Permission(
                    id = rs.getString("id"),
                    name = rs.getString("name"),
                    description = rs.getString("description"),
                    enabled = rs.getBoolean("enabled"),
                ),
            )
        }
        return list
    }

    fun roleExists(roleId: String): Boolean {
        val st = connection.prepareStatement(ROLE_EXISTS)
        st.setString(1, roleId)
        val rs = st.executeQuery()
        return rs.next()
    }

    fun replaceRolePermissions(
        roleId: String,
        permissionKeys: List<String>,
    ): Int {
        if (!roleExists(roleId)) return 0
        connection.autoCommit = false
        try {
            connection.prepareStatement(DELETE_ROLE_PERMS).use { st ->
                st.setString(1, roleId)
                st.executeUpdate()
            }

            if (permissionKeys.isEmpty()) {
                connection.commit()
                return 0
            }

            val placeholders = permissionKeys.joinToString(",") { "?" }
            val sql = String.format(SELECT_BY_NAMES, placeholders)
            val ids = mutableListOf<String>()
            connection.prepareStatement(sql).use { st ->
                permissionKeys.forEachIndexed { idx, key -> st.setString(idx + 1, key) }
                val rs = st.executeQuery()
                while (rs.next()) ids.add(rs.getString("id"))
            }

            var count = 0
            connection.prepareStatement(INSERT_ROLE_PERM).use { st ->
                ids.forEach { id ->
                    st.setString(1, roleId)
                    st.setString(2, id)
                    count += st.executeUpdate()
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
        connection.prepareStatement(SELECT_ENABLED_PERMISSION_IDS).use { st ->
            val rs = st.executeQuery()
            while (rs.next()) ids.add(rs.getString("id"))
        }

        var count = 0
        connection.prepareStatement(INSERT_ROLE_PERM).use { st ->
            ids.forEach { id ->
                st.setString(1, roleId)
                st.setString(2, id)
                count += st.executeUpdate()
            }
        }
        return count
    }
}
