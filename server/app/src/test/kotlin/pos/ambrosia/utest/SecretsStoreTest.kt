package pos.ambrosia.utest

import kotlinx.io.files.Path
import org.bouncycastle.util.encoders.Hex
import org.junit.After
import org.junit.Before
import pos.ambrosia.services.SecretsStore
import pos.ambrosia.utils.SecretsCipher
import pos.ambrosia.utils.SecretsLockedException
import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class SecretsStoreTest {
    private lateinit var configFile: File

    @Before
    fun setUp() {
        configFile = Files.createTempFile("secretsStoreTestConfig", ".conf").toFile()
        SecretsStore.resetForTesting()
        SecretsStore.ambrosiaConfigFile = Path(configFile.absolutePath)
    }

    @After
    fun tearDown() {
        SecretsStore.resetForTesting()
        configFile.delete()
    }

    private fun writeLockedEncryptedConfig(unlockPassword: String) {
        val kdfSalt = ByteArray(32)
        val secretKey = SecretsCipher.deriveKey(unlockPassword.toCharArray(), kdfSalt)
        val envelope = SecretsCipher.encrypt("remote-password", secretKey)
        configFile.writeText(
            "secrets-encrypted=true\nsecrets-kdf-salt=${Hex.toHexString(kdfSalt)}\nphoenixd-password=$envelope\n",
        )
    }

    @Test
    fun `isEncryptionActive returns false when the flag is absent`() {
        assertFalse(SecretsStore.isEncryptionActive())
    }

    @Test
    fun `isLocked returns false when encryption is not active`() {
        assertFalse(SecretsStore.isLocked())
    }

    @Test
    fun `getSecretOrNull returns null for a key that is not configured`() {
        assertNull(SecretsStore.getSecretOrNull("phoenixd-password"))
    }

    @Test
    fun `getSecretOrNull passes through plaintext when encryption is not active`() {
        configFile.writeText("phoenixd-password=plain-password\n")

        assertEquals("plain-password", SecretsStore.getSecretOrNull("phoenixd-password"))
    }

    @Test
    fun `setSecret writes plaintext when encryption is not active`() {
        SecretsStore.setSecret("phoenixd-password", "plain-password")

        assertEquals("phoenixd-password=plain-password", configFile.readText().trim())
    }

    @Test
    fun `activateEncryption encrypts only the encryptable keys and marks encryption active`() {
        SecretsStore.activateEncryption(
            "correct-unlock-password".toCharArray(),
            mapOf("phoenixd-password" to "remote-password", "phoenixd-url" to "http://100.1.1.1:9740"),
        )

        assertTrue(SecretsStore.isEncryptionActive())
        assertFalse(SecretsStore.isLocked())
        assertFalse(configFile.readText().contains("remote-password"))
        assertFalse(configFile.readText().contains("phoenixd-url"))
    }

    @Test
    fun `activateEncryption leaves the store unlocked so the encrypted value can be read back immediately`() {
        SecretsStore.activateEncryption("correct-unlock-password".toCharArray(), mapOf("phoenixd-password" to "remote-password"))

        assertEquals("remote-password", SecretsStore.getSecretOrNull("phoenixd-password"))
    }

    @Test
    fun `getSecretOrNull throws SecretsLockedException when encryption is active and locked`() {
        writeLockedEncryptedConfig("correct-unlock-password")

        assertFailsWith<SecretsLockedException> {
            SecretsStore.getSecretOrNull("phoenixd-password")
        }
    }

    @Test
    fun `setSecret throws SecretsLockedException when encryption is active and locked`() {
        writeLockedEncryptedConfig("correct-unlock-password")

        assertFailsWith<SecretsLockedException> {
            SecretsStore.setSecret("phoenixd-password", "new-password")
        }
    }

    @Test
    fun `getSecretOrNull ignores lock state for keys outside the encryptable set`() {
        writeLockedEncryptedConfig("correct-unlock-password")
        SecretsStore.setSecret("phoenixd-url", "http://100.1.1.1:9740")

        assertEquals("http://100.1.1.1:9740", SecretsStore.getSecretOrNull("phoenixd-url"))
    }

    @Test
    fun `unlock with the correct password re-derives the key and unlocks the store`() {
        SecretsStore.activateEncryption("correct-unlock-password".toCharArray(), mapOf("phoenixd-password" to "remote-password"))
        SecretsStore.lockForTesting()

        val unlockSucceeded = SecretsStore.unlock("correct-unlock-password".toCharArray())

        assertTrue(unlockSucceeded)
        assertFalse(SecretsStore.isLocked())
        assertEquals("remote-password", SecretsStore.getSecretOrNull("phoenixd-password"))
    }

    @Test
    fun `unlock with the wrong password fails and keeps the store locked`() {
        SecretsStore.activateEncryption("correct-unlock-password".toCharArray(), mapOf("phoenixd-password" to "remote-password"))
        SecretsStore.lockForTesting()

        val unlockSucceeded = SecretsStore.unlock("wrong-unlock-password".toCharArray())

        assertFalse(unlockSucceeded)
        assertTrue(SecretsStore.isLocked())
    }

    @Test
    fun `unlock fires the registered onUnlock callbacks`() {
        SecretsStore.activateEncryption("correct-unlock-password".toCharArray(), mapOf("phoenixd-password" to "remote-password"))
        SecretsStore.lockForTesting()
        var callbackFired = false
        SecretsStore.onUnlock { callbackFired = true }

        SecretsStore.unlock("correct-unlock-password".toCharArray())

        assertTrue(callbackFired)
    }
}
