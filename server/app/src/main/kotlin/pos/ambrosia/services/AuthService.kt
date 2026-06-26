package pos.ambrosia.services

import io.ktor.server.application.ApplicationEnvironment
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.RoleEntity
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.models.AuthResponse
import pos.ambrosia.utils.MissingRoleException
import pos.ambrosia.utils.SecurePinProcessor
import java.util.UUID

class AuthService(
    private val env: ApplicationEnvironment,
) {
    fun authenticateUser(
        name: String,
        pin: CharArray,
    ): AuthResponse? =
        transaction {
            val user =
                UserEntity
                    .find { (UsersTable.name eq name) and (UsersTable.isDeleted eq false) }
                    .firstOrNull() ?: return@transaction null

            val userId = user.id.value.toString()
            val isValidPin =
                SecurePinProcessor.verifyPin(
                    pin,
                    userId,
                    SecurePinProcessor.base64ToByteArray(user.pin),
                    env,
                )
            pin.fill('\u0000')

            if (!isValidPin) return@transaction null

            val role =
                user.roleId
                    ?.let { RoleEntity.findById(it.value) }
                    ?.takeIf { !it.isDeleted }
                    ?: throw MissingRoleException()

            AuthResponse(
                id = userId,
                name = user.name,
                role = role.role,
                roleId = role.id.value.toString(),
                isAdmin = role.isAdmin,
                email = user.email,
                phone = user.phone,
            )
        }

    fun authenticateByRole(
        userId: String,
        rolePassword: CharArray,
    ): Boolean =
        transaction {
            val user =
                UserEntity
                    .findById(UUID.fromString(userId))
                    ?.takeIf { !it.isDeleted }
                    ?: return@transaction false

            val role =
                user.roleId
                    ?.let { RoleEntity.findById(it.value) }
                    ?: return@transaction false

            val storedHash =
                SecurePinProcessor.base64ToByteArray(
                    role.password ?: return@transaction false,
                )

            val isValid =
                SecurePinProcessor.verifyPin(
                    rolePassword,
                    role.id.value.toString(),
                    storedHash,
                    env,
                )
            rolePassword.fill('\u0000')
            isValid
        }
}
