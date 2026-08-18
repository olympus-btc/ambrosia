package pos.ambrosia.api

import io.ktor.server.application.Application
import io.ktor.server.routing.routing
import io.ktor.server.websocket.DefaultWebSocketServerSession
import io.ktor.server.websocket.webSocket
import io.ktor.websocket.Frame
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import pos.ambrosia.logger
import pos.ambrosia.models.AdminNotification
import pos.ambrosia.models.AdminNotificationLiveEvent
import pos.ambrosia.models.AdminNotificationLiveEventTypes
import pos.ambrosia.services.AdminNotificationLivePublisher
import pos.ambrosia.utils.authenticateAdmin
import pos.ambrosia.utils.getCurrentUser
import java.util.concurrent.ConcurrentHashMap

fun Application.configureAdminNotificationsWebsocket() {
    routing {
        authenticateAdmin {
            webSocket("/ws/admin-notifications") {
                val currentUser = call.getCurrentUser()
                if (currentUser == null) {
                    return@webSocket
                }

                AdminNotificationsLiveNotifier.register(currentUser.userId, this)
                try {
                    send(Frame.Text("""{"type":"${AdminNotificationLiveEventTypes.CONNECTED}"}"""))
                    for (frame in incoming) {
                        if (frame is Frame.Close) break
                    }
                } finally {
                    AdminNotificationsLiveNotifier.unregister(currentUser.userId, this)
                }
            }
        }
    }
}

object AdminNotificationsLiveNotifier : AdminNotificationLivePublisher {
    private val sessionsByAdminUserId = ConcurrentHashMap<String, MutableSet<DefaultWebSocketServerSession>>()
    private val serializer = Json { encodeDefaults = true }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun register(
        adminUserId: String,
        session: DefaultWebSocketServerSession,
    ) {
        sessionsByAdminUserId
            .computeIfAbsent(adminUserId) { ConcurrentHashMap.newKeySet() }
            .add(session)
    }

    fun unregister(
        adminUserId: String,
        session: DefaultWebSocketServerSession,
    ) {
        sessionsByAdminUserId[adminUserId]?.remove(session)
    }

    override fun publish(
        adminUserId: String,
        notification: AdminNotification,
    ) {
        scope.launch {
            sendToAdmin(adminUserId, notification)
        }
    }

    private suspend fun sendToAdmin(
        adminUserId: String,
        notification: AdminNotification,
    ) {
        val sessions = sessionsByAdminUserId[adminUserId] ?: return
        if (sessions.isEmpty()) return

        val message = serializer.encodeToString(AdminNotificationLiveEvent(notification = notification))
        val staleSessions = mutableListOf<DefaultWebSocketServerSession>()
        sessions.forEach { session ->
            runCatching { session.send(Frame.Text(message)) }.onFailure {
                logger.warn("Dropping admin notifications websocket session after send failure: {}", it.message)
                staleSessions.add(session)
            }
        }
        if (staleSessions.isNotEmpty()) {
            staleSessions.forEach { sessions.remove(it) }
        }
    }
}
