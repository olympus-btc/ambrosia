package pos.ambrosia.services

import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.client.plugins.websocket.webSocket
import io.ktor.client.request.header
import io.ktor.websocket.Frame
import io.ktor.websocket.readText
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import pos.ambrosia.api.PaymentNotification
import pos.ambrosia.logger
import java.util.Base64

class PhoenixPaymentEventsClient(
    private val phoenixdUrl: String,
    private val phoenixdPassword: String,
    private val onPaymentReceived: suspend (PaymentNotification) -> Unit,
) {
    private val json = Json { ignoreUnknownKeys = true }
    private val httpClient = HttpClient(CIO) { install(WebSockets) }
    private var connectionJob: Job? = null

    fun connect() {
        val webSocketUrl = "${phoenixdUrl.replaceFirst("http", "ws")}/websocket"
        val basicAuthHeader = "Basic " + Base64.getEncoder().encodeToString(":$phoenixdPassword".toByteArray())

        connectionJob =
            CoroutineScope(Dispatchers.IO).launch {
                runCatching {
                    httpClient.webSocket(webSocketUrl, request = { header("Authorization", basicAuthHeader) }) {
                        for (frame in incoming) {
                            if (frame is Frame.Text) {
                                runCatching { json.decodeFromString<PaymentNotification>(frame.readText()) }
                                    .onSuccess { onPaymentReceived(it) }
                                    .onFailure { logger.warn("Invalid Phoenix websocket payload: ${it.message}") }
                            }
                        }
                    }
                }.onFailure { logger.warn("Phoenix payment events websocket connection failed: ${it.message}") }
            }
    }

    fun close() {
        connectionJob?.cancel()
        httpClient.close()
    }
}
