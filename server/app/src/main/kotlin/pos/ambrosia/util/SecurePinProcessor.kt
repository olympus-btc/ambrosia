package pos.ambrosia.utils

import io.ktor.server.application.ApplicationEnvironment
import io.ktor.utils.io.core.toByteArray
import pos.ambrosia.config.AppConfig
import pos.ambrosia.logger
import java.security.MessageDigest
import java.util.Base64
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

object SecurePinProcessor {
    private fun getAppMasterKey(env: ApplicationEnvironment): ByteArray {
        val keyString = env.config.property("secret").getString()
        if (keyString.isNullOrBlank()) {
            throw IllegalStateException(
                "SECRET_HASH (App Master Key) not found in configuration or is empty. Cannot proceed securely.",
            )
        }
        val keyBytes = keyString.toByteArray(Charsets.UTF_8)
        return keyBytes
    }

    private val HASH_ALGORITHM = "PBKDF2WithHmacSHA256"
    private const val ITERATION_COUNT = 10000
    private const val KEY_LENGTH = 256

    fun hashPinForStorage(
        pin: CharArray,
        id: String,
        env: ApplicationEnvironment,
    ): ByteArray {
        try {
            val appMasterKey = getAppMasterKey(env)
            if (appMasterKey.isEmpty()) {
                throw IllegalStateException("App Master Key no cargada o está vacía.")
            }

            val combinedSalt = (appMasterKey.plus(id.toByteArray(Charsets.UTF_8)))

            val spec = PBEKeySpec(pin, combinedSalt, ITERATION_COUNT, KEY_LENGTH)
            val factory = SecretKeyFactory.getInstance(HASH_ALGORITHM)
            val hash = factory.generateSecret(spec).encoded

            pin.fill('\u0000')
            return hash
        } catch (e: Exception) {
            throw RuntimeException("Error al hashear el PIN con la clave maestra", e)
        }
    }

    fun verifyPin(
        enteredPin: CharArray,
        id: String,
        storedHash: ByteArray,
        env: ApplicationEnvironment,
    ): Boolean {
        val newHash = hashPinForStorage(enteredPin, id, env)
        logger.info("Pins: " + newHash + " = " + storedHash)
        return MessageDigest.isEqual(newHash, storedHash)
    }

    fun byteArrayToBase64(byteArray: ByteArray): String = Base64.getEncoder().encodeToString(byteArray)

    fun base64ToByteArray(base64String: String): ByteArray = Base64.getDecoder().decode(base64String)
}
