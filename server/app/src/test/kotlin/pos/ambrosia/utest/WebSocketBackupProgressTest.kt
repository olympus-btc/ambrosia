package pos.ambrosia.utest

import io.ktor.client.HttpClient
import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.client.plugins.websocket.webSocket
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.engine.applicationEnvironment
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import io.ktor.websocket.Frame
import io.ktor.websocket.readText
import kotlinx.coroutines.channels.ClosedReceiveChannelException
import pos.ambrosia.api.BackupProgressNotifier
import pos.ambrosia.api.backupProgressReporter
import pos.ambrosia.api.configureBackupProgressWebsocket
import pos.ambrosia.models.BackupProgressUpdate
import pos.ambrosia.services.TokenService
import pos.ambrosia.utils.testJwtConfig
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import io.ktor.server.websocket.WebSockets as ServerWebSockets

private fun Application.testBackupProgressModule() {
    install(ServerWebSockets)
    configureBackupProgressWebsocket()
}

class WebSocketBackupProgressTest {
    private fun testTokenService(): TokenService =
        TokenService(
            applicationEnvironment {
                config = testJwtConfig()
            },
        )

    private fun runBackupProgressTest(block: suspend ApplicationTestBuilder.(client: HttpClient) -> Unit) =
        testApplication {
            environment { config = testJwtConfig() }
            application { testBackupProgressModule() }
            val client = createClient { install(WebSockets) }
            block(client)
        }

    @Test
    fun `accepts a connection with a valid token and operationId`() =
        runBackupProgressTest { client ->
            val token = testTokenService().generateBackupProgressToken("user-1", "operation-1")

            client.webSocket("/ws/backup-progress?operationId=operation-1&token=$token") {
                val connectedFrame = (incoming.receive() as Frame.Text).readText()
                assertEquals("""{"type":"connected"}""", connectedFrame)
            }
        }

    @Test
    fun `rejects a connection with an invalid token`() =
        runBackupProgressTest { client ->
            client.webSocket("/ws/backup-progress?operationId=operation-1&token=not-a-real-token") {
                assertFailsWith<ClosedReceiveChannelException> { incoming.receive() }
            }
        }

    @Test
    fun `rejects a second connection for an operationId already in use`() =
        runBackupProgressTest { client ->
            val tokenService = testTokenService()
            val firstToken = tokenService.generateBackupProgressToken("user-1", "operation-1")
            val secondToken = tokenService.generateBackupProgressToken("user-1", "operation-1")

            client.webSocket("/ws/backup-progress?operationId=operation-1&token=$firstToken") {
                incoming.receive()

                client.webSocket("/ws/backup-progress?operationId=operation-1&token=$secondToken") {
                    assertFailsWith<ClosedReceiveChannelException> { incoming.receive() }
                }
            }
        }

    @Test
    fun `BackupProgressNotifier delivers a progress update to the registered session`() =
        runBackupProgressTest { client ->
            val token = testTokenService().generateBackupProgressToken("user-1", "operation-1")

            client.webSocket("/ws/backup-progress?operationId=operation-1&token=$token") {
                incoming.receive()

                BackupProgressNotifier.send(
                    "operation-1",
                    BackupProgressUpdate(phase = "extracting", bytesProcessed = 512, totalBytes = 1024),
                )

                val progressFrame = (incoming.receive() as Frame.Text).readText()
                assertEquals("""{"phase":"extracting","bytesProcessed":512,"totalBytes":1024}""", progressFrame)
            }
        }

    @Test
    fun `backupProgressReporter does nothing when operationId is null`() {
        val reporter = backupProgressReporter(null)

        reporter("writing", 10L, 100L)
    }

    @Test
    fun `backupProgressReporter delivers a progress update to the registered session`() =
        runBackupProgressTest { client ->
            val token = testTokenService().generateBackupProgressToken("user-1", "operation-1")

            client.webSocket("/ws/backup-progress?operationId=operation-1&token=$token") {
                incoming.receive()

                backupProgressReporter("operation-1")("extracting", 512L, 1024L)

                val progressFrame = (incoming.receive() as Frame.Text).readText()
                assertEquals("""{"phase":"extracting","bytesProcessed":512,"totalBytes":1024}""", progressFrame)
            }
        }
}
