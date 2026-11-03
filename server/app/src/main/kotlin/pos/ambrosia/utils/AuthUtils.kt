package pos.ambrosia.utils

import io.ktor.server.application.ApplicationCall
import io.ktor.server.application.createRouteScopedPlugin
import io.ktor.server.auth.AuthenticationChecked
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.routing.Route
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.PermissionsTable
import pos.ambrosia.db.tables.RolePermissionsTable
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.logger
import pos.ambrosia.services.AuthService
import pos.ambrosia.services.TokenService
import java.util.UUID

fun ApplicationCall.requireAdmin() {
    val refreshToken = request.cookies["refreshToken"]

    if (refreshToken.isNullOrBlank()) {
        logger.warn("Admin check failed: missing refreshToken cookie")
        throw AdminOnlyException()
    }

    val tokenService = TokenService(application.environment)
    val userFromToken = tokenService.getUserFromRefreshToken(refreshToken)
    val isAdmin = userFromToken?.isAdmin == true

    if (!isAdmin) {
        logger.warn("Non-admin user attempted to access admin-only endpoint")
        throw AdminOnlyException()
    }
}

fun ApplicationCall.getCurrentUser(): UserInfo? {
    val principal = principal<JWTPrincipal>() ?: return null

    return UserInfo(
        userId = principal.getClaim("userId", String::class) ?: return null,
        role = principal.getClaim("role", String::class) ?: return null,
        isAdmin = principal.getClaim("isAdmin", Boolean::class) ?: false,
    )
}

suspend fun ApplicationCall.requireCurrentUserPin(currentUserPin: String?) {
    if (currentUserPin.isNullOrBlank()) throw InvalidCurrentUserPinException("Current PIN is required")
    val currentUserId = getCurrentUser()?.userId ?: throw InvalidCredentialsException()
    val authService = AuthService(application.environment)
    val isValidPin = authService.authenticateUserPin(currentUserId, currentUserPin.toCharArray())
    if (!isValidPin) throw InvalidCurrentUserPinException("Current PIN is incorrect")
}

suspend fun ApplicationCall.requireWallet() {
    val walletToken = request.cookies["walletAccessToken"]
    if (walletToken == null) {
        logger.warn("Wallet access attempted without walletAccessToken cookie")
        throw WalletOnlyException()
    }

    val principal = principal<JWTPrincipal>()
    val scope = principal?.getClaim("scope", String::class)

    if (scope != "wallet_access") {
        logger.warn("Wallet access attempted with invalid scope: $scope")
        throw WalletOnlyException()
    }

    logger.info("Wallet access granted successfully")
}

val AdminAccess =
    createRouteScopedPlugin(name = "AdminAccess") {
        on(AuthenticationChecked) { call -> call.requireAdmin() }
    }

fun Route.authenticateAdmin(
    name: String = "auth-jwt",
    build: Route.() -> Unit,
): Route =
    authenticate(name) {
        install(AdminAccess)
        build()
    }

data class UserInfo(
    val userId: String,
    val role: String,
    val isAdmin: Boolean,
)

fun ApplicationCall.hasPermission(name: String): Boolean {
    val jwtPrincipal = principal<JWTPrincipal>() ?: return false
    val userId = jwtPrincipal.getClaim("userId", String::class) ?: return false
    return transaction {
        val user =
            UserEntity.findById(UUID.fromString(userId))?.takeIf { !it.isDeleted }
                ?: return@transaction false
        val roleId = user.roleId ?: return@transaction false
        (RolePermissionsTable innerJoin PermissionsTable)
            .selectAll()
            .where {
                (RolePermissionsTable.roleId eq roleId) and
                    (PermissionsTable.name eq name) and
                    (PermissionsTable.enabled eq true)
            }.count() > 0
    }
}

fun ApplicationCall.requirePermission(name: String) {
    if (!hasPermission(name)) throw PermissionDeniedException()
}

fun Route.authorizePermission(
    key: String,
    name: String = "auth-jwt",
    build: Route.() -> Unit,
): Route =
    authenticate(name) {
        install(RequirePermission) { this.key = key }
        build()
    }

fun Route.authorizeAdminPermission(
    key: String,
    name: String = "auth-jwt",
    build: Route.() -> Unit,
): Route =
    authenticate(name) {
        install(RequirePermission) { this.key = key }
        install(AdminAccess)
        build()
    }

class PermissionPluginConfig {
    lateinit var key: String
}

val RequirePermission =
    createRouteScopedPlugin(
        name = "RequirePermission",
        createConfiguration = ::PermissionPluginConfig,
    ) {
        val permissionKey = pluginConfig.key
        on(AuthenticationChecked) { call -> call.requirePermission(permissionKey) }
    }
