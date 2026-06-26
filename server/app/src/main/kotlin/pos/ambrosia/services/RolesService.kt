package pos.ambrosia.services

import io.ktor.server.application.ApplicationEnvironment
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.neq
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import pos.ambrosia.db.tables.RoleEntity
import pos.ambrosia.db.tables.RolesTable
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.logger
import pos.ambrosia.models.Role
import pos.ambrosia.utils.LastAdminRemovalException
import pos.ambrosia.utils.SecurePinProcessor
import java.util.UUID

class RolesService(
    private val env: ApplicationEnvironment,
) {
    private val adminGuard = AdminGuardService()

    fun addRole(role: Role): String? =
        transaction {
            if (role.role.isBlank()) return@transaction null
            if (roleNameExists(role.role)) {
                logger.error("Role name already exists: ${role.role}")
                return@transaction null
            }

            val id = UUID.randomUUID()
            val encryptedPin =
                SecurePinProcessor.hashPinForStorage(
                    pin = role.password?.toCharArray() ?: charArrayOf(),
                    id = id.toString(),
                    env = env,
                )

            val generatedId =
                RoleEntity
                    .new(id) {
                        this.role = role.role
                        this.password = SecurePinProcessor.byteArrayToBase64(encryptedPin)
                        this.isAdmin = role.isAdmin ?: false
                    }.id.value
                    .toString()
            logger.info("Role created successfully with ID: $generatedId")
            generatedId
        }

    private fun roleNameExists(roleName: String): Boolean =
        !RolesTable
            .selectAll()
            .where { (RolesTable.role eq roleName) and (RolesTable.isDeleted eq false) }
            .empty()

    private fun roleNameExistsExcludingId(
        roleName: String,
        excludeId: String,
    ): Boolean =
        !RolesTable
            .selectAll()
            .where {
                (RolesTable.role eq roleName) and
                    (RolesTable.isDeleted eq false) and
                    (RolesTable.id neq EntityID(UUID.fromString(excludeId), RolesTable))
            }.empty()

    fun getRoles(): List<Role> =
        transaction {
            val roles =
                RoleEntity
                    .find { RolesTable.isDeleted eq false }
                    .map {
                        Role(
                            id = it.id.value.toString(),
                            role = it.role,
                            password = "********",
                            isAdmin = it.isAdmin,
                        )
                    }
            logger.info("Retrieved ${roles.size} roles")
            roles
        }

    fun getRoleById(id: String): Role? =
        transaction {
            val entity = RoleEntity.findById(UUID.fromString(id))
            if (entity == null || entity.isDeleted) {
                logger.warn("Role not found with ID: $id")
                null
            } else {
                Role(
                    id = entity.id.value.toString(),
                    role = entity.role,
                    isAdmin = entity.isAdmin,
                )
            }
        }

    fun updateRole(
        id: String?,
        role: Role,
    ): Boolean =
        transaction {
            if (id == null) return@transaction false
            if (role.role.isBlank()) return@transaction false
            if (roleNameExistsExcludingId(role.role, id)) {
                logger.error("Role name already exists: ${role.role}")
                return@transaction false
            }
            ensureRoleAdminInvariant(id, role.isAdmin ?: false)

            val entity = RoleEntity.findById(UUID.fromString(id))?.takeIf { !it.isDeleted }
            if (entity == null) {
                logger.error("Failed to update role: ${role.id}")
                false
            } else {
                entity.role = role.role
                entity.isAdmin = role.isAdmin ?: false
                if (role.password != null) {
                    val encryptedPin = SecurePinProcessor.hashPinForStorage(role.password.toCharArray(), id, env)
                    entity.password = SecurePinProcessor.byteArrayToBase64(encryptedPin)
                }
                logger.info("Role updated successfully: ${role.id}")
                true
            }
        }

    fun deleteRole(id: String): Boolean =
        transaction {
            ensureRoleDeletionKeepsAdmin(id)

            UsersTable.update({ UsersTable.roleId eq EntityID(UUID.fromString(id), RolesTable) }) {
                it[roleId] = null
            }

            val entity = RoleEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.error("Failed to delete role: $id")
                false
            } else {
                entity.role = "DELETED-$id"
                entity.isDeleted = true
                logger.info("Role soft-deleted successfully: $id")
                true
            }
        }

    private fun ensureRoleDeletionKeepsAdmin(roleId: String) {
        val currentIsAdmin = adminGuard.isRoleAdmin(roleId) ?: return
        if (!currentIsAdmin) return

        val adminsAssignedToRole = adminGuard.activeAdminUsersByRole(roleId)
        if (adminsAssignedToRole == 0L) return

        if (adminGuard.activeAdminUserCount() - adminsAssignedToRole <= 0) {
            throw LastAdminRemovalException()
        }
    }

    private fun ensureRoleAdminInvariant(
        roleId: String,
        targetIsAdmin: Boolean,
    ) {
        val currentIsAdmin = adminGuard.isRoleAdmin(roleId) ?: return
        if (!currentIsAdmin || targetIsAdmin) return

        val adminsAssignedToRole = adminGuard.activeAdminUsersByRole(roleId)
        if (adminsAssignedToRole == 0L) return

        if (adminGuard.activeAdminUserCount() - adminsAssignedToRole <= 0) {
            throw LastAdminRemovalException()
        }
    }
}
