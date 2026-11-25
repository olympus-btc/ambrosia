package pos.ambrosia.utest

import io.ktor.client.request.forms.MultiPartFormDataContent
import io.ktor.client.request.forms.formData
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.engine.applicationEnvironment
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.Json
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.configureInitialSetup
import pos.ambrosia.api.handler
import pos.ambrosia.api.initialSetupRoutes
import pos.ambrosia.models.BackupUploadResponse
import pos.ambrosia.services.BackupService
import pos.ambrosia.services.TokenService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.buildEncryptedBackupBytes
import pos.ambrosia.utils.testJwtConfig
import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals

class InitialSetupRestoreRouteTest {
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
    fun `restore returns conflict when initial setup is already completed`() =
        testApplication {
            ExposedTestDb.seedConfig("America/Mexico_City")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureInitialSetup()
            }

            val restoreResponse =
                client.post("/initial-setup/restore") {
                    setBody(
                        MultiPartFormDataContent(
                            formData {
                                append("password", "some-password")
                                append("backup", "irrelevant-bytes".toByteArray())
                            },
                        ),
                    )
                }

            assertEquals(HttpStatusCode.Conflict, restoreResponse.status)
        }

    @Test
    fun `restore returns bad request when the password is missing`() =
        testApplication {
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureInitialSetup()
            }

            val restoreResponse =
                client.post("/initial-setup/restore") {
                    setBody(
                        MultiPartFormDataContent(
                            formData {
                                append("backup", "irrelevant-bytes".toByteArray())
                            },
                        ),
                    )
                }

            assertEquals(HttpStatusCode.BadRequest, restoreResponse.status)
        }

    @Test
    fun `restore returns bad request when the backup file is missing`() =
        testApplication {
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureInitialSetup()
            }

            val restoreResponse =
                client.post("/initial-setup/restore") {
                    setBody(
                        MultiPartFormDataContent(
                            formData {
                                append("password", "some-password")
                            },
                        ),
                    )
                }

            assertEquals(HttpStatusCode.BadRequest, restoreResponse.status)
        }

    @Test
    fun `restore returns bad request when the backup file is not a valid Ambrosia backup`() =
        testApplication {
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureInitialSetup()
            }

            val restoreResponse =
                client.post("/initial-setup/restore") {
                    setBody(
                        MultiPartFormDataContent(
                            formData {
                                append("password", "some-password")
                                append("backup", "this is not a real ambrosia backup file".toByteArray())
                            },
                        ),
                    )
                }

            assertEquals(HttpStatusCode.BadRequest, restoreResponse.status)
        }

    @Test
    fun `restore returns ok with businessName and includesPhoenixdData for a valid backup`() =
        testApplication {
            val encryptedBackupBytes = buildEncryptedBackupBytes(databaseFile)

            val destinationImportStagingRoot =
                Files.createTempDirectory("initialSetupRestoreTestStagingParent").resolve("import-staging")
            val destinationBackupService = BackupService(importStagingRoot = destinationImportStagingRoot)

            application {
                install(ContentNegotiation) { json() }
                handler()
                routing { route("/initial-setup") { initialSetupRoutes(destinationBackupService) } }
            }

            val restoreResponse =
                client.post("/initial-setup/restore") {
                    setBody(
                        MultiPartFormDataContent(
                            formData {
                                append("password", "correct-password")
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

            assertEquals(HttpStatusCode.OK, restoreResponse.status)
            val restoreResponseBody = Json.decodeFromString<BackupUploadResponse>(restoreResponse.bodyAsText())
            assertEquals("Source Store", restoreResponseBody.businessName)
            assertEquals(false, restoreResponseBody.includesPhoenixdData)
        }

    @Test
    fun `progress-token returns conflict when initial setup is already completed`() =
        testApplication {
            ExposedTestDb.seedConfig("America/Mexico_City")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureInitialSetup()
            }

            val progressTokenResponse = client.post("/initial-setup/progress-token")

            assertEquals(HttpStatusCode.Conflict, progressTokenResponse.status)
        }

    @Test
    fun `progress-token returns a valid onboarding-scoped token when initial setup is not completed`() =
        testApplication {
            environment { config = testJwtConfig() }
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureInitialSetup()
            }

            val progressTokenResponse = client.post("/initial-setup/progress-token")

            assertEquals(HttpStatusCode.OK, progressTokenResponse.status)
            val progressTokenBody = Json.decodeFromString<Map<String, String>>(progressTokenResponse.bodyAsText())
            val operationId = progressTokenBody.getValue("operationId")
            val progressToken = progressTokenBody.getValue("token")

            val tokenService = TokenService(applicationEnvironment { config = testJwtConfig() })
            assertEquals("onboarding", tokenService.getUserIdFromBackupProgressToken(progressToken, operationId))
        }

    @Test
    fun `test-phoenixd-connection returns conflict when initial setup is already completed`() =
        testApplication {
            ExposedTestDb.seedConfig("America/Mexico_City")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureInitialSetup()
            }

            val testConnectionResponse =
                client.post("/initial-setup/test-phoenixd-connection") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"phoenixdUrl":"http://127.0.0.1:1","phoenixdPassword":"irrelevant"}""")
                }

            assertEquals(HttpStatusCode.Conflict, testConnectionResponse.status)
        }

    @Test
    fun `test-phoenixd-connection returns service unavailable when the candidate node is unreachable`() =
        testApplication {
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureInitialSetup()
            }

            val testConnectionResponse =
                client.post("/initial-setup/test-phoenixd-connection") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"phoenixdUrl":"http://127.0.0.1:1","phoenixdPassword":"irrelevant"}""")
                }

            assertEquals(HttpStatusCode.ServiceUnavailable, testConnectionResponse.status)
        }

    @Test
    fun `confirm-pending-restore returns conflict when initial setup is already completed`() =
        testApplication {
            ExposedTestDb.seedConfig("America/Mexico_City")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureInitialSetup()
            }

            val confirmResponse = client.post("/initial-setup/confirm-pending-restore")

            assertEquals(HttpStatusCode.Conflict, confirmResponse.status)
        }

    @Test
    fun `confirm-pending-restore returns ok when nothing is pending`() =
        testApplication {
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureInitialSetup()
            }

            val confirmResponse = client.post("/initial-setup/confirm-pending-restore")

            assertEquals(HttpStatusCode.OK, confirmResponse.status)
        }
}
