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

internal const val TEST_SECRET = "admin-auth-test-fixture-secret"
internal const val TEST_ISSUER = "admin-auth-test-fixture-issuer"
internal const val TEST_AUDIENCE = "admin-auth-test-fixture-audience"

data class AuthCookies(
    val accessToken: String,
    val refreshToken: String,
    val walletAccessToken: String? = null,
    val userId: String = "",
    val roleId: String = "",
)

fun ApplicationTestBuilder.installAdminAuth(
    roleName: String = "admin-test-role",
    userName: String = "admin-test-user",
): AuthCookies = installAuth(roleName, userName, isAdmin = true)

fun ApplicationTestBuilder.installNonAdminAuth(
    roleName: String = "non-admin-test-role",
    userName: String = "non-admin-test-user",
): AuthCookies = installAuth(roleName, userName, isAdmin = false)

fun ApplicationTestBuilder.installWalletAuth(
    roleName: String = "wallet-test-role",
    userName: String = "wallet-test-user",
    rolePassword: String = "wallet-password",
): AuthCookies {
    val cookies = installAuth(roleName, userName, isAdmin = true)
    setRolePassword(cookies.roleId, rolePassword)
    val walletAccessToken = tokenService().generateWalletAccessToken(cookies.userId)
    return cookies.copy(walletAccessToken = walletAccessToken)
}

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
        userId = userId,
        roleId = roleId,
    )
}

internal fun tokenService(): TokenService = TokenService(testEnvironment())

fun HttpRequestBuilder.withAuthCookies(cookies: AuthCookies) {
    val walletCookie = cookies.walletAccessToken?.let { "; walletAccessToken=$it" } ?: ""
    header(
        HttpHeaders.Cookie,
        "accessToken=${cookies.accessToken}; refreshToken=${cookies.refreshToken}$walletCookie",
    )
}

fun HttpRequestBuilder.withAccessTokenOnly(cookies: AuthCookies) {
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
