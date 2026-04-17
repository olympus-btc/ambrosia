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
        whenever(mockResultSet.getString("product_name")).thenReturn(productName)
        whenever(mockResultSet.getInt("quantity")).thenReturn(quantity)
        whenever(mockResultSet.getInt("price_at_order")).thenReturn(priceAtOrder)
        whenever(mockResultSet.getString("user_name")).thenReturn(userName)
        whenever(mockResultSet.getString("payment_method")).thenReturn(paymentMethod)
        whenever(mockResultSet.getString("sale_date")).thenReturn(saleDate)
    }

    @Test
    fun `period=week agrega WHERE con fecha inicio lunes de la semana actual`() {
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
        assertTrue(query.contains("date(o.created_at) >= date(?)"), "Debe filtrar por fecha inicio")
        assertTrue(query.contains("date(o.created_at) <= date(?)"), "Debe filtrar por fecha fin")

        val expectedStart = LocalDate.now(ZoneOffset.UTC).with(DayOfWeek.MONDAY).toString()
        val expectedEnd = LocalDate.now(ZoneOffset.UTC).toString()
        verify(mockStatement).setString(1, expectedStart)
        verify(mockStatement).setString(2, expectedEnd)
    }

    @Test
    fun `period=month agrega WHERE con primer dia del mes actual`() {
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
    fun `period=year agrega WHERE con primer dia del año actual`() {
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
    fun `period invalido lanza IllegalArgumentException`() {
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
    fun `startDate y endDate sin period usa las fechas proporcionadas`() {
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
    fun `sin period ni fechas no agrega WHERE de rango de fecha`() {
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
        assertFalse(query.contains("date(o.created_at)"), "Sin filtros de fecha no debe haber WHERE de fecha")
    }

    @Test
    fun `period toma precedencia sobre startDate y endDate`() {
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
    fun `sin filtros construye query sin cláusulas AND adicionales`() {
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
        assertFalse(query.contains("LIKE"), "Sin productName no debe haber LIKE")
        // "o.user_id" aparece en el JOIN base (JOIN users u ON u.id = o.user_id); verificar solo el predicado WHERE
        assertFalse(query.contains("o.user_id = ?"), "Sin userId no debe haber filtro WHERE de usuario")
        assertFalse(query.contains("lower(pm.name)"), "Sin paymentMethod no debe haber filtro de método de pago")
        assertTrue(query.contains("ORDER BY o.created_at DESC"), "Siempre debe ordenar DESC")
    }

    @Test
    fun `con productName agrega clausula LIKE case-insensitive`() {
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
        assertTrue(query.contains("p.name LIKE ?"), "Debe filtrar por nombre de producto con LIKE")
        verify(mockStatement).setString(1, "%Widget%")
    }

    @Test
    fun `con paymentMethod agrega clausula lower() = lower()`() {
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
        assertTrue(query.contains("lower(pm.name) = lower(?)"), "Debe comparar método de pago sin distinción de caso")
        verify(mockStatement).setString(1, "Cash")
    }

    @Test
    fun `con userId agrega clausula de igualdad exacta`() {
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
        assertTrue(query.contains("o.user_id = ?"), "Debe filtrar por ID de usuario exacto")
        verify(mockStatement).setString(1, "user-42")
    }

    @Test
    fun `todos los filtros juntos generan cuatro clausulas AND`() {
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
    fun `calcula totalRevenueCents como suma de priceAtOrder por quantity`() {
        whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false)
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
    fun `calcula totalItemsSold como suma de quantities`() {
        whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false)
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
    fun `devuelve lista vacia y ceros cuando no hay datos`() {
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
    fun `mapea correctamente los campos del ResultSet a ProductSaleItem`() {
        setupSingleRowResultSet(
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
        assertEquals("Raspberry Pi", item.productName)
        assertEquals(4, item.quantity)
        assertEquals(2500, item.priceAtOrder)
        assertEquals("bob", item.userName)
        assertEquals("BTC", item.paymentMethod)
        assertEquals("2024-03-20T09:15:00", item.saleDate)
    }

    @Test
    fun `totalRevenueCents evita overflow con valores grandes usando Long`() {
        whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
        whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
        whenever(mockResultSet.next()).thenReturn(true).thenReturn(false)
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
        assertEquals(expected, report.totalRevenueCents, "El cálculo debe usar Long para no desbordarse")
    }
}
