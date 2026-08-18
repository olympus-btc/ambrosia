package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insertIgnore
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.PermissionEntity
import pos.ambrosia.db.tables.PermissionsTable
import pos.ambrosia.db.tables.RoleEntity
import pos.ambrosia.db.tables.RolePermissionsTable
import pos.ambrosia.db.tables.RolesTable
import pos.ambrosia.logger
import pos.ambrosia.models.Permission
import pos.ambrosia.utils.AdminOnlyPermissions
import java.util.UUID

class PermissionsService {
    private fun toModel(entity: PermissionEntity): Permission =
        Permission(
            id = entity.id.value.toString(),
            name = entity.name,
            description = entity.description,
            enabled = entity.enabled,
            adminOnly = AdminOnlyPermissions.contains(entity.name),
        )

    private fun enabledPermissionIds() = PermissionEntity.find { PermissionsTable.enabled eq true }.map { it.id }

    fun getAll(): List<Permission> =
        transaction {
            PermissionEntity
                .all()
                .orderBy(PermissionsTable.name to SortOrder.ASC)
                .map { toModel(it) }
        }

    fun getByRole(roleId: String?): List<Permission>? =
        transaction {
            if (roleId == null) return@transaction null
            val roleUUID =
                try {
                    UUID.fromString(roleId)
                } catch (_: IllegalArgumentException) {
                    return@transaction null
                }
            if (RoleEntity.findById(roleUUID)?.takeIf { !it.isDeleted } == null) return@transaction null
            val roleEntityId = EntityID(roleUUID, RolesTable)
            (RolePermissionsTable innerJoin PermissionsTable)
                .selectAll()
                .where { RolePermissionsTable.roleId eq roleEntityId }
                .orderBy(PermissionsTable.name to SortOrder.ASC)
                .map {
                    Permission(
                        id = it[PermissionsTable.id].value.toString(),
                        name = it[PermissionsTable.name],
                        description = it[PermissionsTable.description],
                        enabled = it[PermissionsTable.enabled],
                        adminOnly = AdminOnlyPermissions.contains(it[PermissionsTable.name]),
                    )
                }
        }

    fun roleExists(roleId: String): Boolean =
        transaction {
            RoleEntity.findById(UUID.fromString(roleId))?.isDeleted == false
        }

    fun replaceRolePermissions(
        roleId: String,
        permissionKeys: List<String>,
    ): Int = transaction { replaceRolePermissionsInCurrentTransaction(roleId, permissionKeys) }

    internal fun replaceRolePermissionsInCurrentTransaction(
        roleId: String,
        permissionKeys: List<String>,
    ): Int {
        val roleUUID =
            try {
                UUID.fromString(roleId)
            } catch (_: IllegalArgumentException) {
                return 0
            }
        val roleEntityId = EntityID(roleUUID, RolesTable)
        val role = RoleEntity.findById(roleUUID)?.takeIf { !it.isDeleted } ?: return 0

        RolePermissionsTable.deleteWhere { RolePermissionsTable.roleId eq roleEntityId }

        if (!role.isAdmin && permissionKeys.isEmpty()) return 0

        val allowedPermissionKeys =
            if (role.isAdmin) permissionKeys else permissionKeys.filterNot(AdminOnlyPermissions::contains)
        if (!role.isAdmin && allowedPermissionKeys.isEmpty()) return 0

        val permissionIds =
            if (role.isAdmin) {
                enabledPermissionIds()
            } else {
                PermissionEntity
                    .find { (PermissionsTable.name inList allowedPermissionKeys) and (PermissionsTable.enabled eq true) }
                    .map { it.id }
            }

        return permissionIds.sumOf { permissionId ->
            RolePermissionsTable
                .insertIgnore {
                    it[RolePermissionsTable.roleId] = roleEntityId
                    it[RolePermissionsTable.permissionId] = permissionId
                }.insertedCount
        }
    }

    fun assignAllEnabledToRole(roleId: String): Int =
        transaction {
            val roleUUID =
                try {
                    UUID.fromString(roleId)
                } catch (_: IllegalArgumentException) {
                    return@transaction 0
                }
            val roleEntityId = EntityID(roleUUID, RolesTable)
            if (RoleEntity.findById(roleUUID)?.takeIf { !it.isDeleted } == null) return@transaction 0

            enabledPermissionIds().sumOf { permissionId ->
                RolePermissionsTable
                    .insertIgnore {
                        it[RolePermissionsTable.roleId] = roleEntityId
                        it[RolePermissionsTable.permissionId] = permissionId
                    }.insertedCount
            }
        }
}
