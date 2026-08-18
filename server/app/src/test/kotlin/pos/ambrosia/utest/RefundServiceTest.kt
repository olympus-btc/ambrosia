package pos.ambrosia.utest

import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.HttpRequestData
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.ApplicationEnvironment
import io.ktor.server.config.ApplicationConfig
import io.ktor.server.config.ApplicationConfigValue
import io.ktor.utils.io.ByteReadChannel
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import pos.ambrosia.db.tables.OrderEntity
import pos.ambrosia.db.tables.OrdersTable
import pos.ambrosia.db.tables.RefundEntity
import pos.ambrosia.db.tables.RefundsTable
import pos.ambrosia.models.RefundRequest
import pos.ambrosia.models.UpsertVariantRequest
import pos.ambrosia.models.phoenix.OutgoingPayment
import pos.ambrosia.models.phoenix.PayInvoiceRequest
import pos.ambrosia.models.phoenix.PaymentResponse
import pos.ambrosia.services.LightningBackend
import pos.ambrosia.services.PhoenixService
import pos.ambrosia.services.ProductVariantService
import pos.ambrosia.services.RefundService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.FakeLightningBackend
import pos.ambrosia.utils.OrderAlreadyRefundedException
import pos.ambrosia.utils.OrderNotRefundableException
import pos.ambrosia.utils.ResourceNotFoundException
import pos.ambrosia.utils.UnsupportedBackendOperationException
import java.io.File
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RefundServiceTest {
    private lateinit var dbFile: File
    private val variantService = ProductVariantService()

    private val mockConfig: ApplicationConfig = mock()
    private val mockEnv: ApplicationEnvironment =
        mock {
            on { config } doReturn mockConfig
        }

    private val decodableInvoice =
        "lnbc2500u1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcy" +
            "q5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpu9qrsgquk0r" +
            "l77nj30yxdy8j9vdx85fkpmdla2087ne0xh8nhedh8w27kyke0lp53ut353s06fv3qfegext0eh0ymjpf39" +
            "tuven09sam30g4vgpfna3rh"
    private val decodableInvoiceAmountSat = 250_000L

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
        val mockUrlValue: ApplicationConfigValue = mock()
        whenever(mockUrlValue.getString()).thenReturn("http://dummy-url")
        whenever(mockConfig.property("phoenixd-url")).thenReturn(mockUrlValue)
        val mockPasswordValue: ApplicationConfigValue = mock()
        whenever(mockPasswordValue.getString()).thenReturn("dummy-password")
        whenever(mockConfig.property("phoenixd-password")).thenReturn(mockPasswordValue)
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    private class FakeNwcLightningBackend : LightningBackend by FakeLightningBackend("nwc") {
        var payInvoiceCalled = false
            private set

        override suspend fun getOutgoingPaymentByHash(paymentHash: String): OutgoingPayment =
            throw UnsupportedBackendOperationException("Outgoing payment lookup by hash is not supported with NWC backend")

        override suspend fun payInvoice(request: PayInvoiceRequest): PaymentResponse {
            payInvoiceCalled = true
            return PaymentResponse(
                recipientAmountSat = 1234,
                routingFeeSat = 0,
                paymentId = "nwc-refund-payment-id",
                paymentHash = "nwc-refund-payment-hash",
                paymentPreimage = "nwc-refund-payment-preimage",
            )
        }
    }

    private fun mockPayInvoiceJson(recipientAmountSat: Long) =
        """
        {
            "recipientAmountSat": $recipientAmountSat,
            "routingFeeSat": 0,
            "paymentId": "refund-payment-id",
            "paymentHash": "refund-payment-hash",
            "paymentPreimage": "refund-payment-preimage"
        }
        """.trimIndent()

    private fun mockOutgoingPaymentJson(
        isPaid: Boolean,
        sentSat: Long,
    ) = """
        {
            "type": "outgoing_payment",
            "subType": "lightning",
            "paymentId": "existing-payment-id",
            "paymentHash": "existing-payment-hash",
            "isPaid": $isPaid,
            "sent": $sentSat,
            "fees": 0,
            "createdAt": 0
        }
        """.trimIndent()

    private fun isOutgoingByHashRequest(request: HttpRequestData) = request.method == HttpMethod.Get

    private fun MockRequestHandleScope.respondJson(json: String) =
        respond(
            content = ByteReadChannel(json.toByteArray(Charsets.UTF_8)),
            status = HttpStatusCode.OK,
            headers = headersOf(HttpHeaders.ContentType, "application/json"),
        )

    private fun refundServiceWithHttpClient(mockEngine: MockEngine): RefundService {
        val mockHttpClient =
            HttpClient(mockEngine) {
                install(ContentNegotiation) {
                    json(Json { ignoreUnknownKeys = true })
                }
            }
        return RefundService(PhoenixService(mockEnv, mockHttpClient))
    }

    private fun refundServiceRespondingWithSats(recipientAmountSat: Long): RefundService {
        val mockEngine = MockEngine { _ -> respondJson(mockPayInvoiceJson(recipientAmountSat)) }
        return refundServiceWithHttpClient(mockEngine)
    }

    private fun refundServiceWithNoPhoenixCallExpected(): RefundService {
        val mockEngine = MockEngine { _ -> error("phoenixd should not be called for a non-BTC refund") }
        val mockHttpClient = HttpClient(mockEngine)
        return RefundService(PhoenixService(mockEnv, mockHttpClient))
    }

    private fun refundServiceWithOutgoingPaymentAlreadyPaid(sentSat: Long): RefundService {
        val mockEngine =
            MockEngine { request ->
                if (isOutgoingByHashRequest(request)) {
                    respondJson(mockOutgoingPaymentJson(isPaid = true, sentSat = sentSat))
                } else {
                    error("payInvoice should not be called when the invoice was already paid")
                }
            }
        return refundServiceWithHttpClient(mockEngine)
    }

    private fun refundServiceWithOutgoingPaymentQueryFailing(
        recipientAmountSat: Long,
        failureStatus: HttpStatusCode,
    ): RefundService {
        val mockEngine =
            MockEngine { request ->
                if (isOutgoingByHashRequest(request)) {
                    respond(content = "", status = failureStatus)
                } else {
                    respondJson(mockPayInvoiceJson(recipientAmountSat))
                }
            }
        return refundServiceWithHttpClient(mockEngine)
    }

    private fun seedUser(): String {
        val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        return ExposedTestDb.seedUser("Alice", roleId)
    }

    private fun defaultVariantId(productId: String): String =
        variantService.getVariants(productId).first().id ?: error("No variant for product $productId")

    private fun variantQuantity(variantId: String): Int =
        variantService.getVariantById(variantId)?.quantity ?: error("Variant not found: $variantId")

    private fun orderStatus(orderId: String): String =
        transaction { OrderEntity.findById(UUID.fromString(orderId))?.status ?: error("Order not found: $orderId") }

    private fun refundPaymentHash(orderId: String): String? =
        transaction {
            RefundEntity
                .find { RefundsTable.orderId eq EntityID(UUID.fromString(orderId), OrdersTable) }
                .firstOrNull()
                ?.paymentHash
        }

    private fun seedPaidOrderWithLine(
        userId: String,
        productId: String,
        variantId: String?,
        quantity: Int,
        priceAtOrder: Int,
        total: Double = 10.0,
    ): String {
        val orderId = ExposedTestDb.seedOrder(userId = userId, status = "paid", total = total)
        ExposedTestDb.seedOrderProduct(
            orderId = orderId,
            productId = productId,
            variantId = variantId,
            quantity = quantity,
            priceAtOrder = priceAtOrder,
        )
        return orderId
    }

    private fun seedPaidBtcOrderWithPayment(satoshiAmount: Long): String {
        val userId = seedUser()
        val productId = ExposedTestDb.seedProduct(name = "Widget", quantity = 5)
        val variantId = defaultVariantId(productId)
        val orderId = seedPaidOrderWithLine(userId, productId, variantId, quantity = 1, priceAtOrder = 500)
        val paymentId = ExposedTestDb.seedPayment(satoshiAmount = satoshiAmount)
        val ticketId = ExposedTestDb.seedTicket(orderId, userId)
        ExposedTestDb.seedTicketPayment(paymentId, ticketId)
        return orderId
    }

    @Test
    fun `processRefund on non-BTC order sets status refunded and satoshiAmount zero`() =
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(name = "Widget", quantity = 5)
            val variantId = defaultVariantId(productId)
            val orderId = seedPaidOrderWithLine(userId, productId, variantId, quantity = 2, priceAtOrder = 500)

            val refund = refundServiceWithNoPhoenixCallExpected().processRefund(orderId, RefundRequest(invoice = ""))

            assertEquals(0L, refund.satoshiAmount)
            assertEquals("refunded", orderStatus(orderId))
        }

    @Test
    fun `processRefund stamps refundedAt using the configured timezone`() =
        runBlocking {
            ExposedTestDb.seedConfig("Pacific/Kiritimati")
            val zoneId = ZoneId.of("Pacific/Kiritimati")
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(name = "Widget", quantity = 5)
            val variantId = defaultVariantId(productId)
            val orderId = seedPaidOrderWithLine(userId, productId, variantId, quantity = 2, priceAtOrder = 500)

            val before = LocalDateTime.now(zoneId)
            val refund = refundServiceWithNoPhoenixCallExpected().processRefund(orderId, RefundRequest(invoice = ""))
            val after = LocalDateTime.now(zoneId)

            val storedRefundedAt = LocalDateTime.parse(refund.refundedAt)
            assertFalse(storedRefundedAt.isBefore(before))
            assertFalse(storedRefundedAt.isAfter(after))
        }

    @Test
    fun `processRefund on BTC order calls payInvoice and stores recipientAmountSat`() =
        runBlocking {
            val orderId = seedPaidBtcOrderWithPayment(satoshiAmount = decodableInvoiceAmountSat)

            val refund =
                refundServiceRespondingWithSats(decodableInvoiceAmountSat)
                    .processRefund(orderId, RefundRequest(invoice = decodableInvoice))

            assertEquals(decodableInvoiceAmountSat, refund.satoshiAmount)
            assertEquals("refunded", orderStatus(orderId))
        }

    @Test
    fun `processRefund pays through whichever LightningBackend it was constructed with`() =
        runBlocking {
            val orderId = seedPaidBtcOrderWithPayment(satoshiAmount = decodableInvoiceAmountSat)
            val backend = FakeNwcLightningBackend()

            val refund = RefundService(backend).processRefund(orderId, RefundRequest(invoice = decodableInvoice))

            assertTrue(backend.payInvoiceCalled)
            assertEquals(1234L, refund.satoshiAmount)
        }

    @Test
    fun `processRefund rejects a refund invoice that does not specify an amount`() {
        runBlocking {
            val orderId = seedPaidBtcOrderWithPayment(satoshiAmount = 1234)

            assertFailsWith<OrderNotRefundableException> {
                refundServiceWithNoPhoenixCallExpected().processRefund(orderId, RefundRequest(invoice = "lnbc1..."))
            }
        }
    }

    @Test
    fun `processRefund rejects a refund invoice whose amount does not match the amount owed`() {
        runBlocking {
            val orderId = seedPaidBtcOrderWithPayment(satoshiAmount = 895)

            assertFailsWith<OrderNotRefundableException> {
                refundServiceWithNoPhoenixCallExpected().processRefund(orderId, RefundRequest(invoice = decodableInvoice))
            }
        }
    }

    @Test
    fun `processRefund rejects already refunded order`() {
        runBlocking {
            val userId = seedUser()
            val orderId = ExposedTestDb.seedOrder(userId = userId, status = "refunded", total = 10.0)

            assertFailsWith<OrderAlreadyRefundedException> {
                refundServiceWithNoPhoenixCallExpected().processRefund(orderId, RefundRequest())
            }
        }
    }

    @Test
    fun `processRefund rejects order not in paid status`() {
        runBlocking {
            val userId = seedUser()
            val openOrderId = ExposedTestDb.seedOrder(userId = userId, status = "open", total = 10.0)
            val closedOrderId = ExposedTestDb.seedOrder(userId = userId, status = "closed", total = 10.0)

            assertFailsWith<OrderNotRefundableException> {
                refundServiceWithNoPhoenixCallExpected().processRefund(openOrderId, RefundRequest())
            }
            assertFailsWith<OrderNotRefundableException> {
                refundServiceWithNoPhoenixCallExpected().processRefund(closedOrderId, RefundRequest())
            }
        }
    }

    @Test
    fun `processRefund rejects a non-blank invoice when the order has no Bitcoin payment on record`() {
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(name = "Widget", quantity = 5)
            val variantId = defaultVariantId(productId)
            val orderId = seedPaidOrderWithLine(userId, productId, variantId, quantity = 1, priceAtOrder = 500)

            assertFailsWith<OrderNotRefundableException> {
                refundServiceWithNoPhoenixCallExpected().processRefund(orderId, RefundRequest(invoice = "lnbc1..."))
            }
        }
    }

    @Test
    fun `processRefund throws ResourceNotFoundException for missing or malformed order id`() {
        runBlocking {
            assertFailsWith<ResourceNotFoundException> {
                refundServiceWithNoPhoenixCallExpected().processRefund(UUID.randomUUID().toString(), RefundRequest())
            }
            assertFailsWith<ResourceNotFoundException> {
                refundServiceWithNoPhoenixCallExpected().processRefund("not-a-uuid", RefundRequest())
            }
        }
    }

    @Test
    fun `processRefund restores stock to the variant recorded on the order line`() =
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(name = "Widget", quantity = 5)
            val defaultVariant = defaultVariantId(productId)
            val secondVariantId =
                variantService.addVariant(productId, UpsertVariantRequest(priceCents = 300, quantity = 2))
                    ?: error("Failed to create second variant")

            val orderId = seedPaidOrderWithLine(userId, productId, secondVariantId, quantity = 2, priceAtOrder = 300, total = 3.0)

            refundServiceWithNoPhoenixCallExpected().processRefund(orderId, RefundRequest())

            assertEquals(4, variantQuantity(secondVariantId))
            assertEquals(5, variantQuantity(defaultVariant))
        }

    @Test
    fun `processRefund restores to the default variant when variant_id is null`() =
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(name = "Widget", quantity = 5)
            val defaultVariant = defaultVariantId(productId)

            val orderId = seedPaidOrderWithLine(userId, productId, variantId = null, quantity = 3, priceAtOrder = 200, total = 5.0)

            refundServiceWithNoPhoenixCallExpected().processRefund(orderId, RefundRequest())

            assertEquals(8, variantQuantity(defaultVariant))
        }

    @Test
    fun `processRefund leaves stock untouched for a product that does not track stock`() =
        runBlocking {
            val userId = seedUser()
            val productId = ExposedTestDb.seedProduct(name = "Consulting", quantity = 5, trackStock = false)
            val defaultVariant = defaultVariantId(productId)

            val orderId = seedPaidOrderWithLine(userId, productId, variantId = null, quantity = 3, priceAtOrder = 200, total = 5.0)

            refundServiceWithNoPhoenixCallExpected().processRefund(orderId, RefundRequest())

            assertEquals(5, variantQuantity(defaultVariant))
        }

    @Test
    fun `processRefund restores bundle component pinned variant and leaves bundle stock untouched`() =
        runBlocking {
            val userId = seedUser()
            val componentId = ExposedTestDb.seedProduct(name = "Component", quantity = 5)
            val componentDefaultVariant = defaultVariantId(componentId)
            val componentSecondVariant =
                variantService.addVariant(componentId, UpsertVariantRequest(priceCents = 100, quantity = 1))
                    ?: error("Failed to create component variant")

            val bundleId = ExposedTestDb.seedProduct(name = "Bundle", quantity = 0, isBundle = true)
            val bundleVariant = defaultVariantId(bundleId)
            ExposedTestDb.seedBundleComponent(
                bundleId = bundleId,
                componentId = componentId,
                componentVariantId = componentSecondVariant,
                quantity = 2,
            )

            val orderId = seedPaidOrderWithLine(userId, bundleId, bundleVariant, quantity = 1, priceAtOrder = 1000)

            refundServiceWithNoPhoenixCallExpected().processRefund(orderId, RefundRequest())

            assertEquals(3, variantQuantity(componentSecondVariant))
            assertEquals(5, variantQuantity(componentDefaultVariant))
            assertEquals(0, variantQuantity(bundleVariant))
        }

    @Test
    fun `processRefund restores bundle component default variant when component_variant_id is null`() =
        runBlocking {
            val userId = seedUser()
            val componentId = ExposedTestDb.seedProduct(name = "Component", quantity = 5)
            val componentDefaultVariant = defaultVariantId(componentId)

            val bundleId = ExposedTestDb.seedProduct(name = "Bundle", quantity = 0, isBundle = true)
            val bundleVariant = defaultVariantId(bundleId)
            ExposedTestDb.seedBundleComponent(
                bundleId = bundleId,
                componentId = componentId,
                componentVariantId = null,
                quantity = 3,
            )

            val orderId = seedPaidOrderWithLine(userId, bundleId, bundleVariant, quantity = 1, priceAtOrder = 1000)

            refundServiceWithNoPhoenixCallExpected().processRefund(orderId, RefundRequest())

            assertEquals(8, variantQuantity(componentDefaultVariant))
            assertEquals(0, variantQuantity(bundleVariant))
        }

    @Test
    fun `processRefund skips payInvoice and persists the already-paid amount when the invoice was paid in a previous attempt`() =
        runBlocking {
            val orderId = seedPaidBtcOrderWithPayment(satoshiAmount = decodableInvoiceAmountSat)

            val refund =
                refundServiceWithOutgoingPaymentAlreadyPaid(sentSat = 1234)
                    .processRefund(orderId, RefundRequest(invoice = decodableInvoice))

            assertEquals(1234L, refund.satoshiAmount)
            assertEquals("refunded", orderStatus(orderId))
        }

    @Test
    fun `processRefund calls payInvoice normally when the outgoing payment lookup finds no prior payment`() =
        runBlocking {
            val orderId = seedPaidBtcOrderWithPayment(satoshiAmount = decodableInvoiceAmountSat)

            val refund =
                refundServiceWithOutgoingPaymentQueryFailing(recipientAmountSat = 1234, failureStatus = HttpStatusCode.NotFound)
                    .processRefund(orderId, RefundRequest(invoice = decodableInvoice))

            assertEquals(1234L, refund.satoshiAmount)
            assertEquals("refunded", orderStatus(orderId))
        }

    @Test
    fun `processRefund calls payInvoice normally when the outgoing payment lookup fails unexpectedly`() =
        runBlocking {
            val orderId = seedPaidBtcOrderWithPayment(satoshiAmount = decodableInvoiceAmountSat)

            val refund =
                refundServiceWithOutgoingPaymentQueryFailing(
                    recipientAmountSat = 1234,
                    failureStatus = HttpStatusCode.InternalServerError,
                ).processRefund(orderId, RefundRequest(invoice = decodableInvoice))

            assertEquals(1234L, refund.satoshiAmount)
            assertEquals("refunded", orderStatus(orderId))
        }

    @Test
    fun `processRefund persists the invoice's payment hash on the refund row`() =
        runBlocking {
            val orderId = seedPaidBtcOrderWithPayment(satoshiAmount = decodableInvoiceAmountSat)

            refundServiceWithOutgoingPaymentQueryFailing(recipientAmountSat = 1234, failureStatus = HttpStatusCode.NotFound)
                .processRefund(orderId, RefundRequest(invoice = decodableInvoice))

            assertEquals(64, refundPaymentHash(orderId)?.length)
        }

    @Test
    fun `getRefundedOrderPaymentHashes returns only the hashes whose order was refunded`() {
        val userId = seedUser()

        val refundedOrderId = ExposedTestDb.seedOrder(userId = userId, status = "refunded", total = 10.0)
        val refundedPaymentId = ExposedTestDb.seedPayment(paymentHash = "refunded-order-hash")
        val refundedTicketId = ExposedTestDb.seedTicket(refundedOrderId, userId)
        ExposedTestDb.seedTicketPayment(refundedPaymentId, refundedTicketId)

        val paidOrderId = ExposedTestDb.seedOrder(userId = userId, status = "paid", total = 10.0)
        val paidPaymentId = ExposedTestDb.seedPayment(paymentHash = "paid-order-hash")
        val paidTicketId = ExposedTestDb.seedTicket(paidOrderId, userId)
        ExposedTestDb.seedTicketPayment(paidPaymentId, paidTicketId)

        val result =
            refundServiceWithNoPhoenixCallExpected()
                .getRefundedOrderPaymentHashes(listOf("refunded-order-hash", "paid-order-hash", "unknown-hash"))

        assertEquals(setOf("refunded-order-hash"), result)
    }

    @Test
    fun `getRefundedPaymentHashes returns only the hashes present in the refunds table`() {
        val userId = seedUser()

        val orderId = ExposedTestDb.seedOrder(userId = userId, status = "refunded", total = 10.0)
        ExposedTestDb.seedRefund(orderId, paymentHash = "refund-payout-hash")

        val otherOrderId = ExposedTestDb.seedOrder(userId = userId, status = "refunded", total = 10.0)
        ExposedTestDb.seedRefund(otherOrderId, paymentHash = "other-refund-payout-hash")

        val result =
            refundServiceWithNoPhoenixCallExpected()
                .getRefundedPaymentHashes(listOf("refund-payout-hash", "unrelated-outgoing-hash"))

        assertEquals(setOf("refund-payout-hash"), result)
    }
}
