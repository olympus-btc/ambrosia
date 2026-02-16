package pos.ambrosia.api

import com.auth0.jwt.*
import com.auth0.jwt.algorithms.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.origin
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.util.date.*
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.logger
import pos.ambrosia.models.AuthRequest
import pos.ambrosia.models.LoginResponse
import pos.ambrosia.models.Message
import pos.ambrosia.models.UserResponse
import pos.ambrosia.services.AuthService
import pos.ambrosia.services.PermissionsService
import pos.ambrosia.services.TokenService
import pos.ambrosia.utils.*
import java.sql.Connection
import java.util.*

fun Application.configureAuth() {
    val connection: Connection = DatabaseConnection.getConnection()
    val authService = AuthService(environment, connection)
    val tokenService = TokenService(environment, connection)
    val permissionsService = PermissionsService(environment, connection)
    routing { route("/auth") { auth(tokenService, authService, permissionsService) } }
}

fun Route.auth(
    tokenService: TokenService,
    authService: AuthService,
    permissionsService: PermissionsService,
) {
    post("/login") {
        val loginRequest = call.receive<AuthRequest>()
        val userInfo = authService.authenticateUser(loginRequest.name, loginRequest.pin.toCharArray())
        logger.info(userInfo?.toString() ?: "User not found")
        val isSecureRequest =
            call.request.origin.scheme == "https" ||
                call.request.header("X-Forwarded-Proto") == "https"

        if (userInfo == null) {
            throw InvalidCredentialsException()
        }
        val accessTokenResponse = tokenService.generateAccessToken(userInfo)
        val refreshTokenResponse = tokenService.generateRefreshToken(userInfo)

        val perms = permissionsService.getByRole(userInfo.role_id)
        if (perms.isEmpty()) {
            logger.info("The user doesn't have a permissions")
            call.respond(HttpStatusCode.Forbidden)
            return@post
        }

        call.response.cookies.append(
            Cookie(
                name = "accessToken",
                value = accessTokenResponse,
                expires = GMTDate(System.currentTimeMillis() + (60 * 1000L)),
                httpOnly = true,
                secure = isSecureRequest,
                path = "/",
            ),
        )

        call.response.cookies.append(
            Cookie(
                name = "refreshToken",
                value = refreshTokenResponse,
                maxAge = 30 * 24 * 60 * 60,
                httpOnly = true,
                secure = isSecureRequest,
                path = "/",
            ),
        )

        val userResponse =
            UserResponse(
                user_id = userInfo.id,
                name = userInfo.name,
                role = userInfo.role,
                role_id = userInfo.role_id,
                isAdmin = userInfo.isAdmin,
                email = userInfo.email,
                phone = userInfo.phone,
            )

        call.respond(LoginResponse("Login successful", userResponse, perms))
    }

    post("/refresh") {
        val refreshToken =
            call.request.cookies["refreshToken"]
                ?: throw InvalidTokenException("Refresh token is required")
        val isSecureRequest =
            call.request.origin.scheme == "https" ||
                call.request.header("X-Forwarded-Proto") == "https"

        logger.info("Refreshing token with: $refreshToken")

        val isValidRefreshToken = tokenService.validateRefreshToken(refreshToken)
        if (!isValidRefreshToken) {
            throw InvalidTokenException("Invalid refresh token")
        }

        val userInfo = tokenService.getUserFromRefreshToken(refreshToken)
        if (userInfo == null) {
            throw InvalidTokenException("Unable to extract user information from refresh token")
        }

        val newAccessToken = tokenService.generateAccessToken(userInfo)

        call.response.cookies.append(
            Cookie(
                name = "accessToken",
                value = newAccessToken,
                expires = GMTDate(System.currentTimeMillis() + (60 * 1000L)),
                httpOnly = true,
                secure = isSecureRequest,
                path = "/",
            ),
        )

        call.respond(
            mapOf(
                "message" to "Access token refreshed successfully",
                "accessToken" to newAccessToken,
            ),
        )
    }

    authenticate("auth-jwt") {
        post("/logout") {
            val principal = call.principal<JWTPrincipal>()
            val userId =
                principal?.getClaim("userId", String::class)
                    ?: throw InvalidTokenException("User ID not found in token")

            tokenService.revokeRefreshToken(userId)

            // Eliminar las cookies usando maxAge = 0
            call.response.cookies.append(
                Cookie(
                    name = "accessToken",
                    value = "",
                    maxAge = 0,
                    path = "/",
                ),
            )

            call.response.cookies.append(
                Cookie(
                    name = "refreshToken",
                    value = "",
                    maxAge = 0,
                    path = "/",
                ),
            )

            call.respond(Message("Logout successful"))
        }
    }
}
