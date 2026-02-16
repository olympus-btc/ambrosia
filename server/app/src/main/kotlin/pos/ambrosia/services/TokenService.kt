package pos.ambrosia.services

import com.auth0.jwt.JWT
import com.auth0.jwt.JWTVerifier
import com.auth0.jwt.algorithms.Algorithm
import com.auth0.jwt.exceptions.JWTVerificationException
import io.ktor.server.application.ApplicationEnvironment
import pos.ambrosia.models.AuthResponse
import java.sql.Connection
import java.util.Date
import java.util.concurrent.TimeUnit

class TokenService(
    environment: ApplicationEnvironment,
    private val connection: Connection,
) {
    private val config = environment.config
    private val secret = config.property("secret").getString()
    private val issuer = config.property("jwt.issuer").getString()
    private val audience = config.property("jwt.audience").getString()
    private val algorithm = Algorithm.HMAC256(secret)

    // Access token expiration in seconds (configurable via --jwt-access-token-expiration, default: 60)
    val accessTokenExpirationSeconds: Long =
        try {
            config.property("jwt.accessTokenExpirationSeconds").getString().toLong()
        } catch (e: Exception) {
            60L // Default to 60 seconds if not configured
        }

    val verifier: JWTVerifier =
        JWT
            .require(algorithm)
            .withAudience(audience)
            .withIssuer(issuer)
            .build()

    fun generateAccessToken(user: AuthResponse): String =
        JWT
            .create()
            .withAudience(audience)
            .withIssuer(issuer)
            .withClaim("userId", user.id.toString())
            .withClaim("role", user.role)
            .withClaim("isAdmin", user.isAdmin)
            .withClaim("realm", "Ambrosia-Server")
            .withExpiresAt(Date(System.currentTimeMillis() + TimeUnit.SECONDS.toMillis(accessTokenExpirationSeconds)))
            .sign(algorithm)

    fun generateRefreshToken(user: AuthResponse): String {
        val refreshToken =
            JWT
                .create()
                .withAudience(audience)
                .withIssuer(issuer)
                .withClaim("userId", user.id.toString())
                .withClaim("type", "refresh")
                .withClaim("realm", "Ambrosia-Server")
                .withExpiresAt(Date(System.currentTimeMillis() + TimeUnit.DAYS.toMillis(30)))
                .sign(algorithm)

        // Almacenar el refresh token en la base de datos
        user.id.let { saveRefreshTokenToDatabase(it, refreshToken) }
        return refreshToken
    }

    fun generateWalletAccessToken(userId: String): String =
        JWT
            .create()
            .withAudience(audience)
            .withIssuer(issuer)
            .withClaim("scope", "wallet_access")
            .withClaim("userId", userId)
            .withClaim("realm", "Ambrosia-Server")
            .withExpiresAt(Date(System.currentTimeMillis() + TimeUnit.HOURS.toMillis(8)))
            .sign(algorithm)

    fun validateRefreshToken(refreshToken: String): Boolean =
        try {
            val decodedJWT = verifier.verify(refreshToken)
            val tokenType = decodedJWT.getClaim("type")?.asString()

            // Verificar que el token existe en la base de datos, sin confiar en claims de usuario
            val isStoredInDb = isRefreshTokenInDatabase(refreshToken)

            tokenType == "refresh" && !isTokenExpired(decodedJWT.expiresAt) && isStoredInDb
        } catch (e: JWTVerificationException) {
            false
        }

    fun getUserFromRefreshToken(refreshToken: String): AuthResponse? {
        return try {
            // Verificar firma/expiración sin depender de claims de usuario
            verifier.verify(refreshToken)

            // Obtener la información del usuario desde la base de datos usando el refresh token
            val sql =
                """
      SELECT u.id, u.name, r.role, r.isAdmin, u.role_id, u.email, u.phone
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.refresh_token = ? AND u.is_deleted = 0
      """

            connection.prepareStatement(sql).use { statement ->
                statement.setString(1, refreshToken)
                val resultSet = statement.executeQuery()

                if (resultSet.next()) {
                    return AuthResponse(
                        id = resultSet.getString("id"),
                        name = resultSet.getString("name"),
                        roleId = resultSet.getString("role_id"),
                        role = resultSet.getString("role"),
                        isAdmin = resultSet.getBoolean("isAdmin"),
                        email = resultSet.getString("email"),
                        phone = resultSet.getString("phone"),
                    )
                }
            }
            null
        } catch (e: JWTVerificationException) {
            null
        }
    }

    fun revokeRefreshToken(userId: String) {
        val sql = "UPDATE users SET refresh_token = NULL WHERE id = ?"
        connection.prepareStatement(sql).use { statement ->
            statement.setString(1, userId)
            statement.executeUpdate()
        }
    }

    fun revokeAllRefreshTokens() {
        val sql = "UPDATE users SET refresh_token = NULL"
        connection.prepareStatement(sql).use { statement -> statement.executeUpdate() }
    }

    private fun saveRefreshTokenToDatabase(
        userId: String,
        refreshToken: String,
    ) {
        val sql = "UPDATE users SET refresh_token = ? WHERE id = ?"
        connection.prepareStatement(sql).use { statement ->
            statement.setString(1, refreshToken)
            statement.setString(2, userId)
            statement.executeUpdate()
        }
    }

    private fun isRefreshTokenInDatabase(refreshToken: String): Boolean {
        val sql = "SELECT 1 FROM users WHERE refresh_token = ?"
        connection.prepareStatement(sql).use { statement ->
            statement.setString(1, refreshToken)
            val resultSet = statement.executeQuery()
            return resultSet.next()
        }
    }

    private fun isTokenExpired(expiresAt: Date): Boolean = expiresAt.before(Date())
}
