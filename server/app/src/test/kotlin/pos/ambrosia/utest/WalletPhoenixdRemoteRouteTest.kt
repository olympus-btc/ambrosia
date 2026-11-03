package pos.ambrosia.utest

import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.handler
import pos.ambrosia.api.wallet
import pos.ambrosia.services.ActiveLightningBackend
import pos.ambrosia.services.AuthService
import pos.ambrosia.services.PaymentService
import pos.ambrosia.services.RefundService
import pos.ambrosia.services.RolesService
import pos.ambrosia.services.TokenService
import pos.ambrosia.services.WalletAdminNotificationService
import pos.ambrosia.services.WalletRateService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.installWalletAuth
import pos.ambrosia.utils.withWalletAuthCookie
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

class WalletPhoenixdRemoteRouteTest {
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
    fun `test-phoenixd-connection returns unauthorized without a wallet session`() =
        testApplication {
            installWalletAuth()
            application {
                install(ContentNegotiation) { json() }
                handler()
                installTestWalletRoutes()
            }

            val testConnectionResponse = client.post("/wallet/test-phoenixd-connection")

            assertEquals(HttpStatusCode.Unauthorized, testConnectionResponse.status)
        }

    @Test
    fun `test-phoenixd-connection returns service unavailable when the candidate node is unreachable`() =
        testApplication {
            val walletAccessToken = installWalletAuth()
            application {
                install(ContentNegotiation) { json() }
                handler()
                installTestWalletRoutes()
            }

            val testConnectionResponse =
                client.post("/wallet/test-phoenixd-connection") {
                    withWalletAuthCookie(walletAccessToken)
                    contentType(ContentType.Application.Json)
                    setBody("""{"phoenixdUrl":"http://127.0.0.1:1","phoenixdPassword":"irrelevant"}""")
                }

            assertEquals(HttpStatusCode.ServiceUnavailable, testConnectionResponse.status)
        }

    @Test
    fun `update-phoenixd-remote returns unauthorized without a wallet session`() =
        testApplication {
            installWalletAuth()
            application {
                install(ContentNegotiation) { json() }
                handler()
                installTestWalletRoutes()
            }

            val updatePhoenixdRemoteResponse = client.post("/wallet/update-phoenixd-remote")

            assertEquals(HttpStatusCode.Unauthorized, updatePhoenixdRemoteResponse.status)
        }

    @Test
    fun `update-phoenixd-remote returns bad request when switching to remote without url or password`() =
        testApplication {
            val walletAccessToken = installWalletAuth()
            application {
                install(ContentNegotiation) { json() }
                handler()
                installTestWalletRoutes()
            }

            val updatePhoenixdRemoteResponse =
                client.post("/wallet/update-phoenixd-remote") {
                    withWalletAuthCookie(walletAccessToken)
                    contentType(ContentType.Application.Json)
                    setBody("""{"phoenixdRemote":true}""")
                }

            assertEquals(HttpStatusCode.BadRequest, updatePhoenixdRemoteResponse.status)
        }

    @Test
    fun `phoenixd-remote-status returns unauthorized without a wallet session`() =
        testApplication {
            installWalletAuth()
            application {
                install(ContentNegotiation) { json() }
                handler()
                installTestWalletRoutes()
            }

            val phoenixdRemoteStatusResponse = client.get("/wallet/phoenixd-remote-status")

            assertEquals(HttpStatusCode.Unauthorized, phoenixdRemoteStatusResponse.status)
        }
}
