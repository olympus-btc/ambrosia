package pos.ambrosia.api

import io.ktor.server.application.Application
import io.ktor.server.routing.routing
import io.ktor.server.websocket.DefaultWebSocketServerSession
import io.ktor.server.websocket.webSocket
import io.ktor.websocket.Frame
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import pos.ambrosia.logger
import pos.ambrosia.models.BackupProgressUpdate
import pos.ambrosia.services.TokenService
import java.util.concurrent.ConcurrentHashMap

fun Application.configureBackupProgressWebsocket() {
    val tokenService = TokenService(environment)

    routing {
        webSocket("/ws/backup-progress") {
            val operationId = call.request.queryParameters["operationId"]
            val token = call.request.queryParameters["token"]
            if (operationId == null || token == null) return@webSocket
            if (tokenService.getUserIdFromBackupProgressToken(token, operationId) == null) return@webSocket
            if (!BackupProgressNotifier.tryRegister(operationId, this)) return@webSocket

            try {
                send(Frame.Text("""{"type":"connected"}"""))
                for (frame in incoming) {
                    if (frame is Frame.Close) break
                }
            } finally {
                BackupProgressNotifier.unregister(operationId)
            }
        }
    }
}

object BackupProgressNotifier {
    private val sessionsByOperationId = ConcurrentHashMap<String, DefaultWebSocketServerSession>()
    private val progressUpdateSerializer = Json { encodeDefaults = true }

    fun tryRegister(
        operationId: String,
        session: DefaultWebSocketServerSession,
    ): Boolean = sessionsByOperationId.putIfAbsent(operationId, session) == null

    fun unregister(operationId: String) {
        sessionsByOperationId.remove(operationId)
    }

    suspend fun send(
        operationId: String,
        update: BackupProgressUpdate,
    ) {
        val session = sessionsByOperationId[operationId] ?: return
        val message = progressUpdateSerializer.encodeToString(update)
        runCatching { session.send(Frame.Text(message)) }.onFailure {
            logger.warn("Dropping backup progress websocket session after send failure: {}", it.message)
            sessionsByOperationId.remove(operationId)
        }
    }
}

fun backupProgressReporter(operationId: String?): (phase: String, bytesProcessed: Long, totalBytes: Long?) -> Unit {
    if (operationId == null) return { _, _, _ -> }
    return { phase, bytesProcessed, totalBytes ->
        runBlocking {
            BackupProgressNotifier.send(operationId, BackupProgressUpdate(phase, bytesProcessed, totalBytes))
        }
    }
}
