package pos.ambrosia.api

import io.ktor.server.application.Application
import io.ktor.server.routing.routing
import io.ktor.server.websocket.webSocket
import io.ktor.websocket.CloseReason
import io.ktor.websocket.Frame
import io.ktor.websocket.close
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.buffer
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import pos.ambrosia.models.LogStreamEvent
import pos.ambrosia.models.LogStreamEventTypes
import pos.ambrosia.services.LogsService
import pos.ambrosia.utils.authenticateAdmin
import pos.ambrosia.utils.isLocalPhoenixdLogAvailable

private const val LIVE_LOG_ENTRIES_PER_SESSION_BUFFER = 256
private val logStreamEventSerializer = Json { encodeDefaults = false }

fun Application.configureLogsWebsocket(logsService: LogsService = LogsService()) {
    routing {
        authenticateAdmin {
            webSocket("/ws/logs") {
                val sourceId =
                    runCatching { logsService.parseLogSourceId(call.request.queryParameters["source"]) }
                        .getOrElse { invalidSourceError ->
                            close(CloseReason(CloseReason.Codes.CANNOT_ACCEPT, invalidSourceError.message.orEmpty()))
                            return@webSocket
                        }
                if (!logsService.isLogSourceAvailable(sourceId, call.isLocalPhoenixdLogAvailable())) {
                    close(CloseReason(CloseReason.Codes.CANNOT_ACCEPT, "Log source $sourceId is not available"))
                    return@webSocket
                }

                send(Frame.Text(logStreamEventSerializer.encodeToString(LogStreamEvent(type = LogStreamEventTypes.CONNECTED))))

                val liveEntriesForwardingJob =
                    launch {
                        try {
                            logsService
                                .liveEntries(sourceId)
                                .buffer(LIVE_LOG_ENTRIES_PER_SESSION_BUFFER, BufferOverflow.DROP_OLDEST)
                                .collect { liveEntry ->
                                    val liveEntryEvent = LogStreamEvent(type = LogStreamEventTypes.ENTRY, entry = liveEntry)
                                    send(Frame.Text(logStreamEventSerializer.encodeToString(liveEntryEvent)))
                                }
                        } catch (forwardingCancellation: CancellationException) {
                            throw forwardingCancellation
                        } catch (_: Exception) {
                            return@launch
                        }
                    }

                try {
                    for (frame in incoming) {
                        if (frame is Frame.Close) break
                    }
                } finally {
                    liveEntriesForwardingJob.cancel()
                }
            }
        }
    }
}
