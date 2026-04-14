package pos.ambrosia.utils

import io.ktor.server.application.ApplicationCall
import io.ktor.server.application.createRouteScopedPlugin
import io.ktor.server.auth.AuthenticationChecked
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.routing.Route
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.logger
import pos.ambrosia.services.TokenService
import java.sql.Connection

/** Extensión para verificar si el usuario actual es administrador */
fun ApplicationCall.requireAdmin() {
    // Obtener el refreshToken desde la cookie
    val refreshToken = request.cookies["refreshToken"]

    if (refreshToken.isNullOrBlank()) {
        logger.warn("Admin check failed: missing refreshToken cookie")
        throw AdminOnlyException()
    }

    // Consultar la BD para obtener isAdmin usando el refreshToken registrado
    val connection: Connection = DatabaseConnection.getConnection()
    val tokenService = TokenService(application.environment, connection)
    val userFromToken = tokenService.getUserFromRefreshToken(refreshToken)
    val isAdmin = userFromToken?.isAdmin == true

    if (!isAdmin) {
        logger.warn("Non-admin user attempted to access admin-only endpoint")
        throw AdminOnlyException()
    }
}

/** Extensión para obtener información del usuario actual desde el JWT */
fun ApplicationCall.getCurrentUser(): UserInfo? {
    val principal = principal<JWTPrincipal>() ?: return null

    return UserInfo(
        userId = principal.getClaim("userId", String::class) ?: return null,
        role = principal.getClaim("role", String::class) ?: return null,
        isAdmin = principal.getClaim("isAdmin", Boolean::class) ?: false,
    )
}

suspend fun ApplicationCall.requireWallet() {
    // Verificar que la cookie walletAccessToken esté presente
    val walletToken = request.cookies["walletAccessToken"]
    if (walletToken == null) {
        logger.warn("Wallet access attempted without walletAccessToken cookie")
        throw WalletOnlyException()
    }

    // Verificar que el principal tenga el scope correcto
    val principal = principal<JWTPrincipal>()
    val scope = principal?.getClaim("scope", String::class)

    if (scope != "wallet_access") {
        logger.warn("Wallet access attempted with invalid scope: $scope")
        throw WalletOnlyException()
    }

    logger.info("Wallet access granted successfully")
}

/**
 * Plugin de Ktor para verificar los privilegios de administrador. Este plugin se asegura de que
 * solo los administradores puedan acceder a una ruta. Se debe usar dentro de un bloque
 * `authenticate`.
 */
val AdminAccess =
    createRouteScopedPlugin(name = "AdminAccess") {
        on(AuthenticationChecked) { call -> call.requireAdmin() }
    }

/**
 * Función de extensión para crear rutas que requieren autenticación y privilegios de administrador
 */
fun Route.authenticateAdmin(
    name: String = "auth-jwt",
    build: Route.() -> Unit,
): Route =
    authenticate(name) {
        install(AdminAccess)
        build()
    }

/** Data class para representar información básica del usuario */
data class UserInfo(
    val userId: String,
    val role: String,
    val isAdmin: Boolean,
)

suspend fun ApplicationCall.requirePermission(name: String) {
    val principal = principal<JWTPrincipal>() ?: throw PermissionDeniedException()
    val userId = principal.getClaim("userId", String::class) ?: throw PermissionDeniedException()
    val sql =
        """
  SELECT 1
  FROM users u
  JOIN roles r ON u.role_id = r.id
  JOIN role_permissions rp ON rp.role_id = r.id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE u.id = ? AND p.name = ? AND p.enabled = 1 AND u.is_deleted = 0
  """
    val connection: Connection = DatabaseConnection.getConnection()
    connection.prepareStatement(sql).use { st ->
        st.setString(1, userId)
        st.setString(2, name)
        val rs = st.executeQuery()
        if (!rs.next()) throw PermissionDeniedException()
    }
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
