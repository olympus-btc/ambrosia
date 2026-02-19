package pos.ambrosia.services

import io.ktor.server.application.ApplicationEnvironment
import pos.ambrosia.logger
import pos.ambrosia.models.AuthResponse
import pos.ambrosia.utils.SecurePinProcessor
import java.sql.Connection

class AuthService(
    private val env: ApplicationEnvironment,
    private val connection: Connection,
) {
    companion object {
        private const val GET_USER_FOR_AUTH_BY_NAME =
            """
    SELECT u.id, u.name, u.pin, u.role_id as role_id, u.email, u.phone, r.role, r.isAdmin as isAdmin
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.name = ? AND u.is_deleted = 0
    """

        private const val GET_USER_AND_ROLE_FOR_AUTH_BY_USERID =
            """
    SELECT u.id, r.password as role_password, r.id as role_id
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ? AND u.is_deleted = 0
    """
    }

    fun authenticateUser(
        name: String,
        pin: CharArray,
    ): AuthResponse? {
        val statement = connection.prepareStatement(GET_USER_FOR_AUTH_BY_NAME)
        statement.setString(1, name)
        val resultSet = statement.executeQuery()
        if (resultSet.next()) {
            val userIdString = resultSet.getString("id")
            val storedPinHashBase64 = resultSet.getString("pin")
            logger.info("Authenticating user: $userIdString")
            val storedPinHash = SecurePinProcessor.base64ToByteArray(storedPinHashBase64)

            val isValidPin = SecurePinProcessor.verifyPin(pin, userIdString, storedPinHash, env)
            pin.fill('\u0000') // Limpiar PIN de memoria

            logger.info("Authentication result for user pin: $isValidPin")
            if (isValidPin) {
                return AuthResponse(
                    id = userIdString,
                    name = resultSet.getString("name"),
                    role = resultSet.getString("role"),
                    roleId = resultSet.getString("role_id"),
                    isAdmin = resultSet.getBoolean("isAdmin"),
                    email = resultSet.getString("email"),
                    phone = resultSet.getString("phone"),
                )
            }
        }
        return null
    }

    fun authenticateByRole(
        userId: String,
        rolePassword: CharArray,
    ): Boolean {
        val statement = connection.prepareStatement(GET_USER_AND_ROLE_FOR_AUTH_BY_USERID)
        statement.setString(1, userId)
        val resultSet = statement.executeQuery()

        if (resultSet.next()) {
            val roleId = resultSet.getString("role_id")
            val storedPasswordHashBase64 = resultSet.getString("role_password")
            val storedPasswordHash = SecurePinProcessor.base64ToByteArray(storedPasswordHashBase64)

            // The salt for role password is the role ID.
            val isValidPassword =
                SecurePinProcessor.verifyPin(rolePassword, roleId, storedPasswordHash, env)
            rolePassword.fill('\u0000') // Clear password from memory

            logger.info("Authentication result for role password: $isValidPassword")
            return isValidPassword
        }
        return false
    }
}
