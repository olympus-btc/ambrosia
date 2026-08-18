package pos.ambrosia.utest

import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.applicationEnvironment
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.junit.BeforeClass
import pos.ambrosia.services.JvmWebPushDispatchClient
import pos.ambrosia.services.JvmWebPushSender
import pos.ambrosia.services.NoopWebPushDispatchClient
import pos.ambrosia.services.VapidKeys
import pos.ambrosia.services.WebPushDispatchClients
import pos.ambrosia.services.WebPushDispatchPayload
import pos.ambrosia.services.WebPushDispatchSubscription
import java.math.BigInteger
import java.security.KeyPairGenerator
import java.security.Security
import java.security.interfaces.ECPrivateKey
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import java.util.Base64
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class JvmWebPushDispatchClientTest {
    @Test
    fun `factory uses noop client when push dispatch is not configured`() {
        val environment = applicationEnvironment { config = MapApplicationConfig() }

        val client = WebPushDispatchClients.fromEnvironment(environment)

        assertTrue(client is NoopWebPushDispatchClient)
    }

    @Test
    fun `factory uses noop client when web push is disabled`() {
        val environment =
            applicationEnvironment {
                config =
                    MapApplicationConfig(
                        "web-push.enabled" to "false",
                    )
            }

        val client = WebPushDispatchClients.fromEnvironment(environment)

        assertTrue(client is NoopWebPushDispatchClient)
    }

    @Test
    fun `factory uses noop client when VAPID config is incomplete`() {
        val vapidKeys = generateVapidKeys()
        val environment =
            applicationEnvironment {
                config =
                    MapApplicationConfig(
                        "web-push.vapid-public-key" to vapidKeys.publicKey,
                        "web-push.vapid-subject" to vapidKeys.subject,
                    )
            }

        val client = WebPushDispatchClients.fromEnvironment(environment)

        assertTrue(client is NoopWebPushDispatchClient)
    }

    @Test
    fun `factory uses JVM dispatcher when web push is enabled and VAPID is configured`() {
        val vapidKeys = generateVapidKeys()
        val environment =
            applicationEnvironment {
                config =
                    MapApplicationConfig(
                        "web-push.enabled" to "true",
                        "web-push.vapid-public-key" to vapidKeys.publicKey,
                        "web-push.vapid-private-key" to vapidKeys.privateKey,
                        "web-push.vapid-subject" to vapidKeys.subject,
                    )
            }

        val client = WebPushDispatchClients.fromEnvironment(environment)

        assertTrue(client is JvmWebPushDispatchClient)
    }

    @Test
    fun `send returns status from JVM sender`() {
        val client = jvmClient(statusCode = 201)

        val result = client.send(validSubscription(), validPayload())

        assertEquals(201, result.statusCode)
        assertFalse(result.shouldRevokeSubscription)
    }

    @Test
    fun `send marks expired subscriptions for revocation`() {
        val client = jvmClient(statusCode = 410)

        val result = client.send(validSubscription(), validPayload())

        assertEquals(410, result.statusCode)
        assertTrue(result.shouldRevokeSubscription)
    }

    @Test
    fun `send treats sender errors as best effort failures`() {
        val client =
            JvmWebPushDispatchClient(
                vapidKeys = testVapidKeys(),
                webPushSender =
                    JvmWebPushSender {
                        throw RuntimeException("network unavailable")
                    },
            )

        val result = client.send(validSubscription(), validPayload())

        assertEquals(null, result.statusCode)
        assertFalse(result.shouldRevokeSubscription)
    }

    private fun jvmClient(statusCode: Int): JvmWebPushDispatchClient =
        JvmWebPushDispatchClient(
            vapidKeys = testVapidKeys(),
            webPushSender =
                JvmWebPushSender { notification ->
                    assertEquals("https://updates.push.example.test/subscription-id", notification.endpoint)
                    assertTrue(notification.hasPayload())
                    assertEquals(
                        """{"type":"admin_activity","title":"Ambrosia","body":"Ada sent a wallet payment"}""",
                        notification.payload.decodeToString(),
                    )
                    assertEquals(60, notification.ttl)
                    statusCode
                },
        )

    private fun validPayload(): WebPushDispatchPayload =
        WebPushDispatchPayload(
            title = "Ambrosia",
            body = "Ada sent a wallet payment",
        )

    private fun validSubscription(): WebPushDispatchSubscription =
        WebPushDispatchSubscription(
            endpoint = "https://updates.push.example.test/subscription-id",
            p256dh = generateP256PublicKey(),
            auth = base64Url(ByteArray(16) { it.toByte() }),
        )

    private fun testVapidKeys(): VapidKeys =
        VapidKeys(
            publicKey = generateP256PublicKey(),
            privateKey = base64Url(ByteArray(32) { (it + 1).toByte() }),
            subject = "mailto:test@ambrosia.local",
        )

    private fun generateVapidKeys(): VapidKeys {
        val keyPairGenerator = KeyPairGenerator.getInstance("EC")
        keyPairGenerator.initialize(ECGenParameterSpec("secp256r1"))
        val keyPair = keyPairGenerator.generateKeyPair()
        val publicKey = keyPair.public as ECPublicKey
        val privateKey = keyPair.private as ECPrivateKey
        return VapidKeys(
            publicKey = encodePublicKey(publicKey),
            privateKey = base64Url(privateKey.s.fixedBytes()),
            subject = "mailto:test@ambrosia.local",
        )
    }

    private fun generateP256PublicKey(): String {
        val keyPairGenerator = KeyPairGenerator.getInstance("EC")
        keyPairGenerator.initialize(ECGenParameterSpec("secp256r1"))
        val publicKey = keyPairGenerator.generateKeyPair().public as ECPublicKey
        return encodePublicKey(publicKey)
    }

    private fun encodePublicKey(publicKey: ECPublicKey): String =
        base64Url(byteArrayOf(UNCOMPRESSED_POINT_PREFIX) + publicKey.w.affineX.fixedBytes() + publicKey.w.affineY.fixedBytes())

    private fun BigInteger.fixedBytes(): ByteArray {
        val bytes = toByteArray()
        val unsignedBytes =
            if (bytes.size > P256_COORDINATE_BYTES) {
                bytes.copyOfRange(bytes.size - P256_COORDINATE_BYTES, bytes.size)
            } else {
                bytes
            }
        return ByteArray(P256_COORDINATE_BYTES - unsignedBytes.size) + unsignedBytes
    }

    private fun base64Url(bytes: ByteArray): String = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)

    companion object {
        private const val P256_COORDINATE_BYTES = 32
        private const val UNCOMPRESSED_POINT_PREFIX: Byte = 0x04

        @JvmStatic
        @BeforeClass
        fun addBouncyCastleProvider() {
            if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                Security.addProvider(BouncyCastleProvider())
            }
        }
    }
}
