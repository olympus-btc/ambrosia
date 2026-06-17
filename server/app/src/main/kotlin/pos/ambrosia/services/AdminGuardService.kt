package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.RoleEntity
import pos.ambrosia.db.tables.RolesTable
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.db.tables.UsersTable
import java.util.UUID

data class UserAdminState(
    val roleId: String?,
    val isAdmin: Boolean,
)

class AdminGuardService {
    fun activeAdminUserCount(): Long =
        transaction {
            (UsersTable innerJoin RolesTable)
                .selectAll()
                .where {
                    (UsersTable.isDeleted eq false) and
                        (RolesTable.isDeleted eq false) and
                        (RolesTable.isAdmin eq true)
                }.count()
        }

    fun activeAdminUsersByRole(roleId: String): Long =
        transaction {
            val roleUUID =
                try {
                    UUID.fromString(roleId)
                } catch (_: IllegalArgumentException) {
                    return@transaction 0L
                }
            val roleEntityId = EntityID(roleUUID, RolesTable)
            (UsersTable innerJoin RolesTable)
                .selectAll()
                .where {
                    (UsersTable.isDeleted eq false) and
                        (RolesTable.isDeleted eq false) and
                        (RolesTable.isAdmin eq true) and
                        (UsersTable.roleId eq roleEntityId)
                }.count()
        }

    fun isRoleAdmin(roleId: String): Boolean? =
        transaction {
            val uuid =
                try {
                    UUID.fromString(roleId)
                } catch (_: IllegalArgumentException) {
                    return@transaction null
                }
            RoleEntity
                .findById(uuid)
                ?.takeIf { !it.isDeleted }
                ?.isAdmin
        }

    fun getUserAdminState(userId: String): UserAdminState? =
        transaction {
            val uuid =
                try {
                    UUID.fromString(userId)
                } catch (_: IllegalArgumentException) {
                    return@transaction null
                }
            val user =
                UserEntity
                    .findById(uuid)
                    ?.takeIf { !it.isDeleted }
                    ?: return@transaction null

            val role = user.roleId?.let { RoleEntity.findById(it.value) }
            val isAdmin = role?.takeIf { !it.isDeleted }?.isAdmin ?: false

            UserAdminState(
                roleId = user.roleId?.value?.toString(),
                isAdmin = isAdmin,
            )
        }
}
