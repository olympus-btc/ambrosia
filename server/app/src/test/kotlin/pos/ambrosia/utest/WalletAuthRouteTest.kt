package pos.ambrosia.utest

import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.applicationEnvironment
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.handler
import pos.ambrosia.api.wallet
import pos.ambrosia.configureAuthentication
import pos.ambrosia.models.AuthResponse
import pos.ambrosia.services.ActiveLightningBackend
import pos.ambrosia.services.AuthService
import pos.ambrosia.services.PaymentService
import pos.ambrosia.services.RefundService
import pos.ambrosia.services.RolesService
import pos.ambrosia.services.TokenService
import pos.ambrosia.services.WalletAdminNotificationService
import pos.ambrosia.services.WalletRateService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.installAdminAuth
import pos.ambrosia.utils.withAuthCookies
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

private fun Application.installTestWalletRoutes() {
    routing {
        route("/wallet") {
            wallet(
                TokenService(environment),
                AuthService(environment),
                RolesService(environment),
                PaymentService(),
                WalletRateService(),
                RefundService(ActiveLightningBackend),
                WalletAdminNotificationService(),
            )
        }
    }
}

class WalletAuthRouteTest {
    private lateinit var databaseFile: File

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    @Test
    fun `wallet auth rejects the wrong role password without locking out on a single failure`() =
        testApplication {
            val authCookies = installAdminAuth()
            application {
                install(ContentNegotiation) { json() }
                handler()
                installTestWalletRoutes()
            }

            val walletAuthResponse =
                client.post("/wallet/auth") {
                    withAuthCookies(authCookies)
                    contentType(ContentType.Application.Json)
                    setBody("""{"password":"wrong-role-password"}""")
                }

            assertEquals(HttpStatusCode.Unauthorized, walletAuthResponse.status)
        }

    @Test
    fun `wallet auth locks out after six consecutive wrong passwords`() =
        testApplication {
            val authCookies = installAdminAuth()
            application {
                install(ContentNegotiation) { json() }
                handler()
                installTestWalletRoutes()
            }

            repeat(5) {
                client.post("/wallet/auth") {
                    withAuthCookies(authCookies)
                    contentType(ContentType.Application.Json)
                    setBody("""{"password":"wrong-role-password"}""")
                }
            }
            val sixthAttemptResponse =
                client.post("/wallet/auth") {
                    withAuthCookies(authCookies)
                    contentType(ContentType.Application.Json)
                    setBody("""{"password":"wrong-role-password"}""")
                }

            assertEquals(HttpStatusCode.TooManyRequests, sixthAttemptResponse.status)
        }

    @Test
    fun `wallet auth lockout is per account, not shared across accounts`() =
        testApplication {
            val testApplicationConfig =
                MapApplicationConfig(
                    "secret" to "per-account-lockout-test-secret",
                    "jwt.issuer" to "per-account-lockout-test-issuer",
                    "jwt.audience" to "per-account-lockout-test-audience",
                )
            environment { config = testApplicationConfig }

            val lockedOutRoleId = ExposedTestDb.seedRole("locked-out-admin-role", isAdmin = true)
            val lockedOutUserId = ExposedTestDb.seedUser("locked-out-admin-user", lockedOutRoleId)
            val otherRoleId = ExposedTestDb.seedRole("other-admin-role", isAdmin = true)
            val otherUserId = ExposedTestDb.seedUser("other-admin-user", otherRoleId)

            application {
                install(ContentNegotiation) { json() }
                configureAuthentication()
                handler()
                installTestWalletRoutes()
            }

            val tokenService = TokenService(applicationEnvironment { config = testApplicationConfig })
            val lockedOutAdminCookies =
                tokenService.adminSessionCookies(
                    lockedOutUserId,
                    "locked-out-admin-user",
                    lockedOutRoleId,
                    "locked-out-admin-role",
                )
            val otherAdminCookies =
                tokenService.adminSessionCookies(otherUserId, "other-admin-user", otherRoleId, "other-admin-role")

            repeat(6) {
                client.post("/wallet/auth") {
                    header(HttpHeaders.Cookie, lockedOutAdminCookies)
                    contentType(ContentType.Application.Json)
                    setBody("""{"password":"wrong-role-password"}""")
                }
            }
            val otherAccountResponse =
                client.post("/wallet/auth") {
                    header(HttpHeaders.Cookie, otherAdminCookies)
                    contentType(ContentType.Application.Json)
                    setBody("""{"password":"wrong-role-password"}""")
                }

            assertEquals(HttpStatusCode.Unauthorized, otherAccountResponse.status)
        }

    @Test
    fun `wallet auth and wallet password share the same lockout for the same account`() =
        testApplication {
            val testApplicationConfig =
                MapApplicationConfig(
                    "secret" to "shared-lockout-test-secret",
                    "jwt.issuer" to "shared-lockout-test-issuer",
                    "jwt.audience" to "shared-lockout-test-audience",
                )
            environment { config = testApplicationConfig }

            val roleId = ExposedTestDb.seedRole("shared-lockout-role", isAdmin = true)
            val userId = ExposedTestDb.seedUser("shared-lockout-user", roleId)

            application {
                install(ContentNegotiation) { json() }
                configureAuthentication()
                handler()
                installTestWalletRoutes()
            }

            val tokenService = TokenService(applicationEnvironment { config = testApplicationConfig })
            val adminCookies =
                tokenService.adminSessionCookies(userId, "shared-lockout-user", roleId, "shared-lockout-role")
            val walletAccessToken = tokenService.generateWalletAccessToken(userId)

            repeat(6) {
                client.post("/wallet/auth") {
                    header(HttpHeaders.Cookie, adminCookies)
                    contentType(ContentType.Application.Json)
                    setBody("""{"password":"wrong-role-password"}""")
                }
            }

            val passwordChangeResponse =
                client.post("/wallet/password") {
                    header(HttpHeaders.Cookie, "walletAccessToken=$walletAccessToken")
                    contentType(ContentType.Application.Json)
                    setBody("""{"currentPassword":"wrong-role-password","newPassword":"new-role-password"}""")
                }

            assertEquals(HttpStatusCode.TooManyRequests, passwordChangeResponse.status)
        }

    private fun TokenService.adminSessionCookies(
        userId: String,
        userName: String,
        roleId: String,
        roleName: String,
    ): String {
        val adminUserInfo = AuthResponse(id = userId, name = userName, roleId = roleId, role = roleName, isAdmin = true)
        val accessToken = generateAccessToken(adminUserInfo)
        val refreshToken = generateRefreshToken(adminUserInfo)
        return "accessToken=$accessToken; refreshToken=$refreshToken"
    }
}
