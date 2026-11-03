package pos.ambrosia.utest

import pos.ambrosia.utils.SecretsCipher
import java.security.SecureRandom
import javax.crypto.BadPaddingException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class SecretsCipherTest {
    private val secureRandom = SecureRandom()

    private fun randomSalt(): ByteArray = ByteArray(32).also { secureRandom.nextBytes(it) }

    @Test
    fun `encrypt then decrypt with the same key returns the original plaintext`() {
        val secretKey = SecretsCipher.deriveKey("correct-unlock-password".toCharArray(), randomSalt())

        val envelope = SecretsCipher.encrypt("http://100.1.1.1:9740-password", secretKey)

        assertEquals("http://100.1.1.1:9740-password", SecretsCipher.decrypt(envelope, secretKey))
    }

    @Test
    fun `decrypting with a key derived from the wrong password fails`() {
        val salt = randomSalt()
        val correctKey = SecretsCipher.deriveKey("correct-unlock-password".toCharArray(), salt)
        val wrongKey = SecretsCipher.deriveKey("wrong-unlock-password".toCharArray(), salt)

        val envelope = SecretsCipher.encrypt("remote-password", correctKey)

        assertFailsWith<BadPaddingException> {
            SecretsCipher.decrypt(envelope, wrongKey)
        }
    }

    @Test
    fun `decrypting a malformed envelope fails`() {
        val secretKey = SecretsCipher.deriveKey("correct-unlock-password".toCharArray(), randomSalt())

        assertFailsWith<IllegalArgumentException> {
            SecretsCipher.decrypt("not-a-valid-envelope", secretKey)
        }
    }

    @Test
    fun `encrypting the same plaintext twice produces different envelopes`() {
        val secretKey = SecretsCipher.deriveKey("correct-unlock-password".toCharArray(), randomSalt())

        assertNotEquals(
            SecretsCipher.encrypt("remote-password", secretKey),
            SecretsCipher.encrypt("remote-password", secretKey),
        )
    }

    @Test
    fun `deriving a key from the same password and salt produces the same key`() {
        val salt = randomSalt()

        val firstKey = SecretsCipher.deriveKey("correct-unlock-password".toCharArray(), salt)
        val secondKey = SecretsCipher.deriveKey("correct-unlock-password".toCharArray(), salt)

        assertEquals(firstKey, secondKey)
    }

    @Test
    fun `deriveKey clears the unlock password array after use`() {
        val unlockPassword = "correct-unlock-password".toCharArray()

        SecretsCipher.deriveKey(unlockPassword, randomSalt())

        assertTrue(unlockPassword.all { it == Char(0) })
    }

    @Test
    fun `deriveFieldEncryptionKey returns the same key for the same application secret`() {
        val firstKey = SecretsCipher.deriveFieldEncryptionKey("field-encryption-shared-secret")
        val secondKey = SecretsCipher.deriveFieldEncryptionKey("field-encryption-shared-secret")

        assertEquals(firstKey, secondKey)
    }

    @Test
    fun `deriveFieldEncryptionKey returns a different key for a different application secret`() {
        val firstKey = SecretsCipher.deriveFieldEncryptionKey("field-encryption-secret-one")
        val secondKey = SecretsCipher.deriveFieldEncryptionKey("field-encryption-secret-two")

        assertNotEquals(firstKey, secondKey)
    }

    @Test
    fun `a key from deriveFieldEncryptionKey encrypts and decrypts back to the original plaintext`() {
        val fieldEncryptionKey = SecretsCipher.deriveFieldEncryptionKey("field-encryption-round-trip-secret")

        val envelope = SecretsCipher.encrypt("user@example.com", fieldEncryptionKey)

        assertEquals("user@example.com", SecretsCipher.decrypt(envelope, fieldEncryptionKey))
    }

    @Test
    fun `encryptOrNull returns null for a null plaintext`() {
        val secretKey = SecretsCipher.deriveKey("correct-unlock-password".toCharArray(), randomSalt())

        assertEquals(null, SecretsCipher.encryptOrNull(null, secretKey))
    }

    @Test
    fun `encryptOrNull then decryptOrNull returns the original plaintext`() {
        val secretKey = SecretsCipher.deriveKey("correct-unlock-password".toCharArray(), randomSalt())

        val envelope = SecretsCipher.encryptOrNull("user@example.com", secretKey)

        assertEquals("user@example.com", SecretsCipher.decryptOrNull(envelope, secretKey))
    }

    @Test
    fun `decryptOrNull returns null for a null envelope`() {
        val secretKey = SecretsCipher.deriveKey("correct-unlock-password".toCharArray(), randomSalt())

        assertEquals(null, SecretsCipher.decryptOrNull(null, secretKey))
    }
}
