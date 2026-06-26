package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.db.tables.PaymentEntity
import pos.ambrosia.db.tables.ProductEntity
import pos.ambrosia.models.StoreCheckoutItem
import pos.ambrosia.models.StoreCheckoutRequest
import pos.ambrosia.models.phoenix.IncomingPayment
import pos.ambrosia.services.CheckoutResult
import pos.ambrosia.services.CheckoutService
import pos.ambrosia.services.PaymentVerifier
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private class FakePaymentVerifier : PaymentVerifier {
    var result: IncomingPayment? = null
    var error: Throwable? = null
    var callCount = 0

    override suspend fun getIncomingPayment(paymentHash: String): IncomingPayment {
        callCount++
        error?.let { throw it }
        return result ?: error("FakePaymentVerifier has no stubbed result for $paymentHash")
    }
}

class CheckoutServiceTest {
    private lateinit var dbFile: File
    private val verifier = FakePaymentVerifier()
    private val service = CheckoutService(verifier)

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    private fun seedUser(): String {
        val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        return ExposedTestDb.seedUser("Alice", roleId)
    }

    private fun productQuantity(productId: String): Int =
        transaction {
            ProductEntity.findById(UUID.fromString(productId))!!.quantity
        }

    private fun validStoreRequest(
        userId: String,
        items: List<StoreCheckoutItem>,
        transactionId: String? = null,
        paymentHash: String? = null,
    ) = StoreCheckoutRequest(
        userId = userId,
        items = items,
        paymentMethodId = ExposedTestDb.seedPaymentMethod("Cash"),
        currencyId = ExposedTestDb.seedCurrency("USD"),
        amount = 10.0,
        transactionId = transactionId,
        ticketNotes = "",
        paymentHash = paymentHash,
    )

    private fun incomingPayment(
        paymentHash: String,
        isPaid: Boolean,
    ) = IncomingPayment(
        type = "incoming_payment",
        subType = "lightning",
        paymentHash = paymentHash,
        isPaid = isPaid,
        receivedSat = 0,
        fees = 0,
        createdAt = 0,
    )

    @Test
    fun `checkout returns Invalid when items list is empty`() {
        runBlocking {
            val userId = seedUser()
            val result = service.checkout(validStoreRequest(userId, items = emptyList()))
            assertTrue(result is CheckoutResult.Invalid)
        }
    }

    @Test
    fun `checkout returns Invalid when any item has quantity zero`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 0, 500))
            val result = service.checkout(validStoreRequest(userId, items = items))
            assertTrue(result is CheckoutResult.Invalid)
        }
    }

    @Test
    fun `checkout returns Invalid when any item has negative quantity`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, -1, 500))
            val result = service.checkout(validStoreRequest(userId, items = items))
            assertTrue(result is CheckoutResult.Invalid)
        }
    }

    @Test
    fun `checkout returns Success with unique non-blank IDs when paymentHash is absent`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 2, 500))
            val result = service.checkout(validStoreRequest(userId, items = items))

            assertTrue(result is CheckoutResult.Success)
            assertFalse(result.alreadyExisted)
            val response = result.response
            assertTrue(response.orderId.isNotBlank())
            assertTrue(response.ticketId.isNotBlank())
            assertTrue(response.paymentId.isNotBlank())
            assertEquals(3, setOf(response.orderId, response.ticketId, response.paymentId).size)
            assertEquals(0, verifier.callCount)
        }
    }

    @Test
    fun `checkout decrements stock for each item on success`() {
        runBlocking {
            val userId = seedUser()
            val productId1 = ExposedTestDb.seedProduct(quantity = 10)
            val productId2 = ExposedTestDb.seedProduct(quantity = 20)
            val items =
                listOf(
                    StoreCheckoutItem(productId1, 1, 100),
                    StoreCheckoutItem(productId2, 3, 200),
                )
            val result = service.checkout(validStoreRequest(userId, items = items))

            assertTrue(result is CheckoutResult.Success)
            assertEquals(9, productQuantity(productId1))
            assertEquals(17, productQuantity(productId2))
        }
    }

    @Test
    fun `checkout uses empty string when transactionId is null`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 1, 100))
            val result = service.checkout(validStoreRequest(userId, items = items, transactionId = null))

            assertTrue(result is CheckoutResult.Success)
            val transactionId =
                transaction {
                    PaymentEntity.findById(UUID.fromString(result.response.paymentId))!!.transactionId
                }
            assertEquals("", transactionId)
        }
    }

    @Test
    fun `checkout stores provided transactionId`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 1, 100))
            val result = service.checkout(validStoreRequest(userId, items = items, transactionId = "lnbc123"))

            assertTrue(result is CheckoutResult.Success)
            val transactionId =
                transaction {
                    PaymentEntity.findById(UUID.fromString(result.response.paymentId))!!.transactionId
                }
            assertEquals("lnbc123", transactionId)
        }
    }

    @Test
    fun `checkout returns Invalid and does not persist anything when stock is insufficient`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 1)
            val items = listOf(StoreCheckoutItem(productId, 5, 500))
            val result = service.checkout(validStoreRequest(userId, items = items))

            assertTrue(result is CheckoutResult.Invalid)
            assertEquals(1, productQuantity(productId))
            assertTrue(service.getStoreOrders().isEmpty())
        }
    }

    @Test
    fun `checkout rolls back when second item has insufficient stock`() {
        runBlocking {
            val userId = seedUser()
            val productId1 = ExposedTestDb.seedProduct(quantity = 10)
            val productId2 = ExposedTestDb.seedProduct(quantity = 1)
            val items =
                listOf(
                    StoreCheckoutItem(productId1, 1, 100),
                    StoreCheckoutItem(productId2, 999, 200),
                )
            val result = service.checkout(validStoreRequest(userId, items = items))

            assertTrue(result is CheckoutResult.Invalid)
            assertEquals(10, productQuantity(productId1))
            assertEquals(1, productQuantity(productId2))
            assertTrue(service.getStoreOrders().isEmpty())
        }
    }

    @Test
    fun `checkout returns NotPaid when phoenix has not confirmed the payment`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 1, 100))
            verifier.result = incomingPayment(paymentHash = "hash-pending", isPaid = false)

            val result = service.checkout(validStoreRequest(userId, items = items, paymentHash = "hash-pending"))

            assertTrue(result is CheckoutResult.NotPaid)
            assertEquals(10, productQuantity(productId))
            assertTrue(service.getStoreOrders().isEmpty())
        }
    }

    @Test
    fun `checkout returns NotPaid when phoenix lookup fails`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 1, 100))
            verifier.error = RuntimeException("phoenix unreachable")

            val result = service.checkout(validStoreRequest(userId, items = items, paymentHash = "hash-unknown"))

            assertTrue(result is CheckoutResult.NotPaid)
            assertTrue(service.getStoreOrders().isEmpty())
        }
    }

    @Test
    fun `checkout creates a new order when phoenix confirms the BTC payment is paid`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 1, 100))
            verifier.result = incomingPayment(paymentHash = "hash-paid", isPaid = true)

            val result = service.checkout(validStoreRequest(userId, items = items, paymentHash = "hash-paid"))

            assertTrue(result is CheckoutResult.Success)
            assertFalse(result.alreadyExisted)
            assertEquals(9, productQuantity(productId))
        }
    }

    @Test
    fun `checkout returns existing order when paymentHash already recorded`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 1, 100))
            verifier.result = incomingPayment(paymentHash = "hash-recovered", isPaid = true)
            val request = validStoreRequest(userId, items = items, paymentHash = "hash-recovered")

            val first = service.checkout(request)
            assertTrue(first is CheckoutResult.Success)
            assertFalse(first.alreadyExisted)

            val second = service.checkout(request)
            assertTrue(second is CheckoutResult.Success)
            assertTrue(second.alreadyExisted)
            assertEquals(first.response.orderId, second.response.orderId)
            assertEquals(first.response.ticketId, second.response.ticketId)
            assertEquals(first.response.paymentId, second.response.paymentId)

            // Only one order persisted — the recovered checkout must not duplicate.
            assertEquals(1, service.getStoreOrders().size)
            assertEquals(9, productQuantity(productId))
        }
    }

    @Test
    fun `getStoreOrders returns empty list when no orders found`() {
        runBlocking {
            assertTrue(service.getStoreOrders().isEmpty())
        }
    }

    @Test
    fun `getStoreOrders returns store orders with items after checkout`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(name = "Widget", quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 2, 500))
            val checkout = service.checkout(validStoreRequest(userId, items = items))
            assertTrue(checkout is CheckoutResult.Success)

            val result = service.getStoreOrders()
            assertEquals(1, result.size)
            assertEquals(checkout.response.orderId, result[0].id)
            assertEquals(1, result[0].items.size)
            assertEquals(productId, result[0].items[0].productId)
        }
    }

    @Test
    fun `getStoreOrders filters by status`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 1, 100))
            service.checkout(validStoreRequest(userId, items = items))

            assertEquals(1, service.getStoreOrders(status = "paid").size)
            assertTrue(service.getStoreOrders(status = "open").isEmpty())
        }
    }

    @Test
    fun `getStoreOrderById returns null when order not found`() {
        runBlocking {
            assertEquals(null, service.getStoreOrderById(UUID.randomUUID().toString()))
        }
    }

    @Test
    fun `getStoreOrderById returns order when found`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 1, 100))
            val checkout = service.checkout(validStoreRequest(userId, items = items))
            assertTrue(checkout is CheckoutResult.Success)

            val result = service.getStoreOrderById(checkout.response.orderId)
            assertEquals(checkout.response.orderId, result?.id)
        }
    }

    @Test
    fun `cancelStoreOrder returns true when order is open`() {
        runBlocking {
            val userId = seedUser()
            val orderId = ExposedTestDb.seedOrder(userId, status = "open")
            assertTrue(service.cancelStoreOrder(orderId))
            assertEquals("closed", service.getStoreOrderById(orderId)?.status)
        }
    }

    @Test
    fun `cancelStoreOrder returns false when order not found`() {
        runBlocking {
            assertFalse(service.cancelStoreOrder(UUID.randomUUID().toString()))
        }
    }

    @Test
    fun `cancelStoreOrder returns false when order already closed`() {
        runBlocking {
            val userId = seedUser()
            val orderId = ExposedTestDb.seedOrder(userId, status = "closed")
            assertFalse(service.cancelStoreOrder(orderId))
        }
    }

    @Test
    fun `findCheckoutByPaymentHash returns null when not found`() {
        runBlocking {
            assertEquals(null, service.findCheckoutByPaymentHash("non-existent-hash"))
        }
    }

    @Test
    fun `findCheckoutByPaymentHash returns checkout info when found`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 1, 100))
            verifier.result = incomingPayment(paymentHash = "hash-123", isPaid = true)
            val checkout = service.checkout(validStoreRequest(userId, items = items, paymentHash = "hash-123"))
            assertTrue(checkout is CheckoutResult.Success)

            val result = service.findCheckoutByPaymentHash("hash-123")
            assertEquals("completed", result?.get("status"))
            assertEquals(checkout.response.orderId, result?.get("orderId"))
            assertEquals(checkout.response.ticketId, result?.get("ticketId"))
            assertEquals(checkout.response.paymentId, result?.get("paymentId"))
        }
    }
}
