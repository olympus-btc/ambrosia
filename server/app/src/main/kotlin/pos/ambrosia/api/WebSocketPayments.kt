package pos.ambrosia.api

import io.ktor.server.application.Application
import io.ktor.server.auth.authenticate
import io.ktor.server.routing.routing
import io.ktor.server.websocket.DefaultWebSocketServerSession
import io.ktor.server.websocket.webSocket
import io.ktor.websocket.Frame
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import pos.ambrosia.logger
import java.util.concurrent.ConcurrentHashMap

@Serializable
data class PaymentNotification(
    val type: String,
    val timestamp: Long? = null,
    val amountSat: Long? = null,
    val paymentHash: String? = null,
    val externalId: String? = null,
    val payerNote: String? = null,
    val payerKey: String? = null,
)

fun Application.configurePaymentWebsocket() {
    routing {
        authenticate("auth-jwt") {
            webSocket("/ws/payments") {
                PaymentNotifier.register(this)
                try {
                    send(Frame.Text("""{"type":"connected"}"""))
                    for (frame in incoming) {
                        if (frame is Frame.Close) break
                    }
                } finally {
                    PaymentNotifier.unregister(this)
                }
            }
        }
    }
}

object PaymentNotifier {
    private val sessions = ConcurrentHashMap.newKeySet<DefaultWebSocketServerSession>()
    private val serializer = Json { encodeDefaults = false }

    fun register(session: DefaultWebSocketServerSession) {
        sessions.add(session)
    }

    fun unregister(session: DefaultWebSocketServerSession) {
        sessions.remove(session)
    }

    suspend fun broadcast(payload: PaymentNotification) {
        val message = serializer.encodeToString(payload)
        val stale = mutableListOf<DefaultWebSocketServerSession>()
        sessions.forEach { session ->
            runCatching { session.send(Frame.Text(message)) }.onFailure {
                logger.warn("Dropping websocket session after send failure: {}", it.message)
                stale.add(session)
            }
        }
        if (stale.isNotEmpty()) {
            sessions.removeAll(stale.toSet())
        }
    }
}
