package pos.ambrosia.utest

import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.testApplication
import kotlinx.io.files.Path
import kotlinx.serialization.json.Json
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.configureSecrets
import pos.ambrosia.api.handler
import pos.ambrosia.models.SecretsStatusResponse
import pos.ambrosia.services.SecretsStore
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.installNonAdminAuth
import pos.ambrosia.utils.installWalletAuth
import pos.ambrosia.utils.installWalletAuthWithRegularSession
import pos.ambrosia.utils.withAuthCookies
import pos.ambrosia.utils.withRegularAuthCookie
import pos.ambrosia.utils.withWalletAuthCookie
import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private fun Application.installTestSecretsRoutes() {
    install(ContentNegotiation) { json() }
    handler()
    configureSecrets()
}

class SecretsRouteTest {
    private lateinit var databaseFile: File
    private lateinit var configFile: File

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
        configFile = Files.createTempFile("secretsRouteTestConfig", ".conf").toFile()
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
    fun `status returns unauthorized without a wallet session`() =
        testApplication {
            installWalletAuth()
            application { installTestSecretsRoutes() }

            val statusResponse = client.get("/secrets/status")

            assertEquals(HttpStatusCode.Unauthorized, statusResponse.status)
        }

    @Test
    fun `status reflects inactive encryption by default`() =
        testApplication {
            val walletAccessToken = installWalletAuth()
            application { installTestSecretsRoutes() }

            val statusResponse = client.get("/secrets/status") { withWalletAuthCookie(walletAccessToken) }
            val status = Json.decodeFromString<SecretsStatusResponse>(statusResponse.bodyAsText())

            assertEquals(HttpStatusCode.OK, statusResponse.status)
            assertFalse(status.encryptionActive)
            assertFalse(status.locked)
        }

    @Test
    fun `lock-status returns unauthorized without a session`() =
        testApplication {
            installNonAdminAuth()
            application { installTestSecretsRoutes() }

            val lockStatusResponse = client.get("/secrets/lock-status")

            assertEquals(HttpStatusCode.Unauthorized, lockStatusResponse.status)
        }

    @Test
    fun `lock-status is reachable with a regular session, no wallet session required`() =
        testApplication {
            val authCookies = installNonAdminAuth()
            application { installTestSecretsRoutes() }

            val lockStatusResponse = client.get("/secrets/lock-status") { withAuthCookies(authCookies) }
            val lockStatus = Json.decodeFromString<SecretsStatusResponse>(lockStatusResponse.bodyAsText())

            assertEquals(HttpStatusCode.OK, lockStatusResponse.status)
            assertFalse(lockStatus.encryptionActive)
            assertFalse(lockStatus.locked)
        }

    @Test
    fun `lock-status reflects active and locked encryption after activation`() =
        testApplication {
            val (walletAccessToken, regularAccessToken) = installWalletAuthWithRegularSession()
            application { installTestSecretsRoutes() }
            configFile.writeText("phoenixd-password=remote-password\n")

            val activateResponse =
                client.post("/secrets/activate") {
                    withWalletAuthCookie(walletAccessToken)
                    contentType(ContentType.Application.Json)
                    setBody("""{"unlockPassword":"correct-unlock-password"}""")
                }
            assertEquals(HttpStatusCode.OK, activateResponse.status)
            SecretsStore.lockForTesting()

            val lockStatusResponse = client.get("/secrets/lock-status") { withRegularAuthCookie(regularAccessToken) }
            val lockStatus = Json.decodeFromString<SecretsStatusResponse>(lockStatusResponse.bodyAsText())

            assertEquals(HttpStatusCode.OK, lockStatusResponse.status)
            assertTrue(lockStatus.encryptionActive)
            assertTrue(lockStatus.locked)
        }

    @Test
    fun `unlock returns unauthorized without a wallet session`() =
        testApplication {
            installWalletAuth()
            application { installTestSecretsRoutes() }

            val unlockResponse = client.post("/secrets/unlock")

            assertEquals(HttpStatusCode.Unauthorized, unlockResponse.status)
        }

    @Test
    fun `unlock with the wrong password returns unauthorized`() =
        testApplication {
            val walletAccessToken = installWalletAuth()
            application { installTestSecretsRoutes() }

            val activateResponse =
                client.post("/secrets/activate") {
                    withWalletAuthCookie(walletAccessToken)
                    contentType(ContentType.Application.Json)
                    setBody("""{"unlockPassword":"correct-unlock-password"}""")
                }
            assertEquals(HttpStatusCode.OK, activateResponse.status)
            SecretsStore.lockForTesting()

            val unlockResponse =
                client.post("/secrets/unlock") {
                    withWalletAuthCookie(walletAccessToken)
                    contentType(ContentType.Application.Json)
                    setBody("""{"unlockPassword":"wrong-unlock-password"}""")
                }

            assertEquals(HttpStatusCode.Unauthorized, unlockResponse.status)
        }

    @Test
    fun `activate returns unauthorized without a wallet session`() =
        testApplication {
            installWalletAuth()
            application { installTestSecretsRoutes() }

            val activateResponse = client.post("/secrets/activate")

            assertEquals(HttpStatusCode.Unauthorized, activateResponse.status)
        }

    @Test
    fun `activate then status reports active and unlocked, and unlock with the same password succeeds`() =
        testApplication {
            val walletAccessToken = installWalletAuth()
            application { installTestSecretsRoutes() }
            configFile.writeText("phoenixd-password=remote-password\n")

            val activateResponse =
                client.post("/secrets/activate") {
                    withWalletAuthCookie(walletAccessToken)
                    contentType(ContentType.Application.Json)
                    setBody("""{"unlockPassword":"correct-unlock-password"}""")
                }
            assertEquals(HttpStatusCode.OK, activateResponse.status)

            val statusResponse = client.get("/secrets/status") { withWalletAuthCookie(walletAccessToken) }
            val status = Json.decodeFromString<SecretsStatusResponse>(statusResponse.bodyAsText())
            assertTrue(status.encryptionActive)
            assertFalse(status.locked)

            SecretsStore.lockForTesting()
            val unlockResponse =
                client.post("/secrets/unlock") {
                    withWalletAuthCookie(walletAccessToken)
                    contentType(ContentType.Application.Json)
                    setBody("""{"unlockPassword":"correct-unlock-password"}""")
                }

            assertEquals(HttpStatusCode.OK, unlockResponse.status)
        }
}
