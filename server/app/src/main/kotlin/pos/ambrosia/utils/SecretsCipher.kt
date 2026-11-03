package pos.ambrosia.utils

import org.bouncycastle.crypto.generators.Argon2BytesGenerator
import org.bouncycastle.crypto.params.Argon2Parameters
import org.bouncycastle.util.encoders.Hex
import java.security.SecureRandom
import java.util.concurrent.ConcurrentHashMap
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

object SecretsCipher {
    private const val ARGON2_ITERATIONS = 3
    private const val ARGON2_MEMORY_KB = 32 * 1024
    private const val ARGON2_PARALLELISM = 1
    private const val AES_KEY_LENGTH_BYTES = 32
    private const val INITIALIZATION_VECTOR_LENGTH_BYTES = 12
    private const val AUTHENTICATION_TAG_LENGTH_BITS = 128
    private const val ENVELOPE_SEPARATOR = ":"
    private val FIELD_ENCRYPTION_KDF_SALT = "ambrosia-pii-field-encryption-salt".toByteArray(Charsets.UTF_8)
    private val secureRandom = SecureRandom()
    private val fieldEncryptionKeysBySecret = ConcurrentHashMap<String, SecretKeySpec>()

    fun deriveKey(
        unlockPassword: CharArray,
        kdfSalt: ByteArray,
    ): SecretKeySpec {
        val argon2Parameters =
            Argon2Parameters
                .Builder(Argon2Parameters.ARGON2_id)
                .withVersion(Argon2Parameters.ARGON2_VERSION_13)
                .withIterations(ARGON2_ITERATIONS)
                .withMemoryAsKB(ARGON2_MEMORY_KB)
                .withParallelism(ARGON2_PARALLELISM)
                .withSalt(kdfSalt)
                .build()

        val argon2Generator = Argon2BytesGenerator()
        argon2Generator.init(argon2Parameters)

        val derivedKeyBytes = ByteArray(AES_KEY_LENGTH_BYTES)
        argon2Generator.generateBytes(unlockPassword, derivedKeyBytes)
        unlockPassword.fill(Char(0))

        return SecretKeySpec(derivedKeyBytes, "AES")
    }

    fun deriveFieldEncryptionKey(applicationSecret: String): SecretKeySpec =
        fieldEncryptionKeysBySecret.computeIfAbsent(applicationSecret) {
            deriveKey(applicationSecret.toCharArray(), FIELD_ENCRYPTION_KDF_SALT)
        }

    fun encrypt(
        plaintext: String,
        secretKey: SecretKeySpec,
    ): String {
        val initializationVector = ByteArray(INITIALIZATION_VECTOR_LENGTH_BYTES).also { secureRandom.nextBytes(it) }

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(
            Cipher.ENCRYPT_MODE,
            secretKey,
            GCMParameterSpec(AUTHENTICATION_TAG_LENGTH_BITS, initializationVector),
        )
        val ciphertext = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))

        return Hex.toHexString(initializationVector) + ENVELOPE_SEPARATOR + Hex.toHexString(ciphertext)
    }

    fun decrypt(
        envelope: String,
        secretKey: SecretKeySpec,
    ): String {
        val separatorIndex = envelope.indexOf(ENVELOPE_SEPARATOR)
        require(separatorIndex > 0) { "Malformed secrets envelope" }

        val initializationVector = Hex.decode(envelope.substring(0, separatorIndex))
        val ciphertext = Hex.decode(envelope.substring(separatorIndex + 1))

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(
            Cipher.DECRYPT_MODE,
            secretKey,
            GCMParameterSpec(AUTHENTICATION_TAG_LENGTH_BITS, initializationVector),
        )

        return String(cipher.doFinal(ciphertext), Charsets.UTF_8)
    }

    fun encryptOrNull(
        plaintext: String?,
        secretKey: SecretKeySpec,
    ): String? = plaintext?.let { encrypt(it, secretKey) }

    fun decryptOrNull(
        envelope: String?,
        secretKey: SecretKeySpec,
    ): String? = envelope?.let { decrypt(it, secretKey) }
}
