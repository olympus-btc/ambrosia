package pos.ambrosia.services

import io.ktor.server.application.ApplicationEnvironment
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.exceptions.ExposedSQLException
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.RoleEntity
import pos.ambrosia.db.tables.RolesTable
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.logger
import pos.ambrosia.models.UpdateUserRequest
import pos.ambrosia.models.User
import pos.ambrosia.utils.DuplicateUserNameException
import pos.ambrosia.utils.LastAdminRemovalException
import pos.ambrosia.utils.LastUserDeletionException
import pos.ambrosia.utils.SecurePinProcessor
import java.util.UUID

class UsersService(
    private val env: ApplicationEnvironment,
) {
    private val adminGuard = AdminGuardService()

    private fun findActiveRole(roleId: String): RoleEntity? =
        try {
            RoleEntity.findById(UUID.fromString(roleId))?.takeIf { !it.isDeleted }
        } catch (e: IllegalArgumentException) {
            null
        }

    private fun userNameExists(name: String): Boolean =
        !UsersTable
            .selectAll()
            .where { (UsersTable.name eq name) and (UsersTable.isDeleted eq false) }
            .empty()

    private fun activeUserCount(): Long = UsersTable.selectAll().where { UsersTable.isDeleted eq false }.count()

    private fun isDuplicateUserNameViolation(error: ExposedSQLException): Boolean =
        error.message?.contains("UNIQUE constraint failed: users.name", ignoreCase = true) == true

    fun addUser(user: User): String? =
        transaction {
            val role = user.role?.let { findActiveRole(it) }
            if (role == null) {
                logger.error("Role does not exist: ${user.role}")
                return@transaction null
            }

            if (user.name == "" || user.pin.isBlank()) {
                logger.error("User name and/or pin cannot be null or blank")
                return@transaction null
            }

            if (user.pin.length < 4) {
                logger.error("Pin must be at least 4 characters long")
                return@transaction null
            }

            if (userNameExists(user.name)) {
                throw DuplicateUserNameException()
            }

            val generatedId = UUID.randomUUID()
            val encryptedPin = SecurePinProcessor.hashPinForStorage(user.pin.toCharArray(), generatedId.toString(), env)

            try {
                UserEntity.new(generatedId) {
                    this.name = user.name
                    this.pin = SecurePinProcessor.byteArrayToBase64(encryptedPin)
                    this.refreshToken = user.refreshToken
                    this.roleId = role.id
                    this.email = user.email
                    this.phone = user.phone
                }
            } catch (e: ExposedSQLException) {
                if (isDuplicateUserNameViolation(e)) throw DuplicateUserNameException()
                throw e
            }

            logger.info("User created successfully with ID: $generatedId")
            generatedId.toString()
        }

    fun getUsers(): List<User> =
        transaction {
            (UsersTable leftJoin RolesTable)
                .selectAll()
                .where { UsersTable.isDeleted eq false }
                .map { row ->
                    User(
                        id = row[UsersTable.id].value.toString(),
                        name = row[UsersTable.name],
                        pin = "****",
                        refreshToken = "****",
                        role = row.getOrNull(RolesTable.role),
                        roleId = row[UsersTable.roleId]?.value?.toString(),
                        email = row[UsersTable.email],
                        phone = row[UsersTable.phone],
                    )
                }
        }

    fun getUserCount(): Long =
        transaction {
            activeUserCount()
        }

    fun getUserById(id: String): User? =
        transaction {
            val uuid =
                try {
                    UUID.fromString(id)
                } catch (e: IllegalArgumentException) {
                    return@transaction null
                }

            val user = UserEntity.findById(uuid)?.takeIf { !it.isDeleted } ?: return@transaction null
            val role = user.roleId?.let { RoleEntity.findById(it.value) }

            User(
                id = user.id.value.toString(),
                name = user.name,
                pin = "****",
                refreshToken = user.refreshToken,
                role = role?.role,
                isAdmin = role?.isAdmin ?: false,
                email = user.email,
                phone = user.phone,
            )
        }

    fun updateUser(
        id: String?,
        updatedUser: UpdateUserRequest,
    ): Boolean =
        transaction {
            if (id == null) return@transaction false

            val uuid =
                try {
                    UUID.fromString(id)
                } catch (e: IllegalArgumentException) {
                    return@transaction false
                }

            val entity = UserEntity.findById(uuid) ?: return@transaction false

            var hasUpdates = false

            updatedUser.name?.let {
                entity.name = it
                hasUpdates = true
            }

            updatedUser.pin?.takeIf { it.isNotBlank() }?.let { pin ->
                val encryptedPin = SecurePinProcessor.hashPinForStorage(pin.toCharArray(), id, env)
                entity.pin = SecurePinProcessor.byteArrayToBase64(encryptedPin)
                hasUpdates = true
            }

            updatedUser.refreshToken?.let {
                entity.refreshToken = it
                hasUpdates = true
            }

            updatedUser.roleId?.let { roleId ->
                val role = findActiveRole(roleId)
                if (role == null) {
                    logger.error("Role does not exist: $roleId")
                    return@transaction false
                }
                ensureUserRoleChangeKeepsAdmin(id, roleId)
                entity.roleId = role.id
                hasUpdates = true
            }

            updatedUser.email?.let {
                entity.email = it
                hasUpdates = true
            }

            updatedUser.phone?.let {
                entity.phone = it
                hasUpdates = true
            }

            if (!hasUpdates) {
                logger.info("No fields to update for user $id")
                return@transaction false
            }

            try {
                entity.flush()
            } catch (e: ExposedSQLException) {
                if (isDuplicateUserNameViolation(e)) throw DuplicateUserNameException()
                throw e
            }

            true
        }

    fun deleteUser(id: String): Boolean =
        transaction {
            if (activeUserCount() <= 1) {
                throw LastUserDeletionException()
            }
            ensureUserDeletionKeepsAdmin(id)

            val uuid =
                try {
                    UUID.fromString(id)
                } catch (e: IllegalArgumentException) {
                    return@transaction false
                }

            val entity = UserEntity.findById(uuid) ?: return@transaction false
            entity.isDeleted = true
            entity.name = deletedName(id)
            true
        }

    private fun deletedName(id: String): String = "DELETED-$id"

    private fun ensureUserRoleChangeKeepsAdmin(
        userId: String,
        targetRoleId: String,
    ) {
        val currentState = adminGuard.getUserAdminState(userId) ?: return
        if (!currentState.isAdmin) return
        if (currentState.roleId == targetRoleId) return

        val targetRoleIsAdmin = adminGuard.isRoleAdmin(targetRoleId) ?: return
        if (targetRoleIsAdmin) return

        if (adminGuard.activeAdminUserCount() <= 1) {
            throw LastAdminRemovalException()
        }
    }

    private fun ensureUserDeletionKeepsAdmin(userId: String) {
        val currentState = adminGuard.getUserAdminState(userId) ?: return
        if (!currentState.isAdmin) return

        if (adminGuard.activeAdminUserCount() <= 1) {
            throw LastAdminRemovalException()
        }
    }
}
