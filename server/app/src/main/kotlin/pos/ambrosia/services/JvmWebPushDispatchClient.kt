package pos.ambrosia.services

import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import nl.martijndwars.webpush.Notification
import nl.martijndwars.webpush.PushAsyncService
import org.bouncycastle.jce.provider.BouncyCastleProvider
import pos.ambrosia.logger
import pos.ambrosia.models.WebPushPayloadTypes
import pos.ambrosia.models.WebPushStatusCodes
import java.net.URI
import java.security.Security
import java.util.concurrent.TimeUnit

class JvmWebPushDispatchClient(
    vapidKeys: VapidKeys,
    private val webPushSender: JvmWebPushSender = LibraryJvmWebPushSender(vapidKeys),
) : WebPushDispatchClient {
    override fun send(
        subscription: WebPushDispatchSubscription,
        payload: WebPushDispatchPayload,
    ): WebPushDispatchResult {
        val webPushNotification =
            Notification
                .builder()
                .endpoint(subscription.endpoint)
                .userPublicKey(subscription.p256dh)
                .userAuth(subscription.auth)
                .payload(payload.toJson())
                .ttl(WEB_PUSH_TTL_SECONDS)
                .build()

        return try {
            val statusCode = webPushSender.send(webPushNotification)
            WebPushDispatchResult(
                statusCode = statusCode,
                shouldRevokeSubscription = shouldRevokeSubscription(statusCode),
            )
        } catch (error: InterruptedException) {
            Thread.currentThread().interrupt()
            logger.warn("Interrupted while dispatching JVM Web Push notification: ${safeEndpointLabel(subscription.endpoint)}")
            WebPushDispatchResult(statusCode = null)
        } catch (error: Exception) {
            logger.warn(
                "Failed to dispatch JVM Web Push notification: ${safeEndpointLabel(subscription.endpoint)}: ${error.message}",
            )
            WebPushDispatchResult(statusCode = null)
        }
    }

    private fun shouldRevokeSubscription(statusCode: Int): Boolean =
        statusCode == WebPushStatusCodes.NOT_FOUND || statusCode == WebPushStatusCodes.GONE

    private fun safeEndpointLabel(endpoint: String): String =
        runCatching { URI.create(endpoint).host ?: "unknown-host" }.getOrDefault("invalid-endpoint")

    private fun WebPushDispatchPayload.toJson(): String =
        buildJsonObject {
            put("type", WebPushPayloadTypes.ADMIN_ACTIVITY)
            put("title", title)
            put("body", body)
        }.toString()

    private companion object {
        const val WEB_PUSH_TTL_SECONDS = 60
    }
}

fun interface JvmWebPushSender {
    fun send(notification: Notification): Int
}

private class LibraryJvmWebPushSender(
    vapidKeys: VapidKeys,
) : JvmWebPushSender {
    private val pushService: PushAsyncService

    init {
        ensureBouncyCastleProvider()
        pushService = PushAsyncService(vapidKeys.publicKey, vapidKeys.privateKey, vapidKeys.subject)
    }

    override fun send(notification: Notification): Int =
        pushService
            .send(notification)
            .get(
                SEND_TIMEOUT_SECONDS,
                TimeUnit.SECONDS,
            ).statusCode

    private fun ensureBouncyCastleProvider() {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(BouncyCastleProvider())
        }
    }

    private companion object {
        const val SEND_TIMEOUT_SECONDS = 5L
    }
}
