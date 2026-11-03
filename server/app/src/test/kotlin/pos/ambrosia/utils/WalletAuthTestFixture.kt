package pos.ambrosia.utils

import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.header
import io.ktor.http.HttpHeaders
import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.applicationEnvironment
import io.ktor.server.testing.ApplicationTestBuilder
import pos.ambrosia.configureAuthentication
import pos.ambrosia.models.AuthResponse
import pos.ambrosia.services.TokenService

private const val TEST_SECRET = "wallet-auth-test-fixture-secret"
private const val TEST_ISSUER = "wallet-auth-test-fixture-issuer"
private const val TEST_AUDIENCE = "wallet-auth-test-fixture-audience"

data class WalletAndRegularAuth(
    val walletAccessToken: String,
    val regularAccessToken: String,
)

private fun ApplicationTestBuilder.installWalletTestAuthentication(userName: String): Pair<String, TokenService> {
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

    val userId = ExposedTestDb.seedUser(userName)
    val tokenService = TokenService(applicationEnvironment { config = testApplicationConfig })
    return userId to tokenService
}

fun ApplicationTestBuilder.installWalletAuth(userName: String = "wallet-auth-test-user"): String {
    val (userId, tokenService) = installWalletTestAuthentication(userName)
    return tokenService.generateWalletAccessToken(userId)
}

fun ApplicationTestBuilder.installWalletAuthWithRegularSession(userName: String = "wallet-auth-test-user"): WalletAndRegularAuth {
    val (userId, tokenService) = installWalletTestAuthentication(userName)
    val walletAccessToken = tokenService.generateWalletAccessToken(userId)
    val regularAccessToken =
        tokenService.generateAccessToken(
            AuthResponse(id = userId, name = userName, role = "regular-session-test-role", isAdmin = false),
        )
    return WalletAndRegularAuth(walletAccessToken, regularAccessToken)
}

fun HttpRequestBuilder.withWalletAuthCookie(walletAccessToken: String) {
    header(HttpHeaders.Cookie, "walletAccessToken=$walletAccessToken")
}

fun HttpRequestBuilder.withRegularAuthCookie(regularAccessToken: String) {
    header(HttpHeaders.Cookie, "accessToken=$regularAccessToken")
}
