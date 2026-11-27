package pos.ambrosia.utils

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.RoleEntity
import pos.ambrosia.db.tables.RolesTable
import java.util.UUID

object RolePasswordResetter {
    fun resetPassword(
        roleArg: String,
        newPassword: String,
        secret: String,
    ): String? =
        transaction {
            val entity = findActiveRole(roleArg) ?: return@transaction null
            entity.password =
                SecurePinProcessor.byteArrayToBase64(
                    SecurePinProcessor.hashPin(newPassword.toCharArray(), entity.id.value.toString(), secret),
                )
            entity.role
        }

    private fun findActiveRole(roleArg: String): RoleEntity? =
        RoleEntity
            .find { (RolesTable.role eq roleArg) and (RolesTable.isDeleted eq false) }
            .firstOrNull()
            ?: runCatching { UUID.fromString(roleArg) }
                .getOrNull()
                ?.let { RoleEntity.findById(it) }
                ?.takeIf { !it.isDeleted }
}
