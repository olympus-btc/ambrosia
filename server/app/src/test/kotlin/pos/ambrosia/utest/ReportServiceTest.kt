package pos.ambrosia.utest

import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.services.ReportService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneOffset
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ReportServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    private fun setupEmptyResultSet() {
        whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(false)
    }

    private fun setupSingleRowResultSet(
        orderId: String = "order-aaa-00000001",
        productName: String = "Widget",
        quantity: Int = 2,
        priceAtOrder: Int = 1000,
        userName: String = "alice",
        paymentMethod: String = "Cash",
        saleDate: String = "2024-06-15T12:00:00",
    ) {
        whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(true).thenReturn(false)
        whenever(mockResultSet.getString("order_id")).thenReturn(orderId)
        whenever(mockResultSet.getString("product_name")).thenReturn(productName)
        whenever(mockResultSet.getInt("quantity")).thenReturn(quantity)
        whenever(mockResultSet.getInt("price_at_order")).thenReturn(priceAtOrder)
        whenever(mockResultSet.getString("user_name")).thenReturn(userName)
        whenever(mockResultSet.getString("payment_method")).thenReturn(paymentMethod)
        whenever(mockResultSet.getString("sale_date")).thenReturn(saleDate)
    }

    @Test
    fun `period=week adds WHERE with start date as Monday of the current week`() {
        val sqlCaptor = argumentCaptor<String>()
        whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(false)

        val service = ReportService(mockConnection)
        service.getProductSalesReport(
            period = "week",
            startDate = null,
            endDate = null,
            productName = null,
            userId = null,
            paymentMethod = null,
        )

        val query = sqlCaptor.firstValue
        assertTrue(query.contains("date(o.created_at) >= date(?)"), "Should filter by start date")
        assertTrue(query.contains("date(o.created_at) <= date(?)"), "Should filter by end date")

        val expectedStart = LocalDate.now(ZoneOffset.UTC).with(DayOfWeek.MONDAY).toString()
        val expectedEnd = LocalDate.now(ZoneOffset.UTC).toString()
        verify(mockStatement).setString(1, expectedStart)
        verify(mockStatement).setString(2, expectedEnd)
    }

    @Test
    fun `period=month adds WHERE with first day of the current month`() {
        val sqlCaptor = argumentCaptor<String>()
        whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(false)

        val service = ReportService(mockConnection)
        service.getProductSalesReport(
            period = "month",
            startDate = null,
            endDate = null,
            productName = null,
            userId = null,
            paymentMethod = null,
        )

        val query = sqlCaptor.firstValue
        assertTrue(query.contains("date(o.created_at) >= date(?)"))
        assertTrue(query.contains("date(o.created_at) <= date(?)"))

        val expectedStart = LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1).toString()
        val expectedEnd = LocalDate.now(ZoneOffset.UTC).toString()
        verify(mockStatement).setString(1, expectedStart)
        verify(mockStatement).setString(2, expectedEnd)
    }

    @Test
    fun `period=year adds WHERE with first day of the current year`() {
        val sqlCaptor = argumentCaptor<String>()
        whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(false)

        val service = ReportService(mockConnection)
        service.getProductSalesReport(
            period = "year",
            startDate = null,
            endDate = null,
            productName = null,
            userId = null,
            paymentMethod = null,
        )

        val query = sqlCaptor.firstValue
        assertTrue(query.contains("date(o.created_at) >= date(?)"))
        assertTrue(query.contains("date(o.created_at) <= date(?)"))

        val expectedStart = LocalDate.now(ZoneOffset.UTC).withDayOfYear(1).toString()
        val expectedEnd = LocalDate.now(ZoneOffset.UTC).toString()
        verify(mockStatement).setString(1, expectedStart)
        verify(mockStatement).setString(2, expectedEnd)
    }

    @Test
    fun `invalid period throws IllegalArgumentException`() {
        val service = ReportService(mockConnection)
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
        val sqlCaptor = argumentCaptor<String>()
        whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(false)

        val service = ReportService(mockConnection)
        service.getProductSalesReport(
            period = null,
            startDate = "2024-01-01",
            endDate = "2024-01-31",
            productName = null,
            userId = null,
            paymentMethod = null,
        )

        val query = sqlCaptor.firstValue
        assertTrue(query.contains("date(o.created_at) >= date(?)"))
        assertTrue(query.contains("date(o.created_at) <= date(?)"))
        verify(mockStatement).setString(1, "2024-01-01")
        verify(mockStatement).setString(2, "2024-01-31")
    }

    @Test
    fun `without period or dates does not add date range WHERE`() {
        val sqlCaptor = argumentCaptor<String>()
        whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(false)

        val service = ReportService(mockConnection)
        service.getProductSalesReport(
            period = null,
            startDate = null,
            endDate = null,
            productName = null,
            userId = null,
            paymentMethod = null,
        )

        val query = sqlCaptor.firstValue
        assertFalse(query.contains("date(o.created_at)"), "Without date filters there should be no date WHERE clause")
    }

    @Test
    fun `period takes precedence over startDate and endDate`() {
        val sqlCaptor = argumentCaptor<String>()
        whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(false)

        val service = ReportService(mockConnection)
        service.getProductSalesReport(
            period = "month",
            startDate = "2020-01-01",
            endDate = "2020-01-31",
            productName = null,
            userId = null,
            paymentMethod = null,
        )

        val expectedStart = LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1).toString()
        verify(mockStatement).setString(1, expectedStart)
    }

    @Test
    fun `without filters builds query without additional AND clauses`() {
        val sqlCaptor = argumentCaptor<String>()
        whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(false)

        val service = ReportService(mockConnection)
        service.getProductSalesReport(
            period = null,
            startDate = null,
            endDate = null,
            productName = null,
            userId = null,
            paymentMethod = null,
        )

        val query = sqlCaptor.firstValue
        assertFalse(query.contains("LIKE"), "Without productName there should be no LIKE clause")
        assertFalse(query.contains("o.user_id = ?"), "Without userId there should be no user WHERE filter")
        assertFalse(query.contains("lower(pm.name)"), "Without paymentMethod there should be no payment method filter")
        assertTrue(query.contains("ORDER BY o.created_at DESC"), "Should always order DESC")
    }

    @Test
    fun `with productName adds case-insensitive LIKE clause`() {
        val sqlCaptor = argumentCaptor<String>()
        whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(false)

        val service = ReportService(mockConnection)
        service.getProductSalesReport(
            period = null,
            startDate = null,
            endDate = null,
            productName = "Widget",
            userId = null,
            paymentMethod = null,
        )

        val query = sqlCaptor.firstValue
        assertTrue(query.contains("p.name LIKE ?"), "Should filter by product name with LIKE")
        verify(mockStatement).setString(1, "%Widget%")
    }

    @Test
    fun `with paymentMethod adds lower() = lower() clause`() {
        val sqlCaptor = argumentCaptor<String>()
        whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(false)

        val service = ReportService(mockConnection)
        service.getProductSalesReport(
            period = null,
            startDate = null,
            endDate = null,
            productName = null,
            userId = null,
            paymentMethod = "Cash",
        )

        val query = sqlCaptor.firstValue
        assertTrue(query.contains("lower(pm.name) = lower(?)"), "Should compare payment method case-insensitively")
        verify(mockStatement).setString(1, "Cash")
    }

    @Test
    fun `with userId adds exact equality clause`() {
        val sqlCaptor = argumentCaptor<String>()
        whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(false)

        val service = ReportService(mockConnection)
        service.getProductSalesReport(
            period = null,
            startDate = null,
            endDate = null,
            productName = null,
            userId = "user-42",
            paymentMethod = null,
        )

        val query = sqlCaptor.firstValue
        assertTrue(query.contains("o.user_id = ?"), "Should filter by exact user ID")
        verify(mockStatement).setString(1, "user-42")
    }

    @Test
    fun `all filters together generate four AND clauses`() {
        val sqlCaptor = argumentCaptor<String>()
        whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(false)

        val service = ReportService(mockConnection)
        service.getProductSalesReport(
            period = null,
            startDate = "2024-01-01",
            endDate = "2024-12-31",
            productName = "Widget",
            userId = "user-1",
            paymentMethod = "BTC",
        )

        val query = sqlCaptor.firstValue
        assertTrue(query.contains("date(o.created_at) >= date(?)"))
        assertTrue(query.contains("date(o.created_at) <= date(?)"))
        assertTrue(query.contains("p.name LIKE ?"))
        assertTrue(query.contains("o.user_id = ?"))
        assertTrue(query.contains("lower(pm.name) = lower(?)"))
    }

    @Test
    fun `calculates totalRevenueCents as the sum of priceAtOrder times quantity`() {
        whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false)
        whenever(mockResultSet.getString("order_id")).thenReturn("order-001").thenReturn("order-002")
        whenever(mockResultSet.getString("product_name")).thenReturn("A").thenReturn("B")
        whenever(mockResultSet.getInt("quantity")).thenReturn(3).thenReturn(2)
        whenever(mockResultSet.getInt("price_at_order")).thenReturn(1000).thenReturn(500)
        whenever(mockResultSet.getString("user_name")).thenReturn("u1").thenReturn("u2")
        whenever(mockResultSet.getString("payment_method")).thenReturn("Cash").thenReturn("Cash")
        whenever(mockResultSet.getString("sale_date")).thenReturn("2024-01-01T00:00:00").thenReturn("2024-01-02T00:00:00")

        val service = ReportService(mockConnection)
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
    }

    @Test
    fun `calculates totalItemsSold as the sum of quantities`() {
        whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false)
        whenever(mockResultSet.getString("order_id")).thenReturn("order-001").thenReturn("order-002")
        whenever(mockResultSet.getString("product_name")).thenReturn("A").thenReturn("B")
        whenever(mockResultSet.getInt("quantity")).thenReturn(3).thenReturn(2)
        whenever(mockResultSet.getInt("price_at_order")).thenReturn(1000).thenReturn(500)
        whenever(mockResultSet.getString("user_name")).thenReturn("u1").thenReturn("u2")
        whenever(mockResultSet.getString("payment_method")).thenReturn("Cash").thenReturn("Cash")
        whenever(mockResultSet.getString("sale_date")).thenReturn("2024-01-01T00:00:00").thenReturn("2024-01-02T00:00:00")

        val service = ReportService(mockConnection)
        val report =
            service.getProductSalesReport(
                period = null,
                startDate = null,
                endDate = null,
                productName = null,
                userId = null,
                paymentMethod = null,
            )

        assertEquals(5, report.totalItemsSold)
    }

    @Test
    fun `returns empty list and zeros when there is no data`() {
        setupEmptyResultSet()

        val service = ReportService(mockConnection)
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
        setupSingleRowResultSet(
            orderId = "order-test-00000042",
            productName = "Raspberry Pi",
            quantity = 4,
            priceAtOrder = 2500,
            userName = "bob",
            paymentMethod = "BTC",
            saleDate = "2024-03-20T09:15:00",
        )

        val service = ReportService(mockConnection)
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
        assertEquals("order-test-00000042", item.orderId)
        assertEquals("Raspberry Pi", item.productName)
        assertEquals(4, item.quantity)
        assertEquals(2500, item.priceAtOrder)
        assertEquals("bob", item.userName)
        assertEquals("BTC", item.paymentMethod)
        assertEquals("2024-03-20T09:15:00", item.saleDate)
    }

    @Test
    fun `SELECT contains o-id AS order_id`() {
        val sqlCaptor = argumentCaptor<String>()
        whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(false)

        val service = ReportService(mockConnection)
        service.getProductSalesReport(
            period = null,
            startDate = null,
            endDate = null,
            productName = null,
            userId = null,
            paymentMethod = null,
        )

        val query = sqlCaptor.firstValue
        assertTrue(query.contains("o.id AS order_id"), "SELECT must include o.id AS order_id for client-side order grouping")
    }

    @Test
    fun `orderId is read from result set and stored in ProductSaleItem`() {
        setupSingleRowResultSet(orderId = "order-xyz-98765")

        val service = ReportService(mockConnection)
        val report =
            service.getProductSalesReport(
                period = null,
                startDate = null,
                endDate = null,
                productName = null,
                userId = null,
                paymentMethod = null,
            )

        assertEquals("order-xyz-98765", report.sales[0].orderId)
        verify(mockResultSet).getString("order_id")
    }

    @Test
    fun `multiple line items from the same order carry the same orderId`() {
        whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false)
        whenever(mockResultSet.getString("order_id")).thenReturn("order-shared-001").thenReturn("order-shared-001")
        whenever(mockResultSet.getString("product_name")).thenReturn("Widget A").thenReturn("Widget B")
        whenever(mockResultSet.getInt("quantity")).thenReturn(1).thenReturn(2)
        whenever(mockResultSet.getInt("price_at_order")).thenReturn(500).thenReturn(300)
        whenever(mockResultSet.getString("user_name")).thenReturn("alice").thenReturn("alice")
        whenever(mockResultSet.getString("payment_method")).thenReturn("Cash").thenReturn("Cash")
        whenever(mockResultSet.getString("sale_date")).thenReturn("2024-06-01T10:00:00").thenReturn("2024-06-01T10:00:00")

        val service = ReportService(mockConnection)
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
        assertEquals("order-shared-001", report.sales[0].orderId)
        assertEquals("order-shared-001", report.sales[1].orderId)
    }

    @Test
    fun `totalRevenueCents avoids overflow with large values using Long`() {
        whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(true).thenReturn(false)
        whenever(mockResultSet.getString("order_id")).thenReturn("order-big-001")
        whenever(mockResultSet.getString("product_name")).thenReturn("Expensive Item")
        whenever(mockResultSet.getInt("quantity")).thenReturn(1_000_000)
        whenever(mockResultSet.getInt("price_at_order")).thenReturn(Int.MAX_VALUE)
        whenever(mockResultSet.getString("user_name")).thenReturn("u1")
        whenever(mockResultSet.getString("payment_method")).thenReturn("Cash")
        whenever(mockResultSet.getString("sale_date")).thenReturn("2024-01-01T00:00:00")

        val service = ReportService(mockConnection)
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
}
