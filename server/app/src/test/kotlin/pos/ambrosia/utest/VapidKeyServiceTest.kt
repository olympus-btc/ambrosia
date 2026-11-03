package pos.ambrosia.utest

import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.applicationEnvironment
import kotlinx.io.files.Path
import org.junit.After
import org.junit.Before
import pos.ambrosia.services.SecretsStore
import pos.ambrosia.services.VapidKeyService
import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class VapidKeyServiceTest {
    private lateinit var configFile: File

    @Before
    fun setUp() {
        configFile = Files.createTempFile("vapidKeyServiceTestConfig", ".conf").toFile()
        SecretsStore.resetForTesting()
        SecretsStore.ambrosiaConfigFile = Path(configFile.absolutePath)
    }

    @After
    fun tearDown() {
        SecretsStore.resetForTesting()
        configFile.delete()
    }

    private fun vapidKeyService(vararg additionalConfigEntries: Pair<String, String>): VapidKeyService =
        VapidKeyService(
            applicationEnvironment {
                config =
                    MapApplicationConfig(
                        "web-push.vapid-public-key" to "real-public-key",
                        "web-push.vapid-subject" to "mailto:test@example.com",
                        *additionalConfigEntries,
                    )
            },
        )

    @Test
    fun `isWebPushEnabled returns true when the enabled flag is absent`() {
        assertTrue(vapidKeyService().isWebPushEnabled())
    }

    @Test
    fun `isWebPushEnabled returns false when the enabled flag is explicitly false`() {
        assertFalse(vapidKeyService("web-push.enabled" to "false").isWebPushEnabled())
    }

    @Test
    fun `getConfiguredKeysOrNull returns null when the public key is missing`() {
        configFile.writeText("web-push-vapid-private-key=real-private-key\n")
        val service =
            VapidKeyService(
                applicationEnvironment { config = MapApplicationConfig("web-push.vapid-subject" to "mailto:test@example.com") },
            )

        assertNull(service.getConfiguredKeysOrNull())
    }

    @Test
    fun `getConfiguredKeysOrNull returns null when the private key is not configured`() {
        assertNull(vapidKeyService().getConfiguredKeysOrNull())
    }

    @Test
    fun `getConfiguredKeysOrNull returns the configured keys when encryption is not active`() {
        configFile.writeText("web-push-vapid-private-key=real-private-key\n")

        val configuredKeys = vapidKeyService().getConfiguredKeysOrNull()

        assertEquals("real-public-key", configuredKeys?.publicKey)
        assertEquals("real-private-key", configuredKeys?.privateKey)
        assertEquals("mailto:test@example.com", configuredKeys?.subject)
    }

    @Test
    fun `getConfiguredKeysOrNull returns the decrypted private key when encryption is active and unlocked`() {
        SecretsStore.activateEncryption(
            "correct-unlock-password".toCharArray(),
            mapOf("web-push-vapid-private-key" to "real-private-key"),
        )

        val configuredKeys = vapidKeyService().getConfiguredKeysOrNull()

        assertEquals("real-private-key", configuredKeys?.privateKey)
    }

    @Test
    fun `getConfiguredKeysOrNull returns null instead of throwing when encryption is active and locked`() {
        SecretsStore.activateEncryption(
            "correct-unlock-password".toCharArray(),
            mapOf("web-push-vapid-private-key" to "real-private-key"),
        )
        SecretsStore.lockForTesting()

        assertNull(vapidKeyService().getConfiguredKeysOrNull())
    }
}
