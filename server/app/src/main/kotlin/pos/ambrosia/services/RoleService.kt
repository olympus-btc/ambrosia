package pos.ambrosia.services

import java.lang.StringBuilder
import java.sql.Connection
import pos.ambrosia.logger
import pos.ambrosia.models.Role
import pos.ambrosia.utils.SecurePinProcessor
import io.ktor.server.application.ApplicationEnvironment

class RolesService(private val env: ApplicationEnvironment, private val connection: Connection) {
  companion object {
    private const val ADD_ROLE =
            "INSERT INTO roles (id, role, password, isAdmin) VALUES (?, ?, ?, ?)"
    private const val GET_ROLES =
            "SELECT id, role, password, isAdmin FROM roles WHERE is_deleted = 0"
    private const val GET_ROLE_BY_ID =
            "SELECT id, role, password, isAdmin FROM roles WHERE id = ? AND is_deleted = 0"
    private const val DELETE_ROLE = "UPDATE roles SET is_deleted = 1 WHERE id = ?"
    private const val CHECK_ROLE_NAME_EXISTS =
            "SELECT id FROM roles WHERE role = ? AND is_deleted = 0"
  }

  suspend fun addRole(role: Role): String? {
    if (roleNameExists(role.role)) {
      logger.error("Role name already exists: ${role.role}")
      return null
    }

    val generatedId = java.util.UUID.randomUUID().toString()
    val statement = connection.prepareStatement(ADD_ROLE)

    val encryptedPin =
            SecurePinProcessor.hashPinForStorage(
                    pin = role.password?.toCharArray() ?: charArrayOf(),
                    id = generatedId,
                    env = env
            )

    statement.setString(1, generatedId)
    statement.setString(2, role.role)
    statement.setString(3, SecurePinProcessor.byteArrayToBase64(encryptedPin))
    statement.setBoolean(4, role.isAdmin ?: false)

    val rowsAffected = statement.executeUpdate()

    return if (rowsAffected > 0) {
      logger.info("Role created successfully with ID: $generatedId")
      generatedId
    } else {
      logger.error("Failed to create role")
      null
    }
  }

  private suspend fun roleNameExists(roleName: String): Boolean {
    val statement = connection.prepareStatement(CHECK_ROLE_NAME_EXISTS)
    statement.setString(1, roleName)
    val resultSet = statement.executeQuery()
    return resultSet.next()
  }

  suspend fun getRoles(): List<Role> {
    val statement = connection.prepareStatement(GET_ROLES)
    val resultSet = statement.executeQuery()
    val roles = mutableListOf<Role>()
    while (resultSet.next()) {
      val role =
              Role(
                      id = resultSet.getString("id"),
                      role = resultSet.getString("role"),
                      password = "********", // Masked for security
                      isAdmin = resultSet.getBoolean("isAdmin")
              )
      roles.add(role)
    }
    logger.info("Retrieved ${roles.size} roles")
    return roles
  }

  suspend fun getRoleById(id: String): Role? {
    val statement = connection.prepareStatement(GET_ROLE_BY_ID)
    statement.setString(1, id)
    val resultSet = statement.executeQuery()
    return if (resultSet.next()) {
      Role(
              id = resultSet.getString("id"),
              role = resultSet.getString("role"),
              isAdmin = resultSet.getBoolean("isAdmin")
      )
    } else {
      logger.warn("Role not found with ID: $id")
      null
    }
  }

  suspend fun updateRole(id: String?, role: Role): Boolean {
    val sql = StringBuilder()
    sql.append("UPDATE roles SET role = ?, isAdmin = ? ")
    if (role.password != null) sql.append(", password = ? ")
    sql.append("WHERE id = ?")

    val targetId = role.id ?: id
    if (targetId == null) return false
    // Verificar que el nombre del rol no exista ya (excluyendo el rol actual)
    if (roleNameExistsExcludingId(role.role, targetId)) {
      logger.error("Role name already exists: ${role.role}")
      return false
    }

    val statement = connection.prepareStatement(sql.toString())

    statement.setString(1, role.role)
    statement.setBoolean(2, role.isAdmin ?: false)
    if (role.password != null) {
      val encryptedPin = SecurePinProcessor.hashPinForStorage(role.password.toCharArray(), targetId, env)
      statement.setString(3, SecurePinProcessor.byteArrayToBase64(encryptedPin))
    }
    statement.setString(role.password?.let { 4 } ?: 3, targetId)

    val rowsUpdated = statement.executeUpdate()
    if (rowsUpdated > 0) {
      logger.info("Role updated successfully: $targetId")
    } else {
      logger.error("Failed to update role: $targetId")
    }
    return rowsUpdated > 0
  }

  private suspend fun roleNameExistsExcludingId(roleName: String, excludeId: String): Boolean {
    val statement =
            connection.prepareStatement(
                    "SELECT id FROM roles WHERE role = ? AND id != ? AND is_deleted = 0"
            )
    statement.setString(1, roleName)
    statement.setString(2, excludeId)
    val resultSet = statement.executeQuery()
    return resultSet.next()
  }

  suspend fun deleteRole(id: String): Boolean {
    if (roleInUse(id)) {
      logger.error("Cannot delete role $id: it's being used by users")
      return false
    }

    val statement = connection.prepareStatement(DELETE_ROLE)
    statement.setString(1, id)
    val rowsDeleted = statement.executeUpdate()

    if (rowsDeleted > 0) {
      logger.info("Role soft-deleted successfully: $id")
    } else {
      logger.error("Failed to delete role: $id")
    }
    return rowsDeleted > 0
  }

  private suspend fun roleInUse(roleId: String): Boolean {
    val statement =
            connection.prepareStatement(
                    "SELECT COUNT(*) as count FROM users WHERE role_id = ? AND is_deleted = 0"
            )
    statement.setString(1, roleId)
    val resultSet = statement.executeQuery()
    if (resultSet.next()) {
      return resultSet.getInt("count") > 0
    }
    return false
  }
}
