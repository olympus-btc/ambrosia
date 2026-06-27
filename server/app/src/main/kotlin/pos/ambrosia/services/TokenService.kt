package pos.ambrosia.services

import com.auth0.jwt.JWT
import com.auth0.jwt.JWTVerifier
import com.auth0.jwt.algorithms.Algorithm
import com.auth0.jwt.exceptions.JWTVerificationException
import io.ktor.server.application.ApplicationEnvironment
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import pos.ambrosia.db.tables.RoleEntity
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.models.AuthResponse
import java.util.Date
import java.util.UUID
import java.util.concurrent.TimeUnit

class TokenService(
    environment: ApplicationEnvironment,
) {
    private val config = environment.config
    private val secret = config.property("secret").getString()
    private val issuer = config.property("jwt.issuer").getString()
    private val audience = config.property("jwt.audience").getString()
    private val algorithm = Algorithm.HMAC256(secret)

    val accessTokenExpirationSeconds: Long =
        try {
            config.property("jwt.accessTokenExpirationSeconds").getString().toLong()
        } catch (e: Exception) {
            60L
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
            .withClaim("userId", user.id)
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
                .withClaim("userId", user.id)
                .withClaim("type", "refresh")
                .withClaim("realm", "Ambrosia-Server")
                .withExpiresAt(Date(System.currentTimeMillis() + TimeUnit.DAYS.toMillis(30)))
                .sign(algorithm)

        saveRefreshTokenToDatabase(user.id, refreshToken)
        return refreshToken
    }

    fun generateWalletAccessToken(userId: String): String {
        val walletAccessToken =
            JWT
                .create()
                .withAudience(audience)
                .withIssuer(issuer)
                .withClaim("scope", "wallet_access")
                .withClaim("userId", userId)
                .withClaim("realm", "Ambrosia-Server")
                .withExpiresAt(Date(System.currentTimeMillis() + TimeUnit.MINUTES.toMillis(5)))
                .sign(algorithm)

        saveWalletTokenToDatabase(userId, walletAccessToken)
        return walletAccessToken
    }

    fun isWalletTokenValid(
        userId: String,
        walletAccessToken: String,
    ): Boolean =
        transaction {
            val uuid =
                try {
                    UUID.fromString(userId)
                } catch (_: IllegalArgumentException) {
                    return@transaction false
                }
            UserEntity.findById(uuid)?.walletToken == walletAccessToken
        }

    fun revokeWalletToken(userId: String) {
        transaction {
            val uuid =
                try {
                    UUID.fromString(userId)
                } catch (_: IllegalArgumentException) {
                    return@transaction
                }
            UserEntity.findById(uuid)?.walletToken = null
        }
    }

    fun validateRefreshToken(refreshToken: String): Boolean =
        try {
            val decodedJWT = verifier.verify(refreshToken)
            val tokenType = decodedJWT.getClaim("type")?.asString()
            val isStoredInDb = isRefreshTokenInDatabase(refreshToken)

            tokenType == "refresh" && !isTokenExpired(decodedJWT.expiresAt) && isStoredInDb
        } catch (e: JWTVerificationException) {
            false
        }

    fun getUserFromRefreshToken(refreshToken: String): AuthResponse? =
        try {
            verifier.verify(refreshToken)

            transaction {
                val user =
                    UserEntity
                        .find { (UsersTable.refreshToken eq refreshToken) and (UsersTable.isDeleted eq false) }
                        .firstOrNull()

                if (user == null) {
                    null
                } else {
                    val role = user.roleId?.let { RoleEntity.findById(it) }
                    AuthResponse(
                        id = user.id.value.toString(),
                        name = user.name,
                        roleId = user.roleId?.value?.toString(),
                        role = role?.role ?: "",
                        isAdmin = role?.isAdmin ?: false,
                        email = user.email,
                        phone = user.phone,
                    )
                }
            }
        } catch (e: JWTVerificationException) {
            null
        }

    fun revokeRefreshToken(userId: String) {
        transaction {
            UserEntity.findById(UUID.fromString(userId))?.refreshToken = null
        }
    }

    fun revokeAllRefreshTokens() {
        transaction {
            UsersTable.update { it[refreshToken] = null }
        }
    }

    private fun saveRefreshTokenToDatabase(
        userId: String,
        refreshToken: String,
    ) {
        transaction {
            UserEntity.findById(UUID.fromString(userId))?.refreshToken = refreshToken
        }
    }

    private fun saveWalletTokenToDatabase(
        userId: String,
        walletAccessToken: String,
    ) {
        transaction {
            val uuid =
                try {
                    UUID.fromString(userId)
                } catch (_: IllegalArgumentException) {
                    return@transaction
                }
            UserEntity.findById(uuid)?.walletToken = walletAccessToken
        }
    }

    private fun isRefreshTokenInDatabase(refreshToken: String): Boolean =
        transaction {
            UserEntity.find { UsersTable.refreshToken eq refreshToken }.any()
        }

    private fun isTokenExpired(expiresAt: Date): Boolean = expiresAt.before(Date())
}
