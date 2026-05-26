package pos.ambrosia.utest

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.isActive
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
import pos.ambrosia.models.phoenix.PayOfferRequest
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
    private val service = NwcService(mockClient, walletPubkey, CoroutineScope(SupervisorJob())).also { it.markReady() }

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

            assertEquals(walletPubkey, service.getNodeInfo().nodeId)
        }

    @Test
    fun `getNodeInfo uses NWC pubkey when present`() =
        runBlocking {
            val nwcPubkey = "deadbeef".repeat(8)
            whenever(mockClient.getInfo()).thenReturn(Nip47Info(pubkey = nwcPubkey))

            assertEquals(nwcPubkey, service.getNodeInfo().nodeId)
        }

    @Test
    fun `getNodeInfo returns empty channel list`() =
        runBlocking {
            whenever(mockClient.getInfo()).thenReturn(Nip47Info(pubkey = null, network = "mainnet"))

            assertEquals(emptyList(), service.getNodeInfo().channels)
        }

    @Test
    fun `getNodeInfo returns unknown chain when network field is absent`() =
        runBlocking {
            whenever(mockClient.getInfo()).thenReturn(Nip47Info(pubkey = null, network = null))

            assertEquals("unknown", service.getNodeInfo().chain)
        }

    @Test
    fun `getNodeInfo does not make a redundant get_balance round-trip`() =
        runBlocking<Unit> {
            whenever(mockClient.getInfo()).thenReturn(Nip47Info(pubkey = null, network = "mainnet"))

            service.getNodeInfo()

            org.mockito.kotlin
                .verify(mockClient, org.mockito.kotlin.never())
                .getBalance()
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

    @Test
    fun `payInvoice uses explicit amountSat when provided`() =
        runBlocking {
            whenever(mockClient.payInvoice(any(), any())).thenReturn(
                Nip47PayResult(preimage = "abc", feesPaid = 0L),
            )

            val response = service.payInvoice(PayInvoiceRequest(invoice = "lnbc...", amountSat = 42L))

            assertEquals(42L, response.recipientAmountSat)
        }

    // endregion

    // region listIncomingPayments / listOutgoingPayments — regression for I1 (feesPaid was 1000x too large)

    @Test
    fun `listIncomingPayments converts feesPaid from millisats to sats`() =
        runBlocking {
            whenever(mockClient.listTransactions(anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull())).thenReturn(
                listOf(
                    Nip47Transaction(
                        type = "incoming",
                        paymentHash = "hash1",
                        amount = 10_000_000L, // 10 000 sat in msat
                        feesPaid = 1_000L, // 1 sat in msat — must not appear as 1000
                        settledAt = 1700000000L,
                    ),
                ),
            )

            val payments = service.listIncomingPayments(from = 0, to = null, limit = 20, offset = 0, all = false, externalId = null)

            assertEquals(1, payments.size)
            assertEquals(1L, payments[0].fees) // 1 000 msat → 1 sat
        }

    @Test
    fun `listOutgoingPayments converts feesPaid from millisats to sats`() =
        runBlocking {
            whenever(mockClient.listTransactions(anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull())).thenReturn(
                listOf(
                    Nip47Transaction(
                        type = "outgoing",
                        paymentHash = "hash2",
                        amount = 5_000_000L, // 5 000 sat in msat
                        feesPaid = 3_000L, // 3 sat in msat
                        settledAt = 1700000001L,
                    ),
                ),
            )

            val payments = service.listOutgoingPayments(from = 0, to = null, limit = 20, offset = 0, all = false)

            assertEquals(1, payments.size)
            assertEquals(3L, payments[0].fees) // 3 000 msat → 3 sat
        }

    // endregion

    // region invoice polling — batched via list_transactions (I6 regression)

    @Test
    fun `pollPendingInvoices removes settled invoices found in batch list_transactions`() {
        runBlocking {
            whenever(mockClient.makeInvoice(any(), any(), anyOrNull())).thenReturn(
                Nip47Transaction(paymentHash = "settled_hash", invoice = "lnbc..."),
            )
            whenever(mockClient.listTransactions(anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull())).thenReturn(
                listOf(Nip47Transaction(paymentHash = "settled_hash", amount = 10_000L, settledAt = 1700000000L)),
            )

            service.createInvoice(CreateInvoiceRequest(amountSat = 10, description = ""))
            service.pollPendingInvoices()

            // After settlement the entry is gone, so next poll has no pending entries
            // and must short-circuit before calling list_transactions again.
            service.pollPendingInvoices()
            verify(mockClient, org.mockito.kotlin.times(1)).listTransactions(
                anyOrNull(),
                anyOrNull(),
                anyOrNull(),
                anyOrNull(),
                anyOrNull(),
                anyOrNull(),
            )
        }
    }

    @Test
    fun `pollPendingInvoices keeps unsettled invoices for next poll cycle`() {
        runBlocking {
            whenever(mockClient.makeInvoice(any(), any(), anyOrNull())).thenReturn(
                Nip47Transaction(paymentHash = "pending_hash", invoice = "lnbc..."),
            )
            // list_transactions returns no settled tx for our pending invoice
            whenever(mockClient.listTransactions(anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull())).thenReturn(
                emptyList(),
            )

            service.createInvoice(CreateInvoiceRequest(amountSat = 10, description = ""))
            service.pollPendingInvoices()
            service.pollPendingInvoices()

            // Both polls hit list_transactions — exactly one round-trip per cycle, not N.
            verify(mockClient, org.mockito.kotlin.times(2)).listTransactions(
                anyOrNull(),
                anyOrNull(),
                anyOrNull(),
                anyOrNull(),
                anyOrNull(),
                anyOrNull(),
            )
        }
    }

    @Test
    fun `pollPendingInvoices issues a single list_transactions per cycle regardless of pending count`() {
        runBlocking {
            whenever(mockClient.makeInvoice(any(), any(), anyOrNull()))
                .thenReturn(Nip47Transaction(paymentHash = "h1", invoice = "lnbc1..."))
                .thenReturn(Nip47Transaction(paymentHash = "h2", invoice = "lnbc2..."))
                .thenReturn(Nip47Transaction(paymentHash = "h3", invoice = "lnbc3..."))
            whenever(mockClient.listTransactions(anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull())).thenReturn(
                emptyList(),
            )

            repeat(3) { service.createInvoice(CreateInvoiceRequest(amountSat = 10, description = "")) }
            service.pollPendingInvoices()

            // The whole point of I6: one round-trip even with 3 pending invoices.
            verify(mockClient, org.mockito.kotlin.times(1)).listTransactions(
                anyOrNull(),
                anyOrNull(),
                anyOrNull(),
                anyOrNull(),
                anyOrNull(),
                anyOrNull(),
            )
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

    @Test
    fun `getOutgoingPaymentByHash throws UnsupportedBackendOperationException`() {
        assertFailsWith<UnsupportedBackendOperationException> {
            runBlocking { service.getOutgoingPaymentByHash("abc123") }
        }
    }

    @Test
    fun `payOffer throws UnsupportedBackendOperationException`() {
        assertFailsWith<UnsupportedBackendOperationException> {
            runBlocking { service.payOffer(PayOfferRequest(offer = "lno...", amountSat = 100, message = null)) }
        }
    }

    // endregion

    // region readiness gate (I4)

    @Test
    fun `routes block until backend is ready and surface the failure when init fails`() =
        runBlocking<Unit> {
            val client: NwcClientPort = mock()
            val notReady = NwcService(client, walletPubkey, CoroutineScope(SupervisorJob()))
            val cause = RuntimeException("relay handshake failed")
            notReady.markFailed(cause)

            val thrown = assertFailsWith<RuntimeException> { notReady.getBalance() }
            assertEquals("relay handshake failed", thrown.message)
        }

    // endregion

    // region resource cleanup (I2)

    @Test
    fun `close cancels coroutine scope and closes underlying NWC client`() {
        val client: NwcClientPort = mock()
        val scope = CoroutineScope(SupervisorJob())
        val svc = NwcService(client, walletPubkey, scope).also { it.markReady() }

        svc.close()

        verify(client).close()
        assertEquals(false, scope.isActive)
    }

    // endregion
}
