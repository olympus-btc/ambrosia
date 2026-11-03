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
    var stubbedIncomingPayment: IncomingPayment? = null
    var stubbedError: Throwable? = null
    var callCount = 0

    override suspend fun getIncomingPayment(paymentHash: String): IncomingPayment {
        callCount++
        stubbedError?.let { throw it }
        return stubbedIncomingPayment ?: error("FakePaymentVerifier has no stubbed result for $paymentHash")
    }
}

class CheckoutServiceTest {
    private lateinit var databaseFile: File
    private val variantService = ProductVariantService()
    private val verifier = FakePaymentVerifier()
    private val service = CheckoutService(verifier)

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    private fun seedUser(): String {
        val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        return ExposedTestDb.seedUser("Alice", roleId)
    }

    private fun productQuantity(productId: String): Int = variantService.getVariants(productId).sumOf { it.quantity }

    private fun validStoreRequest(
        userId: String,
        checkoutItems: List<StoreCheckoutItem>,
        transactionId: String? = null,
        paymentHash: String? = null,
        satoshiAmount: Long? = null,
        discountAmount: Double = 0.0,
        tipAmount: Double = 0.0,
    ) = StoreCheckoutRequest(
        userId = userId,
        items = checkoutItems,
        paymentMethodId = ExposedTestDb.seedPaymentMethod("Cash"),
        currencyId = ExposedTestDb.seedCurrency("USD"),
        amount = 10.0,
        transactionId = transactionId,
        ticketNotes = "",
        paymentHash = paymentHash,
        satoshiAmount = satoshiAmount,
        discountAmount = discountAmount,
        tipAmount = tipAmount,
    )

    private fun incomingPayment(
        paymentHash: String,
        isPaid: Boolean,
        receivedSat: Long = 0,
    ) = IncomingPayment(
        type = "incoming_payment",
        subType = "lightning",
        paymentHash = paymentHash,
        isPaid = isPaid,
        receivedSat = receivedSat,
        fees = 0,
        createdAt = 0,
    )

    @Test
    fun `checkout returns Invalid when items list is empty`() {
        runBlocking {
            val userId = seedUser()
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = emptyList()))
            assertTrue(checkoutResult is CheckoutResult.Invalid)
            assertEquals("checkout_empty", checkoutResult.code)
        }
    }

    @Test
    fun `checkout returns Invalid when any item has quantity zero`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 0, priceAtOrder = 500))
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))
            assertTrue(checkoutResult is CheckoutResult.Invalid)
            assertEquals("checkout_invalid_quantity", checkoutResult.code)
        }
    }

    @Test
    fun `checkout returns Invalid when any item has negative quantity`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = -1, priceAtOrder = 500))
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))
            assertTrue(checkoutResult is CheckoutResult.Invalid)
        }
    }

    @Test
    fun `checkout returns Invalid when tip amount is negative or non-finite`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 500))

            listOf(-1.0, Double.NaN, Double.POSITIVE_INFINITY).forEach { invalidTip ->
                val checkoutResult =
                    service.checkout(validStoreRequest(userId, checkoutItems, tipAmount = invalidTip))
                assertTrue(checkoutResult is CheckoutResult.Invalid)
                assertEquals("checkout_invalid_tip", checkoutResult.code)
            }
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

            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))

            assertTrue(checkoutResult is CheckoutResult.Invalid)
            assertEquals("checkout_invalid_reference", checkoutResult.code)
            assertTrue(transaction { OrderEntity.all().toList() }.isEmpty())
        }
    }

    @Test
    fun `checkout returns Success with unique non-blank IDs when paymentHash is absent`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 2, priceAtOrder = 500))
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))

            assertTrue(checkoutResult is CheckoutResult.Success)
            assertFalse(checkoutResult.alreadyExisted)
            val checkoutResponse = checkoutResult.response
            assertTrue(checkoutResponse.orderId.isNotBlank())
            assertTrue(checkoutResponse.ticketId.isNotBlank())
            assertTrue(checkoutResponse.paymentId.isNotBlank())
            assertEquals(3, setOf(checkoutResponse.orderId, checkoutResponse.ticketId, checkoutResponse.paymentId).size)
            assertEquals(0, verifier.callCount)
        }
    }

    @Test
    fun `checkout decrements stock for each item on success`() {
        runBlocking {
            val userId = seedUser()
            val productId1 = ExposedTestDb.seedProduct(quantity = 10)
            val productId2 = ExposedTestDb.seedProduct(quantity = 20)
            val checkoutItems =
                listOf(
                    StoreCheckoutItem(productId = productId1, quantity = 1, priceAtOrder = 100),
                    StoreCheckoutItem(productId = productId2, quantity = 3, priceAtOrder = 200),
                )
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))

            assertTrue(checkoutResult is CheckoutResult.Success)
            assertEquals(9, productQuantity(productId1))
            assertEquals(17, productQuantity(productId2))
        }
    }

    @Test
    fun `checkout succeeds without stock for a product that does not track stock`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(name = "Consulting", quantity = 0, trackStock = false)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 3, priceAtOrder = 500))
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))

            assertTrue(checkoutResult is CheckoutResult.Success)
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
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))

            val before = LocalDateTime.now(zoneId)
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))
            val after = LocalDateTime.now(zoneId)

            assertTrue(checkoutResult is CheckoutResult.Success)
            val storedCreatedAt =
                transaction {
                    LocalDateTime.parse(OrderEntity.findById(UUID.fromString(checkoutResult.response.orderId))!!.createdAt)
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
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 2, priceAtOrder = 500))
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))

            assertTrue(checkoutResult is CheckoutResult.Success)
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
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))

            assertTrue(checkoutResult is CheckoutResult.Success)
            assertEquals(0, productQuantity(componentId))
        }
    }

    @Test
    fun `checkout uses empty string when transactionId is null`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            val checkoutResult =
                service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems, transactionId = null))

            assertTrue(checkoutResult is CheckoutResult.Success)
            val transactionId =
                transaction {
                    PaymentEntity.findById(UUID.fromString(checkoutResult.response.paymentId))!!.transactionId
                }
            assertEquals("", transactionId)
        }
    }

    @Test
    fun `checkout stores provided transactionId`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            val checkoutResult =
                service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems, transactionId = "lnbc123"))

            assertTrue(checkoutResult is CheckoutResult.Success)
            val transactionId =
                transaction {
                    PaymentEntity.findById(UUID.fromString(checkoutResult.response.paymentId))!!.transactionId
                }
            assertEquals("lnbc123", transactionId)
        }
    }

    @Test
    fun `checkout returns Invalid and does not persist anything when stock is insufficient`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 1)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 5, priceAtOrder = 500))
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))

            assertTrue(checkoutResult is CheckoutResult.Invalid)
            assertEquals("checkout_insufficient_stock", checkoutResult.code)
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
            val checkoutItems =
                listOf(
                    StoreCheckoutItem(productId = productId1, quantity = 1, priceAtOrder = 100),
                    StoreCheckoutItem(productId = productId2, quantity = 999, priceAtOrder = 200),
                )
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))

            assertTrue(checkoutResult is CheckoutResult.Invalid)
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
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            verifier.stubbedIncomingPayment = incomingPayment(paymentHash = "hash-pending", isPaid = false)

            val checkoutResult =
                service.checkout(
                    validStoreRequest(userId, checkoutItems = checkoutItems, paymentHash = "hash-pending"),
                )

            assertTrue(checkoutResult is CheckoutResult.NotPaid)
            assertEquals(10, productQuantity(productId))
            assertTrue(transaction { OrderEntity.all().toList() }.isEmpty())
        }
    }

    @Test
    fun `checkout returns NotPaid when phoenix lookup fails`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            verifier.stubbedError = RuntimeException("phoenix unreachable")

            val checkoutResult =
                service.checkout(
                    validStoreRequest(userId, checkoutItems = checkoutItems, paymentHash = "hash-unknown"),
                )

            assertTrue(checkoutResult is CheckoutResult.NotPaid)
            assertTrue(transaction { OrderEntity.all().toList() }.isEmpty())
        }
    }

    @Test
    fun `checkout returns Invalid when the received satoshi amount is less than the expected amount`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            verifier.stubbedIncomingPayment =
                incomingPayment(paymentHash = "hash-underpaid", isPaid = true, receivedSat = 1)

            val checkoutResult =
                service.checkout(
                    validStoreRequest(
                        userId,
                        checkoutItems = checkoutItems,
                        paymentHash = "hash-underpaid",
                        satoshiAmount = 1000,
                    ),
                )

            assertTrue(checkoutResult is CheckoutResult.Invalid)
            assertEquals("checkout_underpaid", checkoutResult.code)
            assertEquals(10, productQuantity(productId))
            assertTrue(transaction { OrderEntity.all().toList() }.isEmpty())
        }
    }

    @Test
    fun `checkout returns Invalid when satoshiAmount is missing for a Lightning payment`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            verifier.stubbedIncomingPayment =
                incomingPayment(paymentHash = "hash-no-amount", isPaid = true, receivedSat = 1000)

            val checkoutResult =
                service.checkout(
                    validStoreRequest(
                        userId,
                        checkoutItems = checkoutItems,
                        paymentHash = "hash-no-amount",
                        satoshiAmount = null,
                    ),
                )

            assertTrue(checkoutResult is CheckoutResult.Invalid)
            assertEquals("checkout_underpaid", checkoutResult.code)
        }
    }

    @Test
    fun `checkout succeeds when the received satoshi amount exceeds the expected amount`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            verifier.stubbedIncomingPayment =
                incomingPayment(paymentHash = "hash-overpaid", isPaid = true, receivedSat = 1500)

            val checkoutResult =
                service.checkout(
                    validStoreRequest(
                        userId,
                        checkoutItems = checkoutItems,
                        paymentHash = "hash-overpaid",
                        satoshiAmount = 1000,
                    ),
                )

            assertTrue(checkoutResult is CheckoutResult.Success)
        }
    }

    @Test
    fun `checkout creates a new order when phoenix confirms the BTC payment is paid`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            verifier.stubbedIncomingPayment =
                incomingPayment(paymentHash = "hash-paid", isPaid = true, receivedSat = 1000)

            val checkoutResult =
                service.checkout(
                    validStoreRequest(
                        userId,
                        checkoutItems = checkoutItems,
                        paymentHash = "hash-paid",
                        satoshiAmount = 1000,
                    ),
                )

            assertTrue(checkoutResult is CheckoutResult.Success)
            assertFalse(checkoutResult.alreadyExisted)
            assertEquals(9, productQuantity(productId))
        }
    }

    @Test
    fun `checkout returns existing order when paymentHash already recorded`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            verifier.stubbedIncomingPayment =
                incomingPayment(paymentHash = "hash-recovered", isPaid = true, receivedSat = 1000)
            val checkoutRequest =
                validStoreRequest(
                    userId,
                    checkoutItems = checkoutItems,
                    paymentHash = "hash-recovered",
                    satoshiAmount = 1000,
                )

            val firstCheckoutResult = service.checkout(checkoutRequest)
            assertTrue(firstCheckoutResult is CheckoutResult.Success)
            assertFalse(firstCheckoutResult.alreadyExisted)

            val secondCheckoutResult = service.checkout(checkoutRequest)
            assertTrue(secondCheckoutResult is CheckoutResult.Success)
            assertTrue(secondCheckoutResult.alreadyExisted)
            assertEquals(firstCheckoutResult.response.orderId, secondCheckoutResult.response.orderId)
            assertEquals(firstCheckoutResult.response.ticketId, secondCheckoutResult.response.ticketId)
            assertEquals(firstCheckoutResult.response.paymentId, secondCheckoutResult.response.paymentId)

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
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            verifier.stubbedIncomingPayment =
                incomingPayment(paymentHash = "hash-123", isPaid = true, receivedSat = 1000)
            val checkoutResult =
                service.checkout(
                    validStoreRequest(
                        userId,
                        checkoutItems = checkoutItems,
                        paymentHash = "hash-123",
                        satoshiAmount = 1000,
                    ),
                )
            assertTrue(checkoutResult is CheckoutResult.Success)

            val foundCheckoutInfo = service.findCheckoutByPaymentHash("hash-123")
            assertEquals("completed", foundCheckoutInfo?.get("status"))
            assertEquals(checkoutResult.response.orderId, foundCheckoutInfo?.get("orderId"))
            assertEquals(checkoutResult.response.ticketId, foundCheckoutInfo?.get("ticketId"))
            assertEquals(checkoutResult.response.paymentId, foundCheckoutInfo?.get("paymentId"))
        }
    }

    @Test
    fun `checkout persists discountAmount on the order`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            val checkoutResult =
                service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems, discountAmount = 1.0))

            assertTrue(checkoutResult is CheckoutResult.Success)
            val persistedDiscountAmount =
                transaction {
                    OrderEntity.findById(UUID.fromString(checkoutResult.response.orderId))!!.discountAmount
                }
            assertEquals(1.0, persistedDiscountAmount)
        }
    }

    @Test
    fun `checkout persists zero discountAmount when not provided`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(quantity = 10)
            val checkoutItems = listOf(StoreCheckoutItem(productId = productId, quantity = 1, priceAtOrder = 100))
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))

            assertTrue(checkoutResult is CheckoutResult.Success)
            val persistedDiscountAmount =
                transaction {
                    OrderEntity.findById(UUID.fromString(checkoutResult.response.orderId))!!.discountAmount
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
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))

            assertTrue(checkoutResult is CheckoutResult.Success)
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
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))

            assertTrue(checkoutResult is CheckoutResult.Success)
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
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))

            assertTrue(checkoutResult is CheckoutResult.Success)
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
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))

            assertTrue(checkoutResult is CheckoutResult.Success)
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
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))

            assertTrue(checkoutResult is CheckoutResult.Invalid)
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
            val checkoutResult = service.checkout(validStoreRequest(userId, checkoutItems = checkoutItems))

            assertTrue(checkoutResult is CheckoutResult.Invalid)
            assertEquals(5, productQuantity(regularProductId))
            assertEquals(1, productQuantity(componentId))
            assertTrue(transaction { OrderEntity.all().toList() }.isEmpty())
        }
    }
}
