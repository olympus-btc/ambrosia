package pos.ambrosia.utest

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.runBlocking
import kotlinx.io.files.Path
import org.junit.After
import org.junit.Before
import org.mockito.kotlin.mock
import pos.ambrosia.nwc.NwcClientPort
import pos.ambrosia.services.ActiveLightningBackend
import pos.ambrosia.services.NwcService
import pos.ambrosia.services.PaymentVerifier
import pos.ambrosia.services.SecretsStore
import pos.ambrosia.utils.FakeLightningBackend
import pos.ambrosia.utils.SecretsLockedException
import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ActiveLightningBackendTest {
    private lateinit var configFile: File

    @Before
    fun setUp() {
        ActiveLightningBackend.closeActive()
        configFile = Files.createTempFile("activeLightningBackendTestConfig", ".conf").toFile()
        SecretsStore.resetForTesting()
        SecretsStore.ambrosiaConfigFile = Path(configFile.absolutePath)
    }

    @After
    fun tearDown() {
        ActiveLightningBackend.closeActive()
        SecretsStore.resetForTesting()
        configFile.delete()
    }

    @Test
    fun `paymentVerifier resolves the active backend even when captured before a switch`() {
        runBlocking {
            val phoenixd = FakeLightningBackend("phoenixd")
            val nwc = FakeLightningBackend("nwc")
            val paymentVerifier: PaymentVerifier = ActiveLightningBackend

            ActiveLightningBackend.set(phoenixd)
            assertEquals("phoenixd", paymentVerifier.getIncomingPayment("hash-1").paymentHash)

            ActiveLightningBackend.set(nwc)
            assertEquals("nwc", paymentVerifier.getIncomingPayment("hash-1").paymentHash)
        }
    }

    @Test
    fun `lightningBackend calls delegate to the currently set backend`() {
        runBlocking {
            ActiveLightningBackend.set(FakeLightningBackend("phoenixd"))

            assertEquals("phoenixd", ActiveLightningBackend.getSeed())
            assertEquals("phoenixd", ActiveLightningBackend.getNodeInfo().nodeId)
        }
    }

    @Test
    fun `closeActive closes the current backend and clears the reference`() {
        runBlocking {
            val backend = FakeLightningBackend("phoenixd")
            ActiveLightningBackend.set(backend)

            ActiveLightningBackend.closeActive()

            assertTrue(backend.closed)
        }
    }

    @Test
    fun `reinitializePhoenixBackend replaces the active backend and closes the previous one`() {
        val previousBackend = FakeLightningBackend("phoenixd-old")
        ActiveLightningBackend.set(previousBackend)

        ActiveLightningBackend.reinitializePhoenixBackend("http://127.0.0.1:1", "irrelevant-password")

        assertTrue(previousBackend.closed)
        assertFalse(ActiveLightningBackend.isNwcActive())
    }

    @Test
    fun `isNwcActive returns false when the active backend is not NwcService`() {
        ActiveLightningBackend.set(FakeLightningBackend("phoenixd"))

        assertFalse(ActiveLightningBackend.isNwcActive())
    }

    @Test
    fun `isNwcActive returns true when the active backend is NwcService`() {
        val mockClient: NwcClientPort = mock()
        val nwcService = NwcService(mockClient, "walletPubkey", CoroutineScope(SupervisorJob()))
        ActiveLightningBackend.set(nwcService)

        assertTrue(ActiveLightningBackend.isNwcActive())
    }

    @Test
    fun `getNodeInfo throws SecretsLockedException when no backend was set and secrets are locked`() {
        configFile.writeText("secrets-encrypted=true\n")

        assertFailsWith<SecretsLockedException> {
            runBlocking { ActiveLightningBackend.getNodeInfo() }
        }
    }

    @Test
    fun `getNodeInfo throws the generic not-initialized error when no backend was set and encryption is inactive`() {
        val thrownException =
            assertFailsWith<IllegalStateException> {
                runBlocking { ActiveLightningBackend.getNodeInfo() }
            }

        assertEquals("Lightning backend not initialized", thrownException.message)
    }
}
