package pos.ambrosia.nwc

import io.ktor.client.*
import io.ktor.client.plugins.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.serialization.json.*
import pos.ambrosia.logger
import pos.ambrosia.utils.NwcConnectionException

class NostrRelay(
  private val url: String,
  private val httpClient: HttpClient
) {
  private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 256)
  val messages: SharedFlow<String> = _messages
  @Volatile private var session: DefaultClientWebSocketSession? = null

  suspend fun connect(scope: CoroutineScope) {
    val connected = CompletableDeferred<Unit>()
    scope.launch {
      try {
        httpClient.webSocket(urlString = url) {
          session = this
          logger.info("Connected to Nostr relay: {}", url)
          connected.complete(Unit)
          for (frame in incoming) {
            if (frame is Frame.Text) {
              _messages.emit(frame.readText())
            }
          }
        }
      } catch (e: Exception) {
        if (!connected.isCompleted) {
          connected.completeExceptionally(
            NwcConnectionException("Failed to connect to relay $url: ${e.message}")
          )
        }
        logger.error("Relay connection error: {}", e.message)
      } finally {
        session = null
      }
    }
    connected.await()
  }

  suspend fun sendEvent(event: NostrEvent) {
    val message = buildJsonArray {
      add("EVENT")
      add(Json.parseToJsonElement(event.toJson()))
    }
    send(Json.encodeToString(JsonArray.serializer(), message))
  }

  suspend fun subscribe(subscriptionId: String, filter: JsonObject) {
    val message = buildJsonArray {
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
