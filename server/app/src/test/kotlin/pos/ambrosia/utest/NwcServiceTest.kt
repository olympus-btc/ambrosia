package pos.ambrosia.utest

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.runBlocking
import org.mockito.kotlin.any
import org.mockito.kotlin.anyOrNull
import org.mockito.kotlin.isNull
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.models.phoenix.CloseChannelRequest
import pos.ambrosia.models.phoenix.CreateInvoiceRequest
import pos.ambrosia.models.phoenix.CreateOffer
import pos.ambrosia.models.phoenix.CsvExport
import pos.ambrosia.models.phoenix.PayInvoiceRequest
import pos.ambrosia.nwc.Nip47Balance
import pos.ambrosia.nwc.Nip47Info
import pos.ambrosia.nwc.Nip47PayResult
import pos.ambrosia.nwc.Nip47Transaction
import pos.ambrosia.nwc.NwcClientPort
import pos.ambrosia.services.NwcService
import pos.ambrosia.utils.NwcServiceException
import pos.ambrosia.utils.UnsupportedBackendOperationException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class NwcServiceTest {
    private val mockClient: NwcClientPort = mock()
    private val walletPubkey = "b889ff5b1513b641e2a139f661a661364979c5beee91842f8f0ef42ab558e9d4"
    private val service = NwcService(mockClient, walletPubkey, CoroutineScope(SupervisorJob()))

    // region createInvoice

    @Test
    fun `createInvoice returns paymentHash and bolt11 from NWC client`() =
        runBlocking {
            whenever(mockClient.makeInvoice(any(), any(), anyOrNull())).thenReturn(
                Nip47Transaction(paymentHash = "abc123", invoice = "lnbc100n1...", amount = 100_000L),
            )

            val response = service.createInvoice(CreateInvoiceRequest(amountSat = 100, description = "test"))

            assertEquals("abc123", response.paymentHash)
            assertEquals("lnbc100n1...", response.serialized)
            assertEquals(100L, response.amountSat)
        }

    @Test
    fun `createInvoice sends amount in millisats to NWC client`() {
        runBlocking {
            whenever(mockClient.makeInvoice(any(), any(), anyOrNull())).thenReturn(
                Nip47Transaction(paymentHash = "hash", invoice = "lnbc..."),
            )

            service.createInvoice(CreateInvoiceRequest(amountSat = 500, description = ""))

            verify(mockClient).makeInvoice(amountMsat = 500_000L, description = "", expiry = null)
        }
    }

    @Test
    fun `createInvoice throws when NWC client returns no paymentHash`() =
        runBlocking<Unit> {
            whenever(mockClient.makeInvoice(any(), any(), anyOrNull())).thenReturn(
                Nip47Transaction(paymentHash = null, invoice = "lnbc..."),
            )

            assertFailsWith<NwcServiceException> {
                service.createInvoice(CreateInvoiceRequest(amountSat = 100, description = ""))
            }
        }

    @Test
    fun `createInvoice throws when NWC client returns no invoice`() =
        runBlocking<Unit> {
            whenever(mockClient.makeInvoice(any(), any(), anyOrNull())).thenReturn(
                Nip47Transaction(paymentHash = "hash", invoice = null),
            )

            assertFailsWith<NwcServiceException> {
                service.createInvoice(CreateInvoiceRequest(amountSat = 100, description = ""))
            }
        }

    // endregion

    // region getBalance

    @Test
    fun `getBalance converts millisats to sats`() =
        runBlocking {
            whenever(mockClient.getBalance()).thenReturn(Nip47Balance(balance = 42_340_000L))

            val balance = service.getBalance()

            assertEquals(42_340L, balance.balanceSat)
            assertEquals(0L, balance.feeCreditSat)
        }

    // endregion

    // region getNodeInfo

    @Test
    fun `getNodeInfo uses wallet pubkey as fallback when NWC omits it`() =
        runBlocking {
            whenever(mockClient.getInfo()).thenReturn(Nip47Info(pubkey = null, network = "mainnet"))
            whenever(mockClient.getBalance()).thenReturn(Nip47Balance(balance = 0L))

            assertEquals(walletPubkey, service.getNodeInfo().nodeId)
        }

    @Test
    fun `getNodeInfo uses NWC pubkey when present`() =
        runBlocking {
            val nwcPubkey = "deadbeef".repeat(8)
            whenever(mockClient.getInfo()).thenReturn(Nip47Info(pubkey = nwcPubkey))
            whenever(mockClient.getBalance()).thenReturn(Nip47Balance(balance = 0L))

            assertEquals(nwcPubkey, service.getNodeInfo().nodeId)
        }

    // endregion

    // region payInvoice

    @Test
    fun `payInvoice converts fee from millisats to sats`() =
        runBlocking {
            whenever(mockClient.payInvoice(any(), isNull())).thenReturn(
                Nip47PayResult(preimage = "preimage123", feesPaid = 3_000L),
            )

            val response = service.payInvoice(PayInvoiceRequest(invoice = "lnbc...", amountSat = null))

            assertEquals("preimage123", response.paymentPreimage)
            assertEquals(3L, response.routingFeeSat)
        }

    // endregion

    // region invoice polling TTL

    @Test
    fun `pollPendingInvoices removes settled invoices and does not re-lookup them`() {
        runBlocking {
            whenever(mockClient.makeInvoice(any(), any(), anyOrNull())).thenReturn(
                Nip47Transaction(paymentHash = "settled_hash", invoice = "lnbc..."),
            )
            whenever(mockClient.lookupInvoice(paymentHash = "settled_hash")).thenReturn(
                Nip47Transaction(paymentHash = "settled_hash", amount = 10_000L, settledAt = 1700000000L),
            )

            service.createInvoice(CreateInvoiceRequest(amountSat = 10, description = ""))
            service.pollPendingInvoices()

            // Second poll must not call lookupInvoice again — invoice removed after settlement
            service.pollPendingInvoices()
            verify(mockClient, org.mockito.kotlin.times(1)).lookupInvoice(paymentHash = "settled_hash")
        }
    }

    @Test
    fun `pollPendingInvoices keeps unsettled invoices for next poll`() {
        runBlocking {
            whenever(mockClient.makeInvoice(any(), any(), anyOrNull())).thenReturn(
                Nip47Transaction(paymentHash = "pending_hash", invoice = "lnbc..."),
            )
            whenever(mockClient.lookupInvoice(paymentHash = "pending_hash")).thenReturn(
                Nip47Transaction(paymentHash = "pending_hash", settledAt = null),
            )

            service.createInvoice(CreateInvoiceRequest(amountSat = 10, description = ""))
            service.pollPendingInvoices()
            service.pollPendingInvoices()

            verify(mockClient, org.mockito.kotlin.times(2)).lookupInvoice(paymentHash = "pending_hash")
        }
    }

    // endregion

    // region unsupported operations

    @Test
    fun `getSeed throws UnsupportedBackendOperationException`() {
        assertFailsWith<UnsupportedBackendOperationException> { runBlocking { service.getSeed() } }
    }

    @Test
    fun `createOffer throws UnsupportedBackendOperationException`() {
        assertFailsWith<UnsupportedBackendOperationException> {
            runBlocking { service.createOffer(CreateOffer()) }
        }
    }

    @Test
    fun `csvExport throws UnsupportedBackendOperationException`() {
        assertFailsWith<UnsupportedBackendOperationException> {
            runBlocking { service.csvExport(CsvExport(from = "0", to = "9999999999")) }
        }
    }

    @Test
    fun `closeChannel throws UnsupportedBackendOperationException`() {
        assertFailsWith<UnsupportedBackendOperationException> {
            runBlocking { service.closeChannel(CloseChannelRequest("cid", "bc1q...", 5L)) }
        }
    }

    // endregion
}
