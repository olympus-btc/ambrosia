package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object RolesTable : SQLiteUUIDTable("roles") {
    val role = varchar("role", 255).uniqueIndex()
    val password = varchar("password", 255).nullable()
    val isAdmin = bool("isAdmin").default(false)
    val isDeleted = bool("is_deleted").default(false)
}

class RoleEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<RoleEntity>(RolesTable)

    var role by RolesTable.role
    var password by RolesTable.password
    var isAdmin by RolesTable.isAdmin
    var isDeleted by RolesTable.isDeleted
}

object PermissionsTable : SQLiteUUIDTable("permissions") {
    val name = varchar("name", 255).uniqueIndex()
    val description = text("description").nullable()
    val enabled = bool("enabled").default(true)
}

class PermissionEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<PermissionEntity>(PermissionsTable)

    var name by PermissionsTable.name
    var description by PermissionsTable.description
    var enabled by PermissionsTable.enabled
}

object RolePermissionsTable : Table("role_permissions") {
    val roleId = reference("role_id", RolesTable)
    val permissionId = reference("permission_id", PermissionsTable)
    override val primaryKey = PrimaryKey(roleId, permissionId)
}
