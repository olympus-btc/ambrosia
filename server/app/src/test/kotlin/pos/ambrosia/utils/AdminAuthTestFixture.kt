package pos.ambrosia.utils

import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.header
import io.ktor.http.HttpHeaders
import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.applicationEnvironment
import io.ktor.server.testing.ApplicationTestBuilder
import pos.ambrosia.configureAuthentication
import pos.ambrosia.models.AuthResponse
import pos.ambrosia.services.PermissionsService
import pos.ambrosia.services.TokenService

private const val TEST_SECRET = "admin-auth-test-fixture-secret"
private const val TEST_ISSUER = "admin-auth-test-fixture-issuer"
private const val TEST_AUDIENCE = "admin-auth-test-fixture-audience"

data class AuthCookies(
    val accessToken: String,
    val refreshToken: String,
)

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
            "secret" to TEST_SECRET,
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

    val tokenService = TokenService(applicationEnvironment { config = testApplicationConfig })
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
) {
    val roleId = ExposedTestDb.seedRole(roleName)
    ExposedTestDb.seedPermission(permission)
    PermissionsService().replaceRolePermissions(roleId, listOf(permission))
}
