package pos.ambrosia.api

import io.ktor.http.Cookie
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.plugins.origin
import io.ktor.server.request.header
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import io.ktor.util.date.GMTDate
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.logger
import pos.ambrosia.models.AuthRequest
import pos.ambrosia.models.LoginResponse
import pos.ambrosia.models.Message
import pos.ambrosia.models.UserResponse
import pos.ambrosia.services.AuthService
import pos.ambrosia.services.PermissionsService
import pos.ambrosia.services.TokenService
import pos.ambrosia.utils.InvalidCredentialsException
import pos.ambrosia.utils.InvalidTokenException
import java.sql.Connection
import java.util.concurrent.ConcurrentHashMap

private object LoginRateLimiter {
    private val failedAttempts = ConcurrentHashMap<String, Pair<Int, Long>>()
    private const val MAX_FAILURES = 5
    private val WINDOW_MS = 2 * 60 * 1000L

    fun isBlocked(ip: String): Boolean {
        val (count, since) = failedAttempts[ip] ?: return false
        return if (System.currentTimeMillis() - since >= WINDOW_MS) {
            failedAttempts.remove(ip)
            false
        } else {
            count >= MAX_FAILURES
        }
    }

    fun recordFailure(ip: String) {
        val now = System.currentTimeMillis()
        failedAttempts.compute(ip) { _, existing ->
            if (existing != null) {
                val (count, since) = existing
                if (now - since < WINDOW_MS) Pair(count + 1, since) else Pair(1, now)
            } else {
                Pair(1, now)
            }
        }
    }

    fun reset(ip: String) {
        failedAttempts.remove(ip)
    }
}

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
        val ip = call.request.origin.remoteAddress
        if (LoginRateLimiter.isBlocked(ip)) {
            call.respond(HttpStatusCode.TooManyRequests)
            return@post
        }

        val loginRequest = call.receive<AuthRequest>()
        val userInfo = authService.authenticateUser(loginRequest.name, loginRequest.pin.toCharArray())
        logger.info(userInfo?.toString() ?: "User not found")
        val isSecureRequest =
            call.request.origin.scheme == "https" ||
                call.request.header("X-Forwarded-Proto") == "https"

        if (userInfo == null) {
            LoginRateLimiter.recordFailure(ip)
            throw InvalidCredentialsException()
        }

        LoginRateLimiter.reset(ip)
        val accessTokenResponse = tokenService.generateAccessToken(userInfo)
        val refreshTokenResponse = tokenService.generateRefreshToken(userInfo)

        val perms = permissionsService.getByRole(userInfo.roleId)
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
                roleId = userInfo.roleId,
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
