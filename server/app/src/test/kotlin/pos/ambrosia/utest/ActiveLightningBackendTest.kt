package pos.ambrosia.utest

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.runBlocking
import org.mockito.kotlin.mock
import pos.ambrosia.nwc.NwcClientPort
import pos.ambrosia.services.ActiveLightningBackend
import pos.ambrosia.services.NwcService
import pos.ambrosia.services.PaymentVerifier
import pos.ambrosia.utils.FakeLightningBackend
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ActiveLightningBackendTest {
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
}
