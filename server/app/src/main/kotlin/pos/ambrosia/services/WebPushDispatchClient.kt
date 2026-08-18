package pos.ambrosia.services

import io.ktor.server.application.ApplicationEnvironment

data class WebPushDispatchSubscription(
    val endpoint: String,
    val p256dh: String,
    val auth: String,
)

data class WebPushDispatchPayload(
    val title: String,
    val body: String,
)

data class WebPushDispatchResult(
    val statusCode: Int?,
    val shouldRevokeSubscription: Boolean = false,
)

interface WebPushDispatchClient {
    fun send(
        subscription: WebPushDispatchSubscription,
        payload: WebPushDispatchPayload,
    ): WebPushDispatchResult
}

object WebPushDispatchClients {
    fun fromEnvironment(environment: ApplicationEnvironment): WebPushDispatchClient {
        val vapidKeyService = VapidKeyService(environment)
        if (!vapidKeyService.isWebPushEnabled()) {
            return NoopWebPushDispatchClient
        }

        val configuredVapidKeys = vapidKeyService.getConfiguredKeysOrNull()
        return configuredVapidKeys?.let { JvmWebPushDispatchClient(it) } ?: NoopWebPushDispatchClient
    }
}

object NoopWebPushDispatchClient : WebPushDispatchClient {
    override fun send(
        subscription: WebPushDispatchSubscription,
        payload: WebPushDispatchPayload,
    ): WebPushDispatchResult = WebPushDispatchResult(statusCode = null)
}
