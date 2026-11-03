package pos.ambrosia.utils

import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.header
import io.ktor.http.HttpHeaders
import io.ktor.server.application.ApplicationEnvironment
import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.applicationEnvironment
import io.ktor.server.testing.ApplicationTestBuilder
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.configureAuthentication
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.models.AuthResponse
import pos.ambrosia.services.PermissionsService
import pos.ambrosia.services.TokenService
import java.util.UUID

const val ADMIN_AUTH_TEST_SECRET = "admin-auth-test-fixture-secret"
private const val TEST_ISSUER = "admin-auth-test-fixture-issuer"
private const val TEST_AUDIENCE = "admin-auth-test-fixture-audience"
const val TEST_USER_PIN = "1234"

data class AuthCookies(
    val accessToken: String,
    val refreshToken: String,
)

fun testEnvironmentWithSecret(secret: String): ApplicationEnvironment =
    applicationEnvironment {
        config = MapApplicationConfig("secret" to secret)
    }

fun ApplicationTestBuilder.installAdminAuth(
    roleName: String = "admin-test-role",
    userName: String = "admin-test-user",
): AuthCookies = installAuth(roleName, userName, isAdmin = true)

fun ApplicationTestBuilder.installNonAdminAuth(
    roleName: String = "non-admin-test-role",
    userName: String = "non-admin-test-user",
): AuthCookies = installAuth(roleName, userName, isAdmin = false)

private fun ApplicationTestBuilder.installAuth(
    roleName: String,
    userName: String,
    isAdmin: Boolean,
): AuthCookies {
    val testApplicationConfig =
        MapApplicationConfig(
            "secret" to ADMIN_AUTH_TEST_SECRET,
            "jwt.issuer" to TEST_ISSUER,
            "jwt.audience" to TEST_AUDIENCE,
        )

    environment {
        config = testApplicationConfig
    }
    application {
        configureAuthentication()
    }

    val roleId = ExposedTestDb.seedRole(roleName, isAdmin = isAdmin)
    val userId = ExposedTestDb.seedUser(userName, roleId)

    val testEnvironment = applicationEnvironment { config = testApplicationConfig }
    transaction {
        UserEntity.findById(UUID.fromString(userId))?.pin =
            SecurePinProcessor.byteArrayToBase64(
                SecurePinProcessor.hashPinForStorage(TEST_USER_PIN.toCharArray(), userId, testEnvironment),
            )
    }

    val tokenService = TokenService(testEnvironment)
    val seededUser =
        AuthResponse(
            id = userId,
            name = userName,
            roleId = roleId,
            role = roleName,
            isAdmin = isAdmin,
        )

    return AuthCookies(
        accessToken = tokenService.generateAccessToken(seededUser),
        refreshToken = tokenService.generateRefreshToken(seededUser),
    )
}

fun HttpRequestBuilder.withAuthCookies(cookies: AuthCookies) {
    header(
        HttpHeaders.Cookie,
        "accessToken=${cookies.accessToken}; refreshToken=${cookies.refreshToken}",
    )
}

fun grantPermission(
    roleName: String,
    permission: String,
) = grantPermissions(roleName, permission)

fun grantPermissions(
    roleName: String,
    vararg permissions: String,
) {
    val roleId = ExposedTestDb.seedRole(roleName)
    permissions.forEach(ExposedTestDb::seedPermission)
    PermissionsService().replaceRolePermissions(roleId, permissions.toList())
}
