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
import pos.ambrosia.utils.InvalidTokenException
import java.sql.Connection
import java.util.concurrent.ConcurrentHashMap

private object LoginRateLimiter {
    private data class IpState(
        val failureCount: Int,
        val blockUntil: Long,
    )

    private val state = ConcurrentHashMap<String, IpState>()
    private const val FREE_ATTEMPTS = 5
    private const val MINUTE_MS = 60_000L

    // Precomputed Fibonacci sequence: FIB[n] = fib(n), 1-indexed (FIB[0] unused).
    // Applied in minutes after FREE_ATTEMPTS consecutive failures.
    // For failure counts beyond the array, the last entry (75_025 min ≈ 52 days) is reused.
    private val FIB =
        longArrayOf(
            0, // index 0 — unused
            1, // F1
            1, // F2
            2, // F3
            3, // F4
            5, // F5
            8, // F6
            13, // F7
            21, // F8
            34, // F9
            55, // F10
            89, // F11
            144, // F12
            233, // F13
            377, // F14
            610, // F15
            987, // F16
            1_597, // F17
            2_584, // F18
            4_181, // F19
            6_765, // F20
            10_946, // F21
            17_711, // F22
            28_657, // F23
            46_368, // F24
            75_025, // F25 ≈ 52 days
        )

    fun isBlocked(ip: String): Boolean {
        val s = state[ip] ?: return false
        return System.currentTimeMillis() < s.blockUntil
    }

    fun getRemainingSeconds(ip: String): Int {
        val s = state[ip] ?: return 0
        val remaining = s.blockUntil - System.currentTimeMillis()
        return if (remaining > 0) ((remaining + 999) / 1000).toInt() else 0
    }

    fun recordFailure(ip: String) {
        val now = System.currentTimeMillis()
        state.compute(ip) { _, existing ->
            val newCount = (existing?.failureCount ?: 0) + 1
            val fibIndex = newCount - FREE_ATTEMPTS
            val blockMs = if (fibIndex > 0) FIB.getOrElse(fibIndex) { FIB.last() } * MINUTE_MS else 0L
            IpState(newCount, now + blockMs)
        }
    }

    fun reset(ip: String) {
        state.remove(ip)
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
            val retryAfter = LoginRateLimiter.getRemainingSeconds(ip)
            call.response.headers.append("Retry-After", retryAfter.toString())
            call.respond(HttpStatusCode.TooManyRequests, mapOf("retryAfter" to retryAfter))
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
            val retryAfter = LoginRateLimiter.getRemainingSeconds(ip)
            if (retryAfter > 0) {
                call.response.headers.append("Retry-After", retryAfter.toString())
                call.respond(HttpStatusCode.TooManyRequests, mapOf("retryAfter" to retryAfter))
            } else {
                call.respond(HttpStatusCode.Unauthorized, Message("Invalid credentials"))
            }
            return@post
        }

        LoginRateLimiter.reset(ip)
        val accessTokenResponse = tokenService.generateAccessToken(userInfo)
        val refreshTokenResponse = tokenService.generateRefreshToken(userInfo)

        val perms = permissionsService.getByRole(userInfo.roleId) ?: emptyList()
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
