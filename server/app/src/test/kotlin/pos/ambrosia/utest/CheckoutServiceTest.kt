package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.db.tables.PaymentEntity
import pos.ambrosia.db.tables.ProductEntity
import pos.ambrosia.models.StoreCheckoutItem
import pos.ambrosia.models.StoreCheckoutRequest
import pos.ambrosia.services.CheckoutService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class CheckoutServiceTest {
    private lateinit var dbFile: File
    private val service = CheckoutService()

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
    ) = StoreCheckoutRequest(
        userId = userId,
        items = items,
        paymentMethodId = ExposedTestDb.seedPaymentMethod("Cash"),
        currencyId = ExposedTestDb.seedCurrency("USD"),
        amount = 10.0,
        transactionId = transactionId,
        ticketNotes = "",
    )

    @Test
    fun `checkout returns null when items list is empty`() {
        runBlocking {
            val userId = seedUser()
            val result = service.checkout(validStoreRequest(userId, items = emptyList()))
            assertNull(result)
        }
    }

    @Test
    fun `checkout returns null when any item has quantity zero`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 0, 500))
            val result = service.checkout(validStoreRequest(userId, items = items))
            assertNull(result)
        }
    }

    @Test
    fun `checkout returns null when any item has negative quantity`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, -1, 500))
            val result = service.checkout(validStoreRequest(userId, items = items))
            assertNull(result)
        }
    }

    @Test
    fun `checkout returns StoreCheckoutResponse with unique non-blank IDs on success`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 2, 500))
            val result = service.checkout(validStoreRequest(userId, items = items))

            assertNotNull(result)
            assertTrue(result.orderId.isNotBlank())
            assertTrue(result.ticketId.isNotBlank())
            assertTrue(result.paymentId.isNotBlank())
            assertEquals(3, setOf(result.orderId, result.ticketId, result.paymentId).size)
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

            assertNotNull(result)
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

            assertNotNull(result)
            val transactionId =
                transaction {
                    PaymentEntity.findById(UUID.fromString(result.paymentId))!!.transactionId
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

            assertNotNull(result)
            val transactionId =
                transaction {
                    PaymentEntity.findById(UUID.fromString(result.paymentId))!!.transactionId
                }
            assertEquals("lnbc123", transactionId)
        }
    }

    @Test
    fun `checkout returns null and does not persist anything when stock is insufficient`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 1)
            val items = listOf(StoreCheckoutItem(productId, 5, 500))
            val result = service.checkout(validStoreRequest(userId, items = items))

            assertNull(result)
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

            assertNull(result)
            assertEquals(10, productQuantity(productId1))
            assertEquals(1, productQuantity(productId2))
            assertTrue(service.getStoreOrders().isEmpty())
        }
    }

    @Test
    fun `getStoreOrders returns empty list when no orders found`() {
        runBlocking {
            val result = service.getStoreOrders()
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getStoreOrders returns store orders with items after checkout`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(name = "Widget", quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 2, 500))
            val checkout = service.checkout(validStoreRequest(userId, items = items))
            assertNotNull(checkout)

            val result = service.getStoreOrders()
            assertEquals(1, result.size)
            assertEquals(checkout.orderId, result[0].id)
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
            val result = service.getStoreOrderById(UUID.randomUUID().toString())
            assertNull(result)
        }
    }

    @Test
    fun `getStoreOrderById returns order when found`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId, 1, 100))
            val checkout = service.checkout(validStoreRequest(userId, items = items))
            assertNotNull(checkout)

            val result = service.getStoreOrderById(checkout.orderId)
            assertNotNull(result)
            assertEquals(checkout.orderId, result.id)
        }
    }

    @Test
    fun `cancelStoreOrder returns true when order is open`() {
        runBlocking {
            val userId = seedUser()
            val orderId = ExposedTestDb.seedOrder(userId, status = "open")
            val result = service.cancelStoreOrder(orderId)
            assertTrue(result)

            val cancelled = service.getStoreOrderById(orderId)
            assertEquals("closed", cancelled?.status)
        }
    }

    @Test
    fun `cancelStoreOrder returns false when order not found`() {
        runBlocking {
            val result = service.cancelStoreOrder(UUID.randomUUID().toString())
            assertFalse(result)
        }
    }

    @Test
    fun `cancelStoreOrder returns false when order already closed`() {
        runBlocking {
            val userId = seedUser()
            val orderId = ExposedTestDb.seedOrder(userId, status = "closed")
            val result = service.cancelStoreOrder(orderId)
            assertFalse(result)
        }
    }

    @Test
    fun `findCheckoutByPaymentHash returns null when not found`() {
        runBlocking {
            val result = service.findCheckoutByPaymentHash("non-existent-hash")
            assertNull(result)
        }
    }

    @Test
    fun `findCheckoutByPaymentHash returns checkout info when found`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val paymentMethodId = ExposedTestDb.seedPaymentMethod("Cash")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val request =
                StoreCheckoutRequest(
                    userId = userId,
                    items = listOf(StoreCheckoutItem(productId, 1, 100)),
                    paymentMethodId = paymentMethodId,
                    currencyId = currencyId,
                    amount = 10.0,
                    paymentHash = "hash-123",
                    ticketNotes = "",
                )
            val checkout = service.checkout(request)
            assertNotNull(checkout)

            val result = service.findCheckoutByPaymentHash("hash-123")
            assertNotNull(result)
            assertEquals("completed", result["status"])
            assertEquals(checkout.orderId, result["orderId"])
            assertEquals(checkout.ticketId, result["ticketId"])
            assertEquals(checkout.paymentId, result["paymentId"])
        }
    }
}
