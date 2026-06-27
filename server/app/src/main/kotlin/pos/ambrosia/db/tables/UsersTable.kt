package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object UsersTable : SQLiteUUIDTable("users") {
    val name = varchar("name", 255).uniqueIndex()
    val pin = varchar("pin", 255)
    val refreshToken = varchar("refresh_token", 1000).nullable()
    val walletToken = varchar("wallet_token", 1000).nullable()
    val isDeleted = bool("is_deleted").default(false)
    val roleId = optReference("role_id", RolesTable)
    val email = varchar("email", 255).nullable()
    val phone = varchar("phone", 50).nullable()
}

class UserEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<UserEntity>(UsersTable)

    var name by UsersTable.name
    var pin by UsersTable.pin
    var refreshToken by UsersTable.refreshToken
    var walletToken by UsersTable.walletToken
    var isDeleted by UsersTable.isDeleted
    var roleId by UsersTable.roleId
    var email by UsersTable.email
    var phone by UsersTable.phone
}
