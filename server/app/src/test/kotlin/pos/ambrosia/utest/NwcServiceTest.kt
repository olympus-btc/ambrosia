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
import pos.ambrosia.api.PaymentNotification
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
    private val defaultNip47Info = Nip47Info(pubkey = null, network = "mainnet")

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

    @Test
    fun `getBalance converts millisats to sats`() =
        runBlocking {
            whenever(mockClient.getBalance()).thenReturn(Nip47Balance(balanceMsat = 42_340_000L))

            val balance = service.getBalance()

            assertEquals(42_340L, balance.balanceSat)
            assertEquals(0L, balance.feeCreditSat)
        }

    @Test
    fun `getNodeInfo uses wallet pubkey as fallback when NWC omits it`() =
        runBlocking {
            whenever(mockClient.getInfo()).thenReturn(defaultNip47Info)

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
            whenever(mockClient.getInfo()).thenReturn(defaultNip47Info)

            assertEquals(emptyList(), service.getNodeInfo().channels)
        }

    @Test
    fun `getNodeInfo returns unknown chain when network field is absent`() =
        runBlocking {
            whenever(mockClient.getInfo()).thenReturn(Nip47Info(pubkey = null, network = null))

            assertEquals("unknown", service.getNodeInfo().chain)
        }

    @Test
    fun `getNodeInfo includes lud16 when the service was constructed with one`() =
        runBlocking {
            val serviceWithLud16 =
                NwcService(mockClient, walletPubkey, CoroutineScope(SupervisorJob()), lud16 = "wallet@example.com")
                    .also { it.markReady() }
            whenever(mockClient.getInfo()).thenReturn(defaultNip47Info)

            assertEquals("wallet@example.com", serviceWithLud16.getNodeInfo().lud16)
        }

    @Test
    fun `getNodeInfo omits lud16 when the service was constructed without one`() =
        runBlocking {
            whenever(mockClient.getInfo()).thenReturn(defaultNip47Info)

            assertEquals(null, service.getNodeInfo().lud16)
        }

    @Test
    fun `getNodeInfo does not make a redundant get_balance round-trip`() =
        runBlocking<Unit> {
            whenever(mockClient.getInfo()).thenReturn(defaultNip47Info)

            service.getNodeInfo()

            org.mockito.kotlin
                .verify(mockClient, org.mockito.kotlin.never())
                .getBalance()
        }

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

    @Test
    fun `payInvoice wraps a service error as UnsupportedBackendOperationException when an amount override was requested`() {
        runBlocking {
            whenever(mockClient.payInvoice(any(), any())).thenThrow(
                NwcServiceException("NWC pay_invoice failed: [INTERNAL] 0-amount invoices not supported"),
            )

            assertFailsWith<UnsupportedBackendOperationException> {
                service.payInvoice(PayInvoiceRequest(invoice = "lnbc...", amountSat = 42L))
            }
        }
    }

    @Test
    fun `payInvoice propagates the original service error when no amount override was requested`() {
        runBlocking {
            whenever(mockClient.payInvoice(any(), isNull())).thenThrow(
                NwcServiceException("NWC pay_invoice failed: [PAYMENT_FAILED] no route"),
            )

            assertFailsWith<NwcServiceException> {
                service.payInvoice(PayInvoiceRequest(invoice = "lnbc...", amountSat = null))
            }
        }
    }

    @Test
    fun `listIncomingPayments converts feesPaid from millisats to sats`() =
        runBlocking {
            whenever(mockClient.listTransactions(anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull())).thenReturn(
                listOf(
                    Nip47Transaction(
                        type = "incoming",
                        paymentHash = "hash1",
                        amount = 10_000L * 1000,
                        feesPaid = 1L * 1000,
                        settledAt = 1700000000L,
                    ),
                ),
            )

            val payments = service.listIncomingPayments(from = 0, to = null, limit = 20, offset = 0, all = false, externalId = null)

            assertEquals(1, payments.size)
            assertEquals(1L, payments[0].fees)
        }

    @Test
    fun `listOutgoingPayments converts feesPaid from millisats to sats`() =
        runBlocking {
            whenever(mockClient.listTransactions(anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull())).thenReturn(
                listOf(
                    Nip47Transaction(
                        type = "outgoing",
                        paymentHash = "hash2",
                        amount = 5_000L * 1000,
                        feesPaid = 3L * 1000,
                        settledAt = 1700000001L,
                    ),
                ),
            )

            val payments = service.listOutgoingPayments(from = 0, to = null, limit = 20, offset = 0, all = false)

            assertEquals(1, payments.size)
            assertEquals(3L, payments[0].fees)
        }

    @Test
    fun `listIncomingPayments converts NIP-47 timestamps from seconds to milliseconds`() =
        runBlocking {
            whenever(mockClient.listTransactions(anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull())).thenReturn(
                listOf(
                    Nip47Transaction(
                        type = "incoming",
                        paymentHash = "hash3",
                        amount = 10_000_000L,
                        settledAt = 1700000000L,
                        createdAt = 1699999000L,
                        expiresAt = 1700003600L,
                    ),
                ),
            )

            val payments = service.listIncomingPayments(from = 0, to = null, limit = 20, offset = 0, all = false, externalId = null)

            assertEquals(1700000000000L, payments[0].completedAt)
            assertEquals(1699999000000L, payments[0].createdAt)
            assertEquals(1700003600000L, payments[0].expiresAt)
        }

    @Test
    fun `listOutgoingPayments converts NIP-47 timestamps from seconds to milliseconds`() =
        runBlocking {
            whenever(mockClient.listTransactions(anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull())).thenReturn(
                listOf(
                    Nip47Transaction(
                        type = "outgoing",
                        paymentHash = "hash4",
                        amount = 5_000_000L,
                        settledAt = 1700000001L,
                        createdAt = 1699999001L,
                    ),
                ),
            )

            val payments = service.listOutgoingPayments(from = 0, to = null, limit = 20, offset = 0, all = false)

            assertEquals(1700000001000L, payments[0].completedAt)
            assertEquals(1699999001000L, payments[0].createdAt)
        }

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
    fun `pollPendingInvoices notifies incoming payment handler when invoice settles`() {
        runBlocking {
            val receivedNotifications = mutableListOf<PaymentNotification>()
            val notifyingService =
                NwcService(
                    mockClient,
                    walletPubkey,
                    CoroutineScope(SupervisorJob()),
                    onIncomingPaymentReceived = { paymentNotification ->
                        receivedNotifications.add(paymentNotification)
                    },
                ).also { it.markReady() }
            whenever(mockClient.makeInvoice(any(), any(), anyOrNull())).thenReturn(
                Nip47Transaction(paymentHash = "settled_hash", invoice = "lnbc..."),
            )
            whenever(mockClient.listTransactions(anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull())).thenReturn(
                listOf(Nip47Transaction(paymentHash = "settled_hash", amount = 10_000L, settledAt = 1700000000L)),
            )

            notifyingService.createInvoice(CreateInvoiceRequest(amountSat = 10, description = ""))
            notifyingService.pollPendingInvoices()

            assertEquals(
                PaymentNotification(
                    type = "payment_received",
                    timestamp = 1700000000L,
                    amountSat = 10L,
                    paymentHash = "settled_hash",
                ),
                receivedNotifications.single(),
            )
        }
    }

    @Test
    fun `pollPendingInvoices keeps unsettled invoices for next poll cycle`() {
        runBlocking {
            whenever(mockClient.makeInvoice(any(), any(), anyOrNull())).thenReturn(
                Nip47Transaction(paymentHash = "pending_hash", invoice = "lnbc..."),
            )
            whenever(mockClient.listTransactions(anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull(), anyOrNull())).thenReturn(
                emptyList(),
            )

            service.createInvoice(CreateInvoiceRequest(amountSat = 10, description = ""))
            service.pollPendingInvoices()
            service.pollPendingInvoices()

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

    @Test
    fun `close cancels coroutine scope and closes underlying NWC client`() {
        val client: NwcClientPort = mock()
        val scope = CoroutineScope(SupervisorJob())
        val serviceToClose = NwcService(client, walletPubkey, scope).also { it.markReady() }

        serviceToClose.close()

        verify(client).close()
        assertEquals(false, scope.isActive)
    }
}
