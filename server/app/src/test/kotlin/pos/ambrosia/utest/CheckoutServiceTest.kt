package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.db.tables.OrderEntity
import pos.ambrosia.db.tables.PaymentEntity
import pos.ambrosia.models.StoreCheckoutItem
import pos.ambrosia.models.StoreCheckoutRequest
import pos.ambrosia.models.UpsertVariantRequest
import pos.ambrosia.models.phoenix.IncomingPayment
import pos.ambrosia.services.CheckoutResult
import pos.ambrosia.services.CheckoutService
import pos.ambrosia.services.PaymentVerifier
import pos.ambrosia.services.ProductVariantService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.time.LocalDateTime
import java.time.ZoneId
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
    private val variantService = ProductVariantService()
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

    private fun productQuantity(productId: String): Int = variantService.getVariants(productId).sumOf { it.quantity }

    private fun validStoreRequest(
        userId: String,
        items: List<StoreCheckoutItem>,
        transactionId: String? = null,
        paymentHash: String? = null,
        discountAmount: Double = 0.0,
    ) = StoreCheckoutRequest(
        userId = userId,
        items = items,
        paymentMethodId = ExposedTestDb.seedPaymentMethod("Cash"),
        currencyId = ExposedTestDb.seedCurrency("USD"),
        amount = 10.0,
        transactionId = transactionId,
        ticketNotes = "",
        paymentHash = paymentHash,
        discountAmount = discountAmount,
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
            assertEquals("checkout_empty", result.code)
        }
    }

    @Test
    fun `checkout returns Invalid when any item has quantity zero`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = 0, priceAtOrder = 500))
            val result = service.checkout(validStoreRequest(userId, items = items))
            assertTrue(result is CheckoutResult.Invalid)
            assertEquals("checkout_invalid_quantity", result.code)
        }
    }

    @Test
    fun `checkout returns Invalid when any item has negative quantity`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = -1, priceAtOrder = 500))
            val result = service.checkout(validStoreRequest(userId, items = items))
            assertTrue(result is CheckoutResult.Invalid)
        }
    }

    @Test
    fun `checkout returns Invalid when variant id is malformed`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val checkoutItems =
                listOf(
                    StoreCheckoutItem(
                        productId = productId,
                        variantId = "not-a-uuid",
                        quantity = 1,
                        priceAtOrder = 500,
                    ),
                )

            val result = service.checkout(validStoreRequest(userId, items = checkoutItems))

            assertTrue(result is CheckoutResult.Invalid)
            assertEquals("checkout_invalid_reference", result.code)
            assertTrue(transaction { OrderEntity.all().toList() }.isEmpty())
        }
    }

    @Test
    fun `checkout returns Success with unique non-blank IDs when paymentHash is absent`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = 2, priceAtOrder = 500))
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
                    StoreCheckoutItem(productId = productId1, quantity = 1, priceAtOrder = 100),
                    StoreCheckoutItem(productId = productId2, quantity = 3, priceAtOrder = 200),
                )
            val result = service.checkout(validStoreRequest(userId, items = items))

            assertTrue(result is CheckoutResult.Success)
            assertEquals(9, productQuantity(productId1))
            assertEquals(17, productQuantity(productId2))
        }
    }

    @Test
    fun `checkout succeeds without stock for a product that does not track stock`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(name = "Consulting", quantity = 0, trackStock = false)
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = 3, priceAtOrder = 500))
            val result = service.checkout(validStoreRequest(userId, items = items))

            assertTrue(result is CheckoutResult.Success)
            assertEquals(0, productQuantity(productId))
            assertEquals(1, transaction { OrderEntity.all().toList() }.size)
        }
    }

    @Test
    fun `checkout stamps the order's createdAt using the configured timezone`() {
        runBlocking {
            ExposedTestDb.seedConfig("Pacific/Kiritimati")
            val zoneId = ZoneId.of("Pacific/Kiritimati")
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))

            val before = LocalDateTime.now(zoneId)
            val result = service.checkout(validStoreRequest(userId, items = items))
            val after = LocalDateTime.now(zoneId)

            assertTrue(result is CheckoutResult.Success)
            val storedCreatedAt =
                transaction {
                    LocalDateTime.parse(OrderEntity.findById(UUID.fromString(result.response.orderId))!!.createdAt)
                }
            assertFalse(storedCreatedAt.isBefore(before))
            assertFalse(storedCreatedAt.isAfter(after))
        }
    }

    @Test
    fun `checkout leaves stock untouched for a product that does not track stock`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(name = "Consulting", quantity = 7, trackStock = false)
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = 2, priceAtOrder = 500))
            val result = service.checkout(validStoreRequest(userId, items = items))

            assertTrue(result is CheckoutResult.Success)
            assertEquals(7, productQuantity(productId))
        }
    }

    @Test
    fun `checkout skips component deduction for an untracked bundle`() {
        runBlocking {
            val userId = seedUser()
            val componentId = ExposedTestDb.seedProduct(name = "Part", quantity = 0)
            val bundleId = ExposedTestDb.seedProduct(name = "Kit", isBundle = true, trackStock = false)
            ExposedTestDb.seedBundleComponent(bundleId, componentId, quantity = 2)

            val checkoutItems = listOf(StoreCheckoutItem(productId = bundleId, quantity = 1, priceAtOrder = 500))
            val result = service.checkout(validStoreRequest(userId, items = checkoutItems))

            assertTrue(result is CheckoutResult.Success)
            assertEquals(0, productQuantity(componentId))
        }
    }

    @Test
    fun `checkout uses empty string when transactionId is null`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
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
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
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
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = 5, priceAtOrder = 500))
            val result = service.checkout(validStoreRequest(userId, items = items))

            assertTrue(result is CheckoutResult.Invalid)
            assertEquals("checkout_insufficient_stock", result.code)
            assertEquals(1, productQuantity(productId))
            assertTrue(transaction { OrderEntity.all().toList() }.isEmpty())
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
                    StoreCheckoutItem(productId = productId1, quantity = 1, priceAtOrder = 100),
                    StoreCheckoutItem(productId = productId2, quantity = 999, priceAtOrder = 200),
                )
            val result = service.checkout(validStoreRequest(userId, items = items))

            assertTrue(result is CheckoutResult.Invalid)
            assertEquals(10, productQuantity(productId1))
            assertEquals(1, productQuantity(productId2))
            assertTrue(transaction { OrderEntity.all().toList() }.isEmpty())
        }
    }

    @Test
    fun `checkout returns NotPaid when phoenix has not confirmed the payment`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            verifier.result = incomingPayment(paymentHash = "hash-pending", isPaid = false)

            val result = service.checkout(validStoreRequest(userId, items = items, paymentHash = "hash-pending"))

            assertTrue(result is CheckoutResult.NotPaid)
            assertEquals(10, productQuantity(productId))
            assertTrue(transaction { OrderEntity.all().toList() }.isEmpty())
        }
    }

    @Test
    fun `checkout returns NotPaid when phoenix lookup fails`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            verifier.error = RuntimeException("phoenix unreachable")

            val result = service.checkout(validStoreRequest(userId, items = items, paymentHash = "hash-unknown"))

            assertTrue(result is CheckoutResult.NotPaid)
            assertTrue(transaction { OrderEntity.all().toList() }.isEmpty())
        }
    }

    @Test
    fun `checkout creates a new order when phoenix confirms the BTC payment is paid`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
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
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
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

            assertEquals(1, transaction { OrderEntity.all().toList() }.size)
            assertEquals(9, productQuantity(productId))
        }
    }

    @Test
    fun `cancelStoreOrder returns true when order is open`() {
        runBlocking {
            val userId = seedUser()
            val orderId = ExposedTestDb.seedOrder(userId, status = "open")
            assertTrue(service.cancelStoreOrder(orderId))
            assertEquals("closed", transaction { OrderEntity.findById(UUID.fromString(orderId))?.status })
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
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
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

    @Test
    fun `checkout persists discountAmount on the order`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            val result = service.checkout(validStoreRequest(userId, items = items, discountAmount = 1.0))

            assertTrue(result is CheckoutResult.Success)
            val persistedDiscountAmount =
                transaction {
                    OrderEntity.findById(UUID.fromString(result.response.orderId))!!.discountAmount
                }
            assertEquals(1.0, persistedDiscountAmount)
        }
    }

    @Test
    fun `checkout persists zero discountAmount when not provided`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val items = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            val result = service.checkout(validStoreRequest(userId, items = items))

            assertTrue(result is CheckoutResult.Success)
            val persistedDiscountAmount =
                transaction {
                    OrderEntity.findById(UUID.fromString(result.response.orderId))!!.discountAmount
                }
            assertEquals(0.0, persistedDiscountAmount)
        }
    }

    @Test
    fun `checkout deducts component stock when item is a bundle`() {
        runBlocking {
            val userId = seedUser()
            val componentId = ExposedTestDb.seedProduct(name = "Part", quantity = 10)
            val bundleId = ExposedTestDb.seedProduct(name = "Kit", isBundle = true, quantity = 0)
            ExposedTestDb.seedBundleComponent(bundleId, componentId, quantity = 2)

            val checkoutItems = listOf(StoreCheckoutItem(productId = bundleId, quantity = 1, priceAtOrder = 500))
            val result = service.checkout(validStoreRequest(userId, items = checkoutItems))

            assertTrue(result is CheckoutResult.Success)
            assertEquals(8, productQuantity(componentId))
            assertEquals(0, productQuantity(bundleId))
        }
    }

    @Test
    fun `checkout deducts only the tracked components of a bundle`() {
        runBlocking {
            val userId = seedUser()
            val trackedComponentId = ExposedTestDb.seedProduct(name = "Mug", quantity = 10)
            val untrackedComponentId = ExposedTestDb.seedProduct(name = "Coffee", quantity = 0, trackStock = false)
            val bundleId = ExposedTestDb.seedProduct(name = "Kit", isBundle = true, quantity = 0)
            ExposedTestDb.seedBundleComponent(bundleId, trackedComponentId, quantity = 1)
            ExposedTestDb.seedBundleComponent(bundleId, untrackedComponentId, quantity = 1)

            val checkoutItems = listOf(StoreCheckoutItem(productId = bundleId, quantity = 1, priceAtOrder = 500))
            val result = service.checkout(validStoreRequest(userId, items = checkoutItems))

            assertTrue(result is CheckoutResult.Success)
            assertEquals(9, productQuantity(trackedComponentId))
            assertEquals(0, productQuantity(untrackedComponentId))
        }
    }

    @Test
    fun `checkout deducts selected component variant stock when item is a bundle`() {
        runBlocking {
            val userId = seedUser()
            val componentId = ExposedTestDb.seedProduct(name = "Shirt", quantity = 10)
            val defaultVariantId = variantService.getVariants(componentId)[0].id!!
            val selectedVariantId =
                variantService.addVariant(
                    componentId,
                    UpsertVariantRequest(priceCents = 1500, costCents = 700, quantity = 6),
                )!!
            val bundleId = ExposedTestDb.seedProduct(name = "Kit", isBundle = true, quantity = 0)
            ExposedTestDb.seedBundleComponent(bundleId, componentId, componentVariantId = selectedVariantId, quantity = 2)

            val checkoutItems = listOf(StoreCheckoutItem(productId = bundleId, quantity = 2, priceAtOrder = 500))
            val result = service.checkout(validStoreRequest(userId, items = checkoutItems))

            assertTrue(result is CheckoutResult.Success)
            assertEquals(10, variantService.getVariantById(defaultVariantId)?.quantity)
            assertEquals(2, variantService.getVariantById(selectedVariantId)?.quantity)
        }
    }

    @Test
    fun `checkout deducts N times component quantity when N bundles are sold`() {
        runBlocking {
            val userId = seedUser()
            val componentId = ExposedTestDb.seedProduct(name = "Part", quantity = 12)
            val bundleId = ExposedTestDb.seedProduct(name = "Kit", isBundle = true)
            ExposedTestDb.seedBundleComponent(bundleId, componentId, quantity = 3)

            val checkoutItems = listOf(StoreCheckoutItem(productId = bundleId, quantity = 2, priceAtOrder = 500))
            val result = service.checkout(validStoreRequest(userId, items = checkoutItems))

            assertTrue(result is CheckoutResult.Success)
            assertEquals(6, productQuantity(componentId))
        }
    }

    @Test
    fun `checkout returns Invalid when a bundle component has insufficient stock`() {
        runBlocking {
            val userId = seedUser()
            val componentId = ExposedTestDb.seedProduct(name = "Part", quantity = 1)
            val bundleId = ExposedTestDb.seedProduct(name = "Kit", isBundle = true)
            ExposedTestDb.seedBundleComponent(bundleId, componentId, quantity = 2)

            val checkoutItems = listOf(StoreCheckoutItem(productId = bundleId, quantity = 1, priceAtOrder = 500))
            val result = service.checkout(validStoreRequest(userId, items = checkoutItems))

            assertTrue(result is CheckoutResult.Invalid)
            assertEquals(1, productQuantity(componentId))
            assertTrue(transaction { OrderEntity.all().toList() }.isEmpty())
        }
    }

    @Test
    fun `checkout rolls back all when bundle component stock is insufficient mid-transaction`() {
        runBlocking {
            val userId = seedUser()
            val regularProductId = ExposedTestDb.seedProduct(name = "Regular", quantity = 5)
            val componentId = ExposedTestDb.seedProduct(name = "Part", quantity = 1)
            val bundleId = ExposedTestDb.seedProduct(name = "Kit", isBundle = true)
            ExposedTestDb.seedBundleComponent(bundleId, componentId, quantity = 3)

            val checkoutItems =
                listOf(
                    StoreCheckoutItem(productId = regularProductId, quantity = 1, priceAtOrder = 100),
                    StoreCheckoutItem(productId = bundleId, quantity = 1, priceAtOrder = 500),
                )
            val result = service.checkout(validStoreRequest(userId, items = checkoutItems))

            assertTrue(result is CheckoutResult.Invalid)
            assertEquals(5, productQuantity(regularProductId))
            assertEquals(1, productQuantity(componentId))
            assertTrue(transaction { OrderEntity.all().toList() }.isEmpty())
        }
    }
}
