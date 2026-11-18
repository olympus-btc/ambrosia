package pos.ambrosia.utest

import io.ktor.client.request.forms.MultiPartFormDataContent
import io.ktor.client.request.forms.formData
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.applicationEnvironment
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.Json
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.backup
import pos.ambrosia.api.handler
import pos.ambrosia.configureAuthentication
import pos.ambrosia.models.BackupUploadResponse
import pos.ambrosia.models.Role
import pos.ambrosia.services.AuthService
import pos.ambrosia.services.BackupService
import pos.ambrosia.services.ConfigService
import pos.ambrosia.services.RolesService
import pos.ambrosia.services.TokenService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.buildEncryptedBackupBytes
import pos.ambrosia.utils.withWalletAuthCookie
import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals

private const val TEST_SECRET = "backup-import-route-test-secret"
private const val TEST_ISSUER = "backup-import-route-test-issuer"
private const val TEST_AUDIENCE = "backup-import-route-test-audience"
private const val TEST_ROLE_PASSWORD = "cashier-pin"

class BackupImportRouteTest {
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
    fun `import returns ok with businessName and includesPhoenixdData for a valid backup`() =
        testApplication {
            val testApplicationConfig =
                MapApplicationConfig(
                    "secret" to TEST_SECRET,
                    "jwt.issuer" to TEST_ISSUER,
                    "jwt.audience" to TEST_AUDIENCE,
                )
            val testEnvironment = applicationEnvironment { config = testApplicationConfig }

            val roleId =
                RolesService(testEnvironment).addRole(Role(role = "Cashier", password = TEST_ROLE_PASSWORD, isAdmin = false))!!
            val userId = ExposedTestDb.seedUser("backup-import-test-user", roleId)
            val walletAccessToken = TokenService(testEnvironment).generateWalletAccessToken(userId)

            val encryptedBackupBytes = buildEncryptedBackupBytes(databaseFile)

            val destinationImportStagingRoot =
                Files.createTempDirectory("backupImportRouteTestStagingParent").resolve("import-staging")
            val destinationBackupService = BackupService(importStagingRoot = destinationImportStagingRoot)

            environment { config = testApplicationConfig }
            application {
                configureAuthentication()
                install(ContentNegotiation) { json() }
                handler()
                val authService = AuthService(environment)
                val configService = ConfigService()
                val tokenService = TokenService(environment)
                routing { route("/backup") { backup(authService, destinationBackupService, configService, tokenService) } }
            }

            val importResponse =
                client.post("/backup/import") {
                    withWalletAuthCookie(walletAccessToken)
                    setBody(
                        MultiPartFormDataContent(
                            formData {
                                append("rolePassword", TEST_ROLE_PASSWORD)
                                append("backupPassword", "correct-password")
                                append(
                                    "backup",
                                    encryptedBackupBytes,
                                    Headers.build {
                                        append(HttpHeaders.ContentDisposition, "filename=\"backup.zip\"")
                                    },
                                )
                            },
                        ),
                    )
                }

            assertEquals(HttpStatusCode.OK, importResponse.status)
            val importResponseBody = Json.decodeFromString<BackupUploadResponse>(importResponse.bodyAsText())
            assertEquals("Source Store", importResponseBody.businessName)
            assertEquals(false, importResponseBody.includesPhoenixdData)
        }
}
