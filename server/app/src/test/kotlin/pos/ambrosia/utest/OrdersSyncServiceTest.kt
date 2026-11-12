package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.db.tables.OrderEntity
import pos.ambrosia.db.tables.PaymentEntity
import pos.ambrosia.db.tables.TicketEntity
import pos.ambrosia.db.tables.TicketsTable
import pos.ambrosia.models.WalletInvoiceRate
import pos.ambrosia.models.phoenix.IncomingPayment
import pos.ambrosia.services.CheckoutService
import pos.ambrosia.services.IncomingPaymentHistory
import pos.ambrosia.services.OrdersSyncService
import pos.ambrosia.services.WalletRateService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.ParsedPurchasedItem
import java.io.File
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private class FakeIncomingPaymentHistory : IncomingPaymentHistory {
    var stubbedIncomingPayments: List<IncomingPayment> = emptyList()
    val incomingPaymentsByHash = mutableMapOf<String, IncomingPayment>()

    override suspend fun listIncomingPayments(
        from: Long,
        to: Long?,
        limit: Int,
        offset: Int,
        all: Boolean,
        externalId: String?,
    ): List<IncomingPayment> = stubbedIncomingPayments

    override suspend fun getIncomingPayment(paymentHash: String): IncomingPayment =
        incomingPaymentsByHash[paymentHash]
            ?: error("FakeIncomingPaymentHistory has no stubbed payment for $paymentHash")
}

class OrdersSyncServiceTest {
    private lateinit var databaseFile: File
    private val incomingPaymentHistory = FakeIncomingPaymentHistory()
    private val checkoutService = CheckoutService()
    private val walletRateService = WalletRateService()
    private val ordersSyncService = OrdersSyncService(incomingPaymentHistory, checkoutService, walletRateService)

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
        ExposedTestDb.seedConfig("UTC")
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    private fun incomingPayment(
        paymentHash: String,
        isPaid: Boolean,
        receivedSat: Long = 1000,
        fees: Long = 0,
        description: String? = null,
        completedAt: Long? = Instant.parse("2024-01-15T12:00:00Z").toEpochMilli(),
    ) = IncomingPayment(
        type = "incoming_payment",
        subType = "lightning",
        paymentHash = paymentHash,
        description = description,
        isPaid = isPaid,
        receivedSat = receivedSat,
        fees = fees,
        completedAt = completedAt,
        createdAt = completedAt ?: 0,
    )

    private fun seedExistingOrder(
        paymentHash: String,
        date: String = "2024-01-15T18:52:00",
    ): Pair<String, String> {
        val userId = ExposedTestDb.seedUser("Alice", ExposedTestDb.seedRole("admin", isAdmin = true))
        val orderId = ExposedTestDb.seedOrder(userId, createdAt = date)
        val paymentId = ExposedTestDb.seedPayment(paymentHash = paymentHash, date = date)
        val ticketId = ExposedTestDb.seedTicket(orderId, userId, ticketDate = date)
        ExposedTestDb.seedTicketPayment(paymentId, ticketId)
        return paymentId to orderId
    }

    @Test
    fun `findPaymentsWithoutOrder returns a paid incoming payment with no matching order`() {
        runBlocking {
            incomingPaymentHistory.stubbedIncomingPayments =
                listOf(
                    incomingPayment(
                        paymentHash = "hash-without-order",
                        isPaid = true,
                        receivedSat = 21000,
                        fees = 1000,
                        description = "2x Matcha",
                    ),
                )

            val paymentsWithoutOrder = ordersSyncService.findPaymentsWithoutOrder("2024-01-01", "2024-01-31")

            assertEquals(1, paymentsWithoutOrder.size)
            assertEquals("hash-without-order", paymentsWithoutOrder[0].paymentHash)
            assertEquals(21000, paymentsWithoutOrder[0].receivedSat)
            assertEquals(1, paymentsWithoutOrder[0].feeSat)
            assertEquals(listOf(ParsedPurchasedItem("Matcha", null, 2)), paymentsWithoutOrder[0].purchasedItems)
        }
    }

    @Test
    fun `findPaymentsWithoutOrder excludes a payment that already has an order`() {
        runBlocking {
            seedExistingOrder(paymentHash = "hash-existing")
            incomingPaymentHistory.stubbedIncomingPayments =
                listOf(incomingPayment(paymentHash = "hash-existing", isPaid = true))

            val paymentsWithoutOrder = ordersSyncService.findPaymentsWithoutOrder("2024-01-01", "2024-01-31")

            assertTrue(paymentsWithoutOrder.isEmpty())
        }
    }

    @Test
    fun `findPaymentsWithoutOrder excludes a payment that was never paid`() {
        runBlocking {
            incomingPaymentHistory.stubbedIncomingPayments =
                listOf(incomingPayment(paymentHash = "hash-pending", isPaid = false))

            val paymentsWithoutOrder = ordersSyncService.findPaymentsWithoutOrder("2024-01-01", "2024-01-31")

            assertTrue(paymentsWithoutOrder.isEmpty())
        }
    }

    @Test
    fun `findPaymentsWithoutOrder excludes a payment that has a recorded wallet invoice rate`() {
        runBlocking {
            incomingPaymentHistory.stubbedIncomingPayments =
                listOf(incomingPayment(paymentHash = "hash-wallet-receive", isPaid = true))
            walletRateService.saveInvoiceRate(
                WalletInvoiceRate(
                    paymentHash = "hash-wallet-receive",
                    satoshiAmount = 1000,
                    exchangeRate = 95000.0,
                    exchangeRateCurrency = "usd",
                    fiatAmount = 0.95,
                ),
            )

            val paymentsWithoutOrder = ordersSyncService.findPaymentsWithoutOrder("2024-01-01", "2024-01-31")

            assertTrue(paymentsWithoutOrder.isEmpty())
        }
    }

    @Test
    fun `findPaymentsWithoutOrder excludes a paid payment with no completedAt`() {
        runBlocking {
            incomingPaymentHistory.stubbedIncomingPayments =
                listOf(incomingPayment(paymentHash = "hash-no-completed-at", isPaid = true, completedAt = null))

            val paymentsWithoutOrder = ordersSyncService.findPaymentsWithoutOrder("2024-01-01", "2024-01-31")

            assertTrue(paymentsWithoutOrder.isEmpty())
        }
    }

    @Test
    fun `findMisdatedOrders returns a misdated order when the recorded date drifts more than 5 minutes from the real payment time`() {
        runBlocking {
            val (paymentId, orderId) = seedExistingOrder(paymentHash = "hash-misdated", date = "2024-01-15T18:52:00")
            incomingPaymentHistory.incomingPaymentsByHash["hash-misdated"] =
                incomingPayment(
                    paymentHash = "hash-misdated",
                    isPaid = true,
                    completedAt = Instant.parse("2024-01-15T15:23:00Z").toEpochMilli(),
                )

            val misdatedOrders = ordersSyncService.findMisdatedOrders("2024-01-01", "2024-01-31")

            assertEquals(1, misdatedOrders.size)
            assertEquals(paymentId, misdatedOrders[0].paymentId)
            assertEquals(orderId, misdatedOrders[0].orderId)
        }
    }

    @Test
    fun `findMisdatedOrders excludes a payment within the 5 minute drift threshold`() {
        runBlocking {
            seedExistingOrder(paymentHash = "hash-on-time", date = "2024-01-15T15:23:00")
            incomingPaymentHistory.incomingPaymentsByHash["hash-on-time"] =
                incomingPayment(
                    paymentHash = "hash-on-time",
                    isPaid = true,
                    completedAt = Instant.parse("2024-01-15T15:25:00Z").toEpochMilli(),
                )

            val misdatedOrders = ordersSyncService.findMisdatedOrders("2024-01-01", "2024-01-31")

            assertTrue(misdatedOrders.isEmpty())
        }
    }

    @Test
    fun `findMisdatedOrders excludes a payment recorded outside the requested date range`() {
        runBlocking {
            seedExistingOrder(paymentHash = "hash-out-of-range", date = "2024-02-15T18:52:00")
            incomingPaymentHistory.incomingPaymentsByHash["hash-out-of-range"] =
                incomingPayment(
                    paymentHash = "hash-out-of-range",
                    isPaid = true,
                    completedAt = Instant.parse("2024-02-15T15:23:00Z").toEpochMilli(),
                )

            val misdatedOrders = ordersSyncService.findMisdatedOrders("2024-01-01", "2024-01-31")

            assertTrue(misdatedOrders.isEmpty())
        }
    }

    @Test
    fun `correctMisdatedOrder updates the order, ticket, and payment dates to the real payment time`() {
        runBlocking {
            val (paymentId, orderId) = seedExistingOrder(paymentHash = "hash-to-correct", date = "2024-01-15T18:52:00")
            incomingPaymentHistory.incomingPaymentsByHash["hash-to-correct"] =
                incomingPayment(
                    paymentHash = "hash-to-correct",
                    isPaid = true,
                    completedAt = Instant.parse("2024-01-15T15:23:00Z").toEpochMilli(),
                )

            val misdatedOrderWasCorrected = ordersSyncService.correctMisdatedOrder(paymentId)

            assertTrue(misdatedOrderWasCorrected)
            val (correctedPaymentDate, correctedTicketDate, correctedOrderCreatedAt) =
                transaction {
                    val payment = PaymentEntity.findById(UUID.fromString(paymentId))!!
                    val order = OrderEntity.findById(UUID.fromString(orderId))!!
                    val ticket = TicketEntity.find { TicketsTable.orderId eq order.id }.first()
                    Triple(payment.date, ticket.ticketDate, order.createdAt)
                }
            assertEquals("2024-01-15T15:23", correctedPaymentDate)
            assertEquals("2024-01-15T15:23", correctedTicketDate)
            assertEquals("2024-01-15T15:23", correctedOrderCreatedAt)
        }
    }

    @Test
    fun `correctMisdatedOrder returns false when the payment id is not a valid UUID`() {
        runBlocking {
            assertFalse(ordersSyncService.correctMisdatedOrder("not-a-uuid"))
        }
    }

    @Test
    fun `correctMisdatedOrder returns false when the payment does not exist`() {
        runBlocking {
            assertFalse(ordersSyncService.correctMisdatedOrder(UUID.randomUUID().toString()))
        }
    }

    @Test
    fun `correctMisdatedOrder returns false when the payment has no ticket associated`() {
        runBlocking {
            val paymentId = ExposedTestDb.seedPayment(paymentHash = "hash-without-ticket")
            incomingPaymentHistory.incomingPaymentsByHash["hash-without-ticket"] =
                incomingPayment(paymentHash = "hash-without-ticket", isPaid = true)

            assertFalse(ordersSyncService.correctMisdatedOrder(paymentId))
        }
    }

    @Test
    fun `correctMisdatedOrder returns false when the incoming payment lookup fails`() {
        runBlocking {
            val (paymentId, _) = seedExistingOrder(paymentHash = "hash-lookup-fails")

            assertFalse(ordersSyncService.correctMisdatedOrder(paymentId))
        }
    }

    @Test
    fun `correctMisdatedOrder returns false when the incoming payment has no completedAt`() {
        runBlocking {
            val (paymentId, _) = seedExistingOrder(paymentHash = "hash-no-completed-at")
            incomingPaymentHistory.incomingPaymentsByHash["hash-no-completed-at"] =
                incomingPayment(paymentHash = "hash-no-completed-at", isPaid = true, completedAt = null)

            assertFalse(ordersSyncService.correctMisdatedOrder(paymentId))
        }
    }
}
