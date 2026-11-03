package pos.ambrosia.utest

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
import kotlinx.io.files.Path
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.handler
import pos.ambrosia.api.wallet
import pos.ambrosia.services.ActiveLightningBackend
import pos.ambrosia.services.AuthService
import pos.ambrosia.services.PaymentService
import pos.ambrosia.services.RefundService
import pos.ambrosia.services.RolesService
import pos.ambrosia.services.SecretsStore
import pos.ambrosia.services.TokenService
import pos.ambrosia.services.WalletAdminNotificationService
import pos.ambrosia.services.WalletRateService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.installWalletAuth
import pos.ambrosia.utils.withWalletAuthCookie
import java.io.File
import java.nio.file.Files
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

class WalletUpdateNwcUriRouteTest {
    private lateinit var databaseFile: File
    private lateinit var configFile: File

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
        configFile = Files.createTempFile("walletUpdateNwcUriRouteTestConfig", ".conf").toFile()
        SecretsStore.resetForTesting()
        SecretsStore.ambrosiaConfigFile = Path(configFile.absolutePath)
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
        SecretsStore.resetForTesting()
        configFile.delete()
    }

    @Test
    fun `updatenwcuri returns unauthorized without a wallet session`() =
        testApplication {
            installWalletAuth()
            application {
                install(ContentNegotiation) { json() }
                handler()
                installTestWalletRoutes()
            }

            val updateNwcUriResponse = client.post("/wallet/updatenwcuri")

            assertEquals(HttpStatusCode.Unauthorized, updateNwcUriResponse.status)
        }

    @Test
    fun `updatenwcuri returns conflict when secrets are locked, before checking the active backend`() =
        testApplication {
            val walletAccessToken = installWalletAuth()
            application {
                install(ContentNegotiation) { json() }
                handler()
                installTestWalletRoutes()
            }

            SecretsStore.activateEncryption("correct-unlock-password".toCharArray(), emptyMap())
            SecretsStore.lockForTesting()

            val updateNwcUriResponse =
                client.post("/wallet/updatenwcuri") {
                    withWalletAuthCookie(walletAccessToken)
                    contentType(ContentType.Application.Json)
                    setBody("""{"nwcUri":"nostr+walletconnect://abc?relay=wss://relay.example"}""")
                }

            assertEquals(HttpStatusCode.Conflict, updateNwcUriResponse.status)
        }
}
