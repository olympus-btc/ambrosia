package pos.ambrosia.utest

import org.junit.After
import org.junit.Before
import pos.ambrosia.computePhoenixdWebhookUrl
import pos.ambrosia.generateSelfSignedKeyStore
import pos.ambrosia.isKeyStoreOpenableWithPassword
import pos.ambrosia.migrateKeyStorePassword
import java.io.File
import java.security.KeyStore
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AmbrosiaTest {
    private lateinit var keyStoreFile: File

    @Before
    fun setUp() {
        keyStoreFile = File.createTempFile("ambrosia-keystore-test", ".jks")
        keyStoreFile.delete()
    }

    @After
    fun tearDown() {
        keyStoreFile.delete()
    }

    @Test
    fun `computePhoenixdWebhookUrl uses the ambrosia hostname when running in docker`() {
        val webhookUrl = computePhoenixdWebhookUrl(docker = true, httpBindIp = "0.0.0.0", httpBindPort = 9154)

        assertEquals("http://ambrosia:9154/webhook/phoenixd", webhookUrl)
    }

    @Test
    fun `computePhoenixdWebhookUrl falls back to 127-0-0-1 when the bind ip is a wildcard`() {
        val webhookUrl = computePhoenixdWebhookUrl(docker = false, httpBindIp = "0.0.0.0", httpBindPort = 9154)

        assertEquals("http://127.0.0.1:9154/webhook/phoenixd", webhookUrl)
    }

    @Test
    fun `computePhoenixdWebhookUrl uses the explicit bind ip when it is not a wildcard`() {
        val webhookUrl = computePhoenixdWebhookUrl(docker = false, httpBindIp = "192.168.1.50", httpBindPort = 9154)

        assertEquals("http://192.168.1.50:9154/webhook/phoenixd", webhookUrl)
    }

    @Test
    fun `generateSelfSignedKeyStore creates a keystore openable with its own store password`() {
        generateSelfSignedKeyStore(keyStoreFile, "store-password", "key-password")

        assertTrue(isKeyStoreOpenableWithPassword(keyStoreFile, "store-password"))
    }

    @Test
    fun `isKeyStoreOpenableWithPassword returns false for the wrong store password`() {
        generateSelfSignedKeyStore(keyStoreFile, "store-password", "key-password")

        assertFalse(isKeyStoreOpenableWithPassword(keyStoreFile, "wrong-password"))
    }

    @Test
    fun `migrateKeyStorePassword preserves the certificate while changing the passwords`() {
        generateSelfSignedKeyStore(keyStoreFile, "legacy-store-password", "legacy-key-password")
        val originalCertificate =
            KeyStore
                .getInstance("JKS")
                .apply { load(keyStoreFile.inputStream(), "legacy-store-password".toCharArray()) }
                .getCertificate("ambrosia")

        val migrated =
            migrateKeyStorePassword(
                keyStoreFile,
                "legacy-store-password",
                "legacy-key-password",
                "new-store-password",
                "new-key-password",
            )

        assertTrue(migrated)
        assertFalse(isKeyStoreOpenableWithPassword(keyStoreFile, "legacy-store-password"))
        val migratedCertificate =
            KeyStore
                .getInstance("JKS")
                .apply { load(keyStoreFile.inputStream(), "new-store-password".toCharArray()) }
                .getCertificate("ambrosia")
        assertEquals(originalCertificate, migratedCertificate)
    }

    @Test
    fun `migrateKeyStorePassword returns false for a corrupted keystore file`() {
        keyStoreFile.writeText("not a keystore")

        val migrated =
            migrateKeyStorePassword(
                keyStoreFile,
                "legacy-store-password",
                "legacy-key-password",
                "new-store-password",
                "new-key-password",
            )

        assertFalse(migrated)
    }
}
