package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.OrderWithPaymentFilters
import pos.ambrosia.services.ReportService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneOffset
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ReportServiceTest {
    private val service = ReportService()
    private lateinit var dbFile: File

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    private data class Sale(
        val userId: String,
        val orderId: String,
        val paymentMethodId: String,
        val paymentId: String,
    )

    private fun seedSale(
        userName: String = "alice",
        userId: String? = null,
        paymentMethodName: String = "Cash",
        createdAt: String = "2024-06-15T12:00:00",
        orderStatus: String = "paid",
        total: Double = 0.0,
        satoshiAmount: Long? = null,
        exchangeRateAtPayment: Double? = null,
        exchangeRateCurrency: String? = null,
        fiatAmountAtPayment: Double? = null,
    ): Sale {
        val userId = userId ?: ExposedTestDb.seedUser(userName)
        val orderId = ExposedTestDb.seedOrder(userId, createdAt = createdAt, status = orderStatus, total = total)
        val paymentMethodId = ExposedTestDb.seedPaymentMethod(paymentMethodName)
        val currencyId = ExposedTestDb.seedCurrency("USD")
        val paymentId =
            ExposedTestDb.seedPayment(
                methodId = paymentMethodId,
                currencyId = currencyId,
                transactionId = "txn-$orderId",
                amount = total,
                satoshiAmount = satoshiAmount,
                exchangeRateAtPayment = exchangeRateAtPayment,
                exchangeRateCurrency = exchangeRateCurrency,
                fiatAmountAtPayment = fiatAmountAtPayment,
            )
        val ticketId = ExposedTestDb.seedTicket(orderId, userId)
        ExposedTestDb.seedTicketPayment(paymentId, ticketId)
        return Sale(userId, orderId, paymentMethodId, paymentId)
    }

    private fun addOrderProduct(
        orderId: String,
        productName: String = "Widget",
        quantity: Int = 2,
        priceAtOrder: Int = 1000,
    ): String {
        val productId = ExposedTestDb.seedProduct(name = productName, priceCents = priceAtOrder)
        ExposedTestDb.seedOrderProduct(orderId, productId, quantity = quantity, priceAtOrder = priceAtOrder)
        return productId
    }

    @Test
    fun `period=week filters to orders from Monday of the current week`() {
        val monday = LocalDate.now(ZoneOffset.UTC).with(DayOfWeek.MONDAY)
        val recent = seedSale(createdAt = "${monday}T12:00:00")
        addOrderProduct(recent.orderId)
        val old = seedSale(createdAt = "2020-01-01T12:00:00")
        addOrderProduct(old.orderId)

        val report =
            service.getProductSalesReport(
                period = "week",
                startDate = null,
                endDate = null,
                productName = null,
                userId = null,
                paymentMethod = null,
            )

        assertEquals(1, report.sales.size)
        assertEquals(recent.orderId, report.sales[0].orderId)
    }

    @Test
    fun `period=month filters to orders from the first day of the current month`() {
        val firstOfMonth = LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1)
        val recent = seedSale(createdAt = "${firstOfMonth}T12:00:00")
        addOrderProduct(recent.orderId)
        val old = seedSale(createdAt = "2020-01-01T12:00:00")
        addOrderProduct(old.orderId)

        val report =
            service.getProductSalesReport(
                period = "month",
                startDate = null,
                endDate = null,
                productName = null,
                userId = null,
                paymentMethod = null,
            )

        assertEquals(1, report.sales.size)
        assertEquals(recent.orderId, report.sales[0].orderId)
    }

    @Test
    fun `period=year filters to orders from the first day of the current year`() {
        val firstOfYear = LocalDate.now(ZoneOffset.UTC).withDayOfYear(1)
        val recent = seedSale(createdAt = "${firstOfYear}T12:00:00")
        addOrderProduct(recent.orderId)
        val old = seedSale(createdAt = "2019-01-01T12:00:00")
        addOrderProduct(old.orderId)

        val report =
            service.getProductSalesReport(
                period = "year",
                startDate = null,
                endDate = null,
                productName = null,
                userId = null,
                paymentMethod = null,
            )

        assertEquals(1, report.sales.size)
        assertEquals(recent.orderId, report.sales[0].orderId)
    }

    @Test
    fun `invalid period throws IllegalArgumentException`() {
        assertFailsWith<IllegalArgumentException> {
            service.getProductSalesReport(
                period = "fortnight",
                startDate = null,
                endDate = null,
                productName = null,
                userId = null,
                paymentMethod = null,
            )
        }
    }

    @Test
    fun `startDate and endDate without period uses the provided dates`() {
        val inRange = seedSale(createdAt = "2024-01-15T12:00:00")
        addOrderProduct(inRange.orderId)
        val outOfRange = seedSale(createdAt = "2023-01-15T12:00:00")
        addOrderProduct(outOfRange.orderId)

        val report =
            service.getProductSalesReport(
                period = null,
                startDate = "2024-01-01",
                endDate = "2024-01-31",
                productName = null,
                userId = null,
                paymentMethod = null,
            )

        assertEquals(1, report.sales.size)
        assertEquals(inRange.orderId, report.sales[0].orderId)
    }

    @Test
    fun `without period or dates returns sales from all dates`() {
        val a = seedSale(createdAt = "2024-01-15T12:00:00")
        addOrderProduct(a.orderId)
        val b = seedSale(createdAt = "2020-01-15T12:00:00")
        addOrderProduct(b.orderId)

        val report =
            service.getProductSalesReport(
                period = null,
                startDate = null,
                endDate = null,
                productName = null,
                userId = null,
                paymentMethod = null,
            )

        assertEquals(2, report.sales.size)
    }

    @Test
    fun `period takes precedence over startDate and endDate`() {
        val firstOfMonth = LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1)
        val sale = seedSale(createdAt = "${firstOfMonth}T12:00:00")
        addOrderProduct(sale.orderId)

        val report =
            service.getProductSalesReport(
                period = "month",
                startDate = "2020-01-01",
                endDate = "2020-01-31",
                productName = null,
                userId = null,
                paymentMethod = null,
            )

        assertEquals(1, report.sales.size)
    }

    @Test
    fun `productName filters with case-insensitive LIKE`() {
        val widget = seedSale()
        addOrderProduct(widget.orderId, productName = "Widget")
        val gadget = seedSale()
        addOrderProduct(gadget.orderId, productName = "Gadget")

        val report =
            service.getProductSalesReport(
                period = null,
                startDate = null,
                endDate = null,
                productName = "widg",
                userId = null,
                paymentMethod = null,
            )

        assertEquals(1, report.sales.size)
        assertEquals("Widget", report.sales[0].productName)
    }

    @Test
    fun `paymentMethod filters case-insensitively`() {
        val cash = seedSale(paymentMethodName = "Cash")
        addOrderProduct(cash.orderId)
        val btc = seedSale(paymentMethodName = "BTC")
        addOrderProduct(btc.orderId)

        val report =
            service.getProductSalesReport(
                period = null,
                startDate = null,
                endDate = null,
                productName = null,
                userId = null,
                paymentMethod = "cash",
            )

        assertEquals(1, report.sales.size)
        assertEquals("Cash", report.sales[0].paymentMethod)
    }

    @Test
    fun `userId filters to sales from that user`() {
        val alice = seedSale(userName = "alice")
        addOrderProduct(alice.orderId)
        val bob = seedSale(userName = "bob")
        addOrderProduct(bob.orderId)

        val report =
            service.getProductSalesReport(
                period = null,
                startDate = null,
                endDate = null,
                productName = null,
                userId = alice.userId,
                paymentMethod = null,
            )

        assertEquals(1, report.sales.size)
        assertEquals("alice", report.sales[0].userName)
    }

    @Test
    fun `combined filters narrow down to a single matching sale`() {
        val match = seedSale(userName = "alice", paymentMethodName = "Cash", createdAt = "2024-06-15T12:00:00")
        addOrderProduct(match.orderId, productName = "Widget")
        val other = seedSale(userName = "bob", paymentMethodName = "BTC", createdAt = "2024-06-15T12:00:00")
        addOrderProduct(other.orderId, productName = "Gadget")

        val report =
            service.getProductSalesReport(
                period = null,
                startDate = "2024-06-01",
                endDate = "2024-06-30",
                productName = "Widget",
                userId = match.userId,
                paymentMethod = "cash",
            )

        assertEquals(1, report.sales.size)
        assertEquals(match.orderId, report.sales[0].orderId)
    }

    @Test
    fun `calculates totalRevenueCents and totalItemsSold as sums across all line items`() {
        val sale = seedSale()
        addOrderProduct(sale.orderId, productName = "A", quantity = 3, priceAtOrder = 1000)
        addOrderProduct(sale.orderId, productName = "B", quantity = 2, priceAtOrder = 500)

        val report =
            service.getProductSalesReport(
                period = null,
                startDate = null,
                endDate = null,
                productName = null,
                userId = null,
                paymentMethod = null,
            )

        assertEquals(4000L, report.totalRevenueCents)
        assertEquals(5, report.totalItemsSold)
    }

    @Test
    fun `returns empty list and zeros when there is no data`() {
        val report =
            service.getProductSalesReport(
                period = null,
                startDate = null,
                endDate = null,
                productName = null,
                userId = null,
                paymentMethod = null,
            )

        assertEquals(0L, report.totalRevenueCents)
        assertEquals(0, report.totalItemsSold)
        assertTrue(report.sales.isEmpty())
    }

    @Test
    fun `correctly maps ResultSet fields to ProductSaleItem`() {
        val sale = seedSale(userName = "bob", paymentMethodName = "BTC", createdAt = "2024-03-20T09:15:00")
        addOrderProduct(sale.orderId, productName = "Raspberry Pi", quantity = 4, priceAtOrder = 2500)

        val report =
            service.getProductSalesReport(
                period = null,
                startDate = null,
                endDate = null,
                productName = null,
                userId = null,
                paymentMethod = null,
            )

        assertEquals(1, report.sales.size)
        val item = report.sales[0]
        assertEquals(sale.orderId, item.orderId)
        assertEquals("Raspberry Pi", item.productName)
        assertEquals(4, item.quantity)
        assertEquals(2500, item.priceAtOrder)
        assertEquals("bob", item.userName)
        assertEquals("BTC", item.paymentMethod)
        assertEquals("2024-03-20T09:15:00", item.saleDate)
    }

    @Test
    fun `multiple line items from the same order carry the same orderId`() {
        val sale = seedSale()
        addOrderProduct(sale.orderId, productName = "Widget A", quantity = 1, priceAtOrder = 500)
        addOrderProduct(sale.orderId, productName = "Widget B", quantity = 2, priceAtOrder = 300)

        val report =
            service.getProductSalesReport(
                period = null,
                startDate = null,
                endDate = null,
                productName = null,
                userId = null,
                paymentMethod = null,
            )

        assertEquals(2, report.sales.size)
        assertEquals(sale.orderId, report.sales[0].orderId)
        assertEquals(sale.orderId, report.sales[1].orderId)
    }

    @Test
    fun `totalRevenueCents avoids overflow with large values using Long`() {
        val sale = seedSale()
        addOrderProduct(sale.orderId, productName = "Expensive Item", quantity = 1_000_000, priceAtOrder = Int.MAX_VALUE)

        val report =
            service.getProductSalesReport(
                period = null,
                startDate = null,
                endDate = null,
                productName = null,
                userId = null,
                paymentMethod = null,
            )

        val expected = Int.MAX_VALUE.toLong() * 1_000_000L
        assertEquals(expected, report.totalRevenueCents, "Calculation should use Long to avoid overflow")
    }

    @Test
    fun `mapper extracts bitcoin fields when present`() {
        val sale =
            seedSale(
                paymentMethodName = "BTC",
                satoshiAmount = 100_000L,
                exchangeRateAtPayment = 95_000.0,
                exchangeRateCurrency = "usd",
                fiatAmountAtPayment = 1.0,
            )
        addOrderProduct(sale.orderId)

        val report =
            service.getProductSalesReport(
                period = null,
                startDate = null,
                endDate = null,
                productName = null,
                userId = null,
                paymentMethod = null,
            )

        assertEquals(100_000L, report.sales[0].satoshiAmount)
        assertEquals(95_000.0, report.sales[0].exchangeRateAtPayment)
        assertEquals("usd", report.sales[0].exchangeRateCurrency)
        assertEquals(1.0, report.sales[0].fiatAmountAtPayment)
        assertEquals(sale.paymentId, report.sales[0].paymentId)
    }

    @Test
    fun `totalBtcSatoshis deduplicates by paymentId to avoid double counting`() {
        val sale = seedSale(paymentMethodName = "BTC", satoshiAmount = 100_000L)
        addOrderProduct(sale.orderId, productName = "Widget A", quantity = 1, priceAtOrder = 500)
        addOrderProduct(sale.orderId, productName = "Widget B", quantity = 1, priceAtOrder = 500)

        val report =
            service.getProductSalesReport(
                period = null,
                startDate = null,
                endDate = null,
                productName = null,
                userId = null,
                paymentMethod = null,
            )

        assertEquals(2, report.sales.size)
        assertEquals(100_000L, report.totalBtcSatoshis, "Should count 100000 sats once, not twice")
    }

    @Test
    fun `getOrdersWithPaymentsFiltered applies status filter and default date desc sort`() =
        runBlocking {
            val older = seedSale(orderStatus = "paid", createdAt = "2025-01-01T10:00:00", total = 100.0)
            val newer = seedSale(orderStatus = "paid", createdAt = "2025-01-10T10:00:00", total = 100.0)
            seedSale(orderStatus = "open", createdAt = "2025-01-15T10:00:00", total = 100.0)

            val result = service.getOrdersWithPaymentsFiltered(OrderWithPaymentFilters(status = "paid"))

            assertEquals(2, result.size)
            assertEquals(newer.orderId, result[0].id)
            assertEquals(older.orderId, result[1].id)
            assertEquals("Cash", result[0].paymentMethod)
        }

    @Test
    fun `getOrdersWithPaymentsFiltered applies date range filters`() =
        runBlocking {
            val inRange = seedSale(createdAt = "2025-01-15T10:00:00")
            seedSale(createdAt = "2024-01-15T10:00:00")

            val result =
                service.getOrdersWithPaymentsFiltered(
                    OrderWithPaymentFilters(startDate = "2025-01-01", endDate = "2025-01-31"),
                )

            assertEquals(1, result.size)
            assertEquals(inRange.orderId, result[0].id)
        }

    @Test
    fun `getOrdersWithPaymentsFiltered applies user id filter`() =
        runBlocking {
            val alice = seedSale(userName = "alice")
            seedSale(userName = "bob")

            val result = service.getOrdersWithPaymentsFiltered(OrderWithPaymentFilters(userId = alice.userId))

            assertEquals(1, result.size)
            assertEquals(alice.orderId, result[0].id)
            assertEquals(alice.userId, result[0].userId)
        }

    @Test
    fun `getOrdersWithPaymentsFiltered applies payment method filter case-insensitively`() =
        runBlocking {
            val cash = seedSale(paymentMethodName = "Cash")
            seedSale(paymentMethodName = "BTC")

            val result = service.getOrdersWithPaymentsFiltered(OrderWithPaymentFilters(paymentMethod = "cash"))

            assertEquals(1, result.size)
            assertEquals(cash.orderId, result[0].id)
        }

    @Test
    fun `getOrdersWithPaymentsFiltered applies total range filters`() =
        runBlocking {
            val inRange = seedSale(total = 100.0)
            seedSale(total = 600.0)
            seedSale(total = 5.0)

            val result =
                service.getOrdersWithPaymentsFiltered(
                    OrderWithPaymentFilters(minTotal = 10.0, maxTotal = 500.0),
                )

            assertEquals(1, result.size)
            assertEquals(inRange.orderId, result[0].id)
        }

    @Test
    fun `getOrdersWithPaymentsFiltered sorts by total ascending`() =
        runBlocking {
            val high = seedSale(total = 100.0, createdAt = "2025-01-01T10:00:00")
            val low = seedSale(total = 50.0, createdAt = "2025-01-02T10:00:00")

            val result = service.getOrdersWithPaymentsFiltered(OrderWithPaymentFilters(sortBy = "total", sortOrder = "asc"))

            assertEquals(2, result.size)
            assertEquals(low.orderId, result[0].id)
            assertEquals(high.orderId, result[1].id)
        }

    @Test
    fun `getOrdersWithPaymentsFiltered sorts by date descending by default`() =
        runBlocking {
            val older = seedSale(createdAt = "2025-01-01T10:00:00")
            val newer = seedSale(createdAt = "2025-01-10T10:00:00")

            val result = service.getOrdersWithPaymentsFiltered()

            assertEquals(2, result.size)
            assertEquals(newer.orderId, result[0].id)
            assertEquals(older.orderId, result[1].id)
        }

    @Test
    fun `getOrdersWithPaymentsFiltered combines filters and custom total sort`() =
        runBlocking {
            val low = seedSale(userName = "alice", paymentMethodName = "Cash", createdAt = "2025-01-05T10:00:00", total = 50.0)
            val high = seedSale(userId = low.userId, paymentMethodName = "Cash", createdAt = "2025-01-10T10:00:00", total = 100.0)
            seedSale(userName = "bob", paymentMethodName = "Cash", createdAt = "2025-01-10T10:00:00", total = 100.0)

            val result =
                service.getOrdersWithPaymentsFiltered(
                    OrderWithPaymentFilters(
                        startDate = "2025-01-01",
                        endDate = "2025-01-31",
                        userId = low.userId,
                        paymentMethod = "cash",
                        minTotal = 10.0,
                        maxTotal = 500.0,
                        sortBy = "total",
                        sortOrder = "asc",
                    ),
                )

            assertEquals(2, result.size)
            assertEquals(low.orderId, result[0].id)
            assertEquals(high.orderId, result[1].id)
        }

    @Test
    fun `getOrdersWithPaymentsFiltered rejects invalid status`() =
        runBlocking {
            val exception =
                assertFailsWith<IllegalArgumentException> {
                    service.getOrdersWithPaymentsFiltered(OrderWithPaymentFilters(status = "invalid"))
                }

            assertEquals("Invalid status: invalid", exception.message)
        }

    @Test
    fun `getOrdersWithPaymentsFiltered rejects invalid sort by`() =
        runBlocking {
            val exception =
                assertFailsWith<IllegalArgumentException> {
                    service.getOrdersWithPaymentsFiltered(OrderWithPaymentFilters(sortBy = "waiter"))
                }

            assertEquals("Invalid sort_by: waiter", exception.message)
        }

    @Test
    fun `getOrdersWithPaymentsFiltered mapper extracts bitcoin fields when present`() =
        runBlocking {
            seedSale(
                paymentMethodName = "BTC",
                satoshiAmount = 100_000L,
                exchangeRateAtPayment = 95_000.0,
                exchangeRateCurrency = "usd",
                fiatAmountAtPayment = 1.0,
            )

            val result = service.getOrdersWithPaymentsFiltered()

            assertEquals(100_000L, result[0].satoshiAmount)
            assertEquals(95_000.0, result[0].exchangeRateAtPayment)
            assertEquals("usd", result[0].exchangeRateCurrency)
            assertEquals(1.0, result[0].fiatAmountAtPayment)
        }

    @Test
    fun `getOrdersWithPaymentsFiltered mapper returns null bitcoin fields when not present`() =
        runBlocking {
            seedSale(paymentMethodName = "Cash")

            val result = service.getOrdersWithPaymentsFiltered()

            assertNull(result[0].satoshiAmount)
            assertNull(result[0].exchangeRateAtPayment)
            assertNull(result[0].exchangeRateCurrency)
            assertNull(result[0].fiatAmountAtPayment)
        }

    @Test
    fun `getTotalSalesByDate returns total sales when found`() =
        runBlocking {
            seedSale(orderStatus = "paid", createdAt = "2023-01-15T10:00:00", total = 1234.56)

            val result = service.getTotalSalesByDate("2023-01-15")

            assertEquals(1234.56, result)
        }

    @Test
    fun `getTotalSalesByDate returns zero when none found`() =
        runBlocking {
            val result = service.getTotalSalesByDate("2023-01-16")

            assertEquals(0.0, result)
        }

    @Test
    fun `getOrdersWithPaymentsFiltered maps items from order_products`() =
        runBlocking {
            val sale = seedSale()
            addOrderProduct(sale.orderId, productName = "Tacos", quantity = 3, priceAtOrder = 500)
            addOrderProduct(sale.orderId, productName = "Soda", quantity = 1, priceAtOrder = 200)

            val result = service.getOrdersWithPaymentsFiltered()

            assertEquals(1, result.size)
            val items = result[0].items
            assertEquals(2, items.size)
            val tacos = items.first { it.productName == "Tacos" }
            assertEquals(3, tacos.quantity)
            assertEquals(500, tacos.priceAtOrder)
            val soda = items.first { it.productName == "Soda" }
            assertEquals(1, soda.quantity)
            assertEquals(200, soda.priceAtOrder)
        }

    @Test
    fun `getOrdersWithPaymentsFiltered returns empty items list when order has no products`() =
        runBlocking {
            seedSale()

            val result = service.getOrdersWithPaymentsFiltered()

            assertEquals(1, result.size)
            assertTrue(result[0].items.isEmpty())
        }

    @Test
    fun `getOrdersWithPaymentsFiltered maps paymentHash when present`() =
        runBlocking {
            val userId = ExposedTestDb.seedUser("alice")
            val orderId = ExposedTestDb.seedOrder(userId, status = "paid")
            val methodId = ExposedTestDb.seedPaymentMethod("BTC")
            val currencyId = ExposedTestDb.seedCurrency("USD")
            val paymentId =
                ExposedTestDb.seedPayment(
                    methodId = methodId,
                    currencyId = currencyId,
                    transactionId = "txn-hash",
                    paymentHash = "abc123def456",
                )
            val ticketId = ExposedTestDb.seedTicket(orderId, userId)
            ExposedTestDb.seedTicketPayment(paymentId, ticketId)

            val result = service.getOrdersWithPaymentsFiltered()

            assertEquals(1, result.size)
            assertEquals("abc123def456", result[0].paymentHash)
        }

    @Test
    fun `getOrdersWithPaymentsFiltered returns null paymentHash when not a BTC payment`() =
        runBlocking {
            seedSale(paymentMethodName = "Cash")

            val result = service.getOrdersWithPaymentsFiltered()

            assertEquals(1, result.size)
            assertNull(result[0].paymentHash)
        }
}
