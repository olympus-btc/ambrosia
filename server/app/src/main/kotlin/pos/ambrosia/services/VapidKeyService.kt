package pos.ambrosia.services

import io.ktor.server.application.ApplicationEnvironment
import java.math.BigInteger
import java.security.KeyPairGenerator
import java.security.interfaces.ECPrivateKey
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import java.util.Base64

data class VapidKeys(
    val publicKey: String,
    val privateKey: String,
    val subject: String,
)

class VapidKeyService(
    private val environment: ApplicationEnvironment,
) {
    fun isWebPushEnabled(): Boolean =
        !environment.config
            .propertyOrNull("web-push.enabled")
            ?.getString()
            ?.trim()
            .equals("false", ignoreCase = true)

    fun getConfiguredKeysOrNull(): VapidKeys? {
        val configuredPublicKey = environment.configValue("web-push.vapid-public-key")
        val configuredPrivateKey = environment.configValue("web-push.vapid-private-key")
        val configuredSubject = environment.configValue("web-push.vapid-subject")

        if (configuredPublicKey == null || configuredPrivateKey == null || configuredSubject == null) {
            return null
        }

        return VapidKeys(
            publicKey = configuredPublicKey,
            privateKey = configuredPrivateKey,
            subject = configuredSubject,
        )
    }

    private fun ApplicationEnvironment.configValue(path: String): String? =
        config
            .propertyOrNull(path)
            ?.getString()
            ?.trim()
            ?.takeIf { it.isNotBlank() }

    companion object {
        const val DEFAULT_SUBJECT = "mailto:admin@ambrosia.local"

        fun generateKeys(subject: String = DEFAULT_SUBJECT): VapidKeys {
            val keyPairGenerator = KeyPairGenerator.getInstance("EC")
            keyPairGenerator.initialize(ECGenParameterSpec("secp256r1"))
            val keyPair = keyPairGenerator.generateKeyPair()
            return VapidKeys(
                publicKey = encodePublicKey(keyPair.public as ECPublicKey),
                privateKey = encodePrivateKey(keyPair.private as ECPrivateKey),
                subject = subject,
            )
        }

        private fun encodePublicKey(publicKey: ECPublicKey): String =
            base64Url(
                byteArrayOf(UNCOMPRESSED_POINT_PREFIX) +
                    publicKey.w.affineX.toFixedLengthBytes() +
                    publicKey.w.affineY.toFixedLengthBytes(),
            )

        private fun encodePrivateKey(privateKey: ECPrivateKey): String = base64Url(privateKey.s.toFixedLengthBytes())

        private fun BigInteger.toFixedLengthBytes(): ByteArray {
            val rawBytes = toByteArray()
            val unsignedBytes =
                if (rawBytes.size > VAPID_KEY_COORDINATE_BYTES) {
                    rawBytes.copyOfRange(rawBytes.size - VAPID_KEY_COORDINATE_BYTES, rawBytes.size)
                } else {
                    rawBytes
                }
            return ByteArray(VAPID_KEY_COORDINATE_BYTES - unsignedBytes.size) + unsignedBytes
        }

        private fun base64Url(bytes: ByteArray): String = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)

        private const val VAPID_KEY_COORDINATE_BYTES = 32
        private const val UNCOMPRESSED_POINT_PREFIX: Byte = 0x04
    }
}
