package pos.ambrosia.nwc

import io.ktor.client.HttpClient
import io.ktor.client.plugins.websocket.DefaultClientWebSocketSession
import io.ktor.client.plugins.websocket.webSocket
import io.ktor.websocket.CloseReason
import io.ktor.websocket.Frame
import io.ktor.websocket.close
import io.ktor.websocket.readText
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonArray
import pos.ambrosia.logger
import pos.ambrosia.utils.NwcConnectionException

class NostrRelay(
    private val url: String,
    private val httpClient: HttpClient,
) {
    private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 256)
    val messages: SharedFlow<String> = _messages

    @Volatile private var session: DefaultClientWebSocketSession? = null

    suspend fun connect(
        scope: CoroutineScope,
        onConnected: (suspend () -> Unit)? = null,
    ) {
        val connected = CompletableDeferred<Unit>()
        scope.launch {
            var delayMs = 1_000L
            while (isActive) {
                try {
                    httpClient.webSocket(urlString = url) {
                        session = this
                        logger.info("Connected to Nostr relay: {}", url)
                        if (!connected.isCompleted) connected.complete(Unit)
                        delayMs = 1_000L
                        try {
                            onConnected?.invoke()
                        } catch (e: Exception) {
                            logger.warn("onConnected callback failed: {}", e.message)
                        }
                        for (frame in incoming) {
                            if (frame is Frame.Text) {
                                _messages.emit(frame.readText())
                            }
                        }
                    }
                } catch (e: Exception) {
                    if (!connected.isCompleted) {
                        connected.completeExceptionally(
                            NwcConnectionException("Failed to connect to relay $url: ${e.message}"),
                        )
                        return@launch
                    }
                    logger.warn("Relay disconnected, retrying in {}ms: {}", delayMs, e.message)
                } finally {
                    session = null
                }
                delay(delayMs)
                delayMs = minOf(delayMs * 2, 60_000L)
            }
        }
        connected.await()
    }

    suspend fun sendEvent(event: NostrEvent) {
        val message =
            buildJsonArray {
                add("EVENT")
                add(Json.parseToJsonElement(event.toJson()))
            }
        send(Json.encodeToString(JsonArray.serializer(), message))
    }

    suspend fun subscribe(
        subscriptionId: String,
        filter: JsonObject,
    ) {
        val message =
            buildJsonArray {
                add("REQ")
                add(subscriptionId)
                add(filter)
            }
        send(Json.encodeToString(JsonArray.serializer(), message))
    }

    private suspend fun send(text: String) {
        val s = session ?: throw NwcConnectionException("Not connected to relay")
        s.send(Frame.Text(text))
    }

    fun close() {
        session?.let {
            runBlocking { it.close(CloseReason(CloseReason.Codes.NORMAL, "Client closing")) }
        }
    }
}
