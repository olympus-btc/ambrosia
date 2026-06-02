package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.assertThrows
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.times
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.models.Order
import pos.ambrosia.models.OrderWithPaymentFilters
import pos.ambrosia.models.StoreCheckoutItem
import pos.ambrosia.models.StoreCheckoutRequest
import pos.ambrosia.services.OrderService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.SQLException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class OrderServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    @Test
    fun `getOrders returns list of orders when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("order-1").thenReturn("order-2") // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn("user-1").thenReturn("user-2") // Arrange
            whenever(mockResultSet.getString("table_id")).thenReturn("table-1").thenReturn("table-2") // Arrange
            whenever(mockResultSet.getString("status")).thenReturn("open").thenReturn("paid") // Arrange
            whenever(mockResultSet.getDouble("total")).thenReturn(100.0).thenReturn(200.0) // Arrange
            whenever(mockResultSet.getString("created_at")).thenReturn("date-1").thenReturn("date-2") // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrders() // Act
            assertEquals(2, result.size) // Assert
            assertEquals("order-1", result[0].id) // Assert
        }
    }

    @Test
    fun `getOrders returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrders() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getOrdersWithPaymentsFiltered applies status filter and default date desc sort`() {
        runBlocking {
            val sqlCaptor = argumentCaptor<String>()
            whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false)
            whenever(mockResultSet.getString("id")).thenReturn("order-1")
            whenever(mockResultSet.getString("user_id")).thenReturn("user-1")
            whenever(mockResultSet.getString("table_id")).thenReturn("table-1")
            whenever(mockResultSet.getString("status")).thenReturn("paid")
            whenever(mockResultSet.getDouble("total")).thenReturn(100.0)
            whenever(mockResultSet.getString("created_at")).thenReturn("2025-01-10T10:00:00")
            whenever(mockResultSet.getString("payment_method")).thenReturn("Cash")
            whenever(mockResultSet.getString("payment_method_ids")).thenReturn("payment-1")
            whenever(mockResultSet.getObject("satoshi_amount")).thenReturn(null)
            whenever(mockResultSet.getObject("exchange_rate_at_payment")).thenReturn(null)
            whenever(mockResultSet.getString("exchange_rate_currency")).thenReturn(null)
            whenever(mockResultSet.getObject("fiat_amount_at_payment")).thenReturn(null)

            val service = OrderService(mockConnection)
            val result = service.getOrdersWithPaymentsFiltered(OrderWithPaymentFilters(status = "paid"))

            assertEquals(1, result.size)
            assertEquals("Cash", result[0].paymentMethod)
            assertTrue(sqlCaptor.firstValue.contains("o.status = ?"))
            assertTrue(sqlCaptor.firstValue.contains("ORDER BY datetime(o.created_at) desc"))
            verify(mockStatement).setString(1, "paid")
        }
    }

    @Test
    fun `getOrdersWithPaymentsFiltered applies combined filters and custom total sort`() {
        runBlocking {
            val sqlCaptor = argumentCaptor<String>()
            whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(false)

            val service = OrderService(mockConnection)
            service.getOrdersWithPaymentsFiltered(
                OrderWithPaymentFilters(
                    startDate = "2025-01-01",
                    endDate = "2025-01-31",
                    userId = "user-123",
                    paymentMethod = "cash",
                    minTotal = 10.0,
                    maxTotal = 500.0,
                    sortBy = "total",
                    sortOrder = "asc",
                ),
            )

            val query = sqlCaptor.firstValue
            assertTrue(query.contains("date(o.created_at) >= date(?)"))
            assertTrue(query.contains("date(o.created_at) <= date(?)"))
            assertTrue(query.contains("o.user_id = ?"))
            assertTrue(query.contains("lower(pm2.name) = lower(?)"))
            assertTrue(query.contains("o.total >= ?"))
            assertTrue(query.contains("o.total <= ?"))
            assertTrue(query.contains("ORDER BY o.total asc"))
            verify(mockStatement).setString(1, "2025-01-01")
            verify(mockStatement).setString(2, "2025-01-31")
            verify(mockStatement).setString(3, "user-123")
            verify(mockStatement).setString(4, "cash")
            verify(mockStatement).setDouble(5, 10.0)
            verify(mockStatement).setDouble(6, 500.0)
        }
    }

    @Test
    fun `getOrdersWithPaymentsFiltered applies date range filters`() {
        runBlocking {
            val sqlCaptor = argumentCaptor<String>()
            whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(false)

            val service = OrderService(mockConnection)
            service.getOrdersWithPaymentsFiltered(
                OrderWithPaymentFilters(
                    startDate = "2025-01-01",
                    endDate = "2025-01-31",
                ),
            )

            val query = sqlCaptor.firstValue
            assertTrue(query.contains("date(o.created_at) >= date(?)"))
            assertTrue(query.contains("date(o.created_at) <= date(?)"))
            verify(mockStatement).setString(1, "2025-01-01")
            verify(mockStatement).setString(2, "2025-01-31")
        }
    }

    @Test
    fun `getOrdersWithPaymentsFiltered applies user id filter`() {
        runBlocking {
            val sqlCaptor = argumentCaptor<String>()
            whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(false)

            val service = OrderService(mockConnection)
            service.getOrdersWithPaymentsFiltered(OrderWithPaymentFilters(userId = "user-123"))

            assertTrue(sqlCaptor.firstValue.contains("o.user_id = ?"))
            verify(mockStatement).setString(1, "user-123")
        }
    }

    @Test
    fun `getOrdersWithPaymentsFiltered applies payment method filter`() {
        runBlocking {
            val sqlCaptor = argumentCaptor<String>()
            whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(false)

            val service = OrderService(mockConnection)
            service.getOrdersWithPaymentsFiltered(OrderWithPaymentFilters(paymentMethod = "cash"))

            assertTrue(sqlCaptor.firstValue.contains("lower(pm2.name) = lower(?)"))
            verify(mockStatement).setString(1, "cash")
        }
    }

    @Test
    fun `getOrdersWithPaymentsFiltered applies total range filters`() {
        runBlocking {
            val sqlCaptor = argumentCaptor<String>()
            whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(false)

            val service = OrderService(mockConnection)
            service.getOrdersWithPaymentsFiltered(
                OrderWithPaymentFilters(
                    minTotal = 10.0,
                    maxTotal = 500.0,
                ),
            )

            val query = sqlCaptor.firstValue
            assertTrue(query.contains("o.total >= ?"))
            assertTrue(query.contains("o.total <= ?"))
            verify(mockStatement).setDouble(1, 10.0)
            verify(mockStatement).setDouble(2, 500.0)
        }
    }

    @Test
    fun `getOrdersWithPaymentsFiltered sorts by total ascending`() {
        runBlocking {
            val sqlCaptor = argumentCaptor<String>()
            whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(false)

            val service = OrderService(mockConnection)
            service.getOrdersWithPaymentsFiltered(
                OrderWithPaymentFilters(
                    sortBy = "total",
                    sortOrder = "asc",
                ),
            )

            assertTrue(sqlCaptor.firstValue.contains("ORDER BY o.total asc"))
        }
    }

    @Test
    fun `getOrdersWithPaymentsFiltered sorts by date descending by default`() {
        runBlocking {
            val sqlCaptor = argumentCaptor<String>()
            whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(false)

            val service = OrderService(mockConnection)
            service.getOrdersWithPaymentsFiltered()

            assertTrue(sqlCaptor.firstValue.contains("ORDER BY datetime(o.created_at) desc"))
        }
    }

    @Test
    fun `getOrdersWithPaymentsFiltered rejects invalid status`() {
        runBlocking {
            val service = OrderService(mockConnection)

            val exception =
                assertFailsWith<IllegalArgumentException> {
                    service.getOrdersWithPaymentsFiltered(OrderWithPaymentFilters(status = "invalid"))
                }

            assertEquals("Invalid status: invalid", exception.message)
            verify(mockConnection, never()).prepareStatement(any())
        }
    }

    @Test
    fun `getOrdersWithPaymentsFiltered rejects invalid sort by`() {
        runBlocking {
            val service = OrderService(mockConnection)

            val exception =
                assertFailsWith<IllegalArgumentException> {
                    service.getOrdersWithPaymentsFiltered(OrderWithPaymentFilters(sortBy = "waiter"))
                }

            assertEquals("Invalid sort_by: waiter", exception.message)
            verify(mockConnection, never()).prepareStatement(any())
        }
    }

    @Test
    fun `getOrderById returns order when found`() {
        runBlocking {
            val expectedOrder = Order("order-1", "user-1", "table-1", "open", 100.0, "date-1") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn(expectedOrder.id) // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn(expectedOrder.userId) // Arrange
            whenever(mockResultSet.getString("table_id")).thenReturn(expectedOrder.tableId) // Arrange
            whenever(mockResultSet.getString("status")).thenReturn(expectedOrder.status) // Arrange
            whenever(mockResultSet.getDouble("total")).thenReturn(expectedOrder.total) // Arrange
            whenever(mockResultSet.getString("created_at")).thenReturn(expectedOrder.createdAt) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrderById("order-1") // Act
            assertNotNull(result) // Assert
            assertEquals(expectedOrder, result) // Assert
        }
    }

    @Test
    fun `getOrderById returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrderById("not-found") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `getOrdersByTableId returns orders when found`() {
        runBlocking {
            val tableCheckStatement: PreparedStatement = mock() // Arrange
            val tableResultSet: ResultSet = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("tables"))).thenReturn(tableCheckStatement) // Arrange
            whenever(tableCheckStatement.executeQuery()).thenReturn(tableResultSet) // Arrange
            whenever(tableResultSet.next()).thenReturn(true) // Arrange

            whenever(mockConnection.prepareStatement(contains("FROM orders"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("order-1") // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn("user-1") // Arrange
            whenever(mockResultSet.getString("table_id")).thenReturn("table-1") // Arrange
            whenever(mockResultSet.getString("status")).thenReturn("open") // Arrange
            whenever(mockResultSet.getDouble("total")).thenReturn(100.0) // Arrange
            whenever(mockResultSet.getString("created_at")).thenReturn("date-1") // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByTableId("table-1") // Act
            assertNotNull(result) // Assert
            assertEquals(1, result.size) // Assert
            assertEquals("order-1", result[0].id) // Assert
        }
    }

    @Test
    fun `getOrdersByTableId returns empty list when none found`() {
        runBlocking {
            val tableCheckStatement: PreparedStatement = mock() // Arrange
            val tableResultSet: ResultSet = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("tables"))).thenReturn(tableCheckStatement) // Arrange
            whenever(tableCheckStatement.executeQuery()).thenReturn(tableResultSet) // Arrange
            whenever(tableResultSet.next()).thenReturn(true) // Arrange

            whenever(mockConnection.prepareStatement(contains("FROM orders"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByTableId("table-2") // Act
            assertNotNull(result) // Assert
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getOrdersByTableId returns null when table not found`() {
        runBlocking {
            val tableCheckStatement: PreparedStatement = mock() // Arrange
            val tableResultSet: ResultSet = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("tables"))).thenReturn(tableCheckStatement) // Arrange
            whenever(tableCheckStatement.executeQuery()).thenReturn(tableResultSet) // Arrange
            whenever(tableResultSet.next()).thenReturn(false) // Arrange

            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByTableId("not-found") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `getOrdersByUserId returns orders when found`() {
        runBlocking {
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange

            whenever(mockConnection.prepareStatement(contains("FROM orders"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("order-1") // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn("user-1") // Arrange
            whenever(mockResultSet.getString("table_id")).thenReturn("table-1") // Arrange
            whenever(mockResultSet.getString("status")).thenReturn("open") // Arrange
            whenever(mockResultSet.getDouble("total")).thenReturn(100.0) // Arrange
            whenever(mockResultSet.getString("created_at")).thenReturn("date-1") // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByUserId("user-1") // Act
            assertNotNull(result) // Assert
            assertEquals(1, result.size) // Assert
            assertEquals("order-1", result[0].id) // Assert
        }
    }

    @Test
    fun `getOrdersByUserId returns empty list when none found`() {
        runBlocking {
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange

            whenever(mockConnection.prepareStatement(contains("FROM orders"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByUserId("user-2") // Act
            assertNotNull(result) // Assert
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getOrdersByUserId returns null when user not found`() {
        runBlocking {
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            whenever(userResultSet.next()).thenReturn(false) // Arrange

            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByUserId("not-found") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `getOrdersByStatus returns null for invalid status`() {
        runBlocking {
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByStatus("invalid-status") // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `getOrdersByStatus returns orders when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("order-1") // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn("user-1") // Arrange
            whenever(mockResultSet.getString("table_id")).thenReturn("table-1") // Arrange
            whenever(mockResultSet.getString("status")).thenReturn("paid") // Arrange
            whenever(mockResultSet.getDouble("total")).thenReturn(100.0) // Arrange
            whenever(mockResultSet.getString("created_at")).thenReturn("date-1") // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByStatus("paid") // Act
            assertNotNull(result) // Assert
            assertEquals(1, result.size) // Assert
            assertEquals("paid", result[0].status) // Assert
        }
    }

    @Test
    fun `getOrdersByStatus returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByStatus("open") // Act
            assertNotNull(result) // Assert
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getOrdersByDateRange returns orders when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("order-1") // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn("user-1") // Arrange
            whenever(mockResultSet.getString("table_id")).thenReturn("table-1") // Arrange
            whenever(mockResultSet.getString("status")).thenReturn("paid") // Arrange
            whenever(mockResultSet.getDouble("total")).thenReturn(100.0) // Arrange
            whenever(mockResultSet.getString("created_at")).thenReturn("2023-01-15") // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByDateRange("2023-01-01", "2023-01-31") // Act
            assertEquals(1, result.size) // Assert
            assertEquals("order-1", result[0].id) // Assert
        }
    }

    @Test
    fun `getOrdersByDateRange returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByDateRange("2023-02-01", "2023-02-28") // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getTotalSalesByDate returns total sales when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getDouble("total_sales")).thenReturn(1234.56) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getTotalSalesByDate("2023-01-15") // Act
            assertEquals(1234.56, result) // Assert
        }
    }

    @Test
    fun `getTotalSalesByDate returns zero when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getTotalSalesByDate("2023-01-16") // Act
            assertEquals(0.0, result) // Assert
        }
    }

    @Test
    fun `addOrder returns null if user does not exist`() {
        runBlocking {
            val newOrder = Order(null, "non-existent-user", "table-1", "open", 0.0, "") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.addOrder(newOrder) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addOrder returns null if table does not exist`() {
        runBlocking {
            val newOrder = Order(null, "user-1", "non-existent-table", "open", 0.0, "") // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val tableCheckStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("tables"))).thenReturn(tableCheckStatement) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            val tableResultSet: ResultSet = mock() // Arrange
            whenever(tableResultSet.next()).thenReturn(false) // Arrange
            whenever(tableCheckStatement.executeQuery()).thenReturn(tableResultSet) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.addOrder(newOrder) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addOrder returns null if status is invalid`() {
        runBlocking {
            val newOrder = Order(null, "user-1", "table-1", "invalid-status", 0.0, "") // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val tableCheckStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("tables"))).thenReturn(tableCheckStatement) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            val tableResultSet: ResultSet = mock() // Arrange
            whenever(tableResultSet.next()).thenReturn(true) // Arrange
            whenever(tableCheckStatement.executeQuery()).thenReturn(tableResultSet) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.addOrder(newOrder) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addOrder returns new ID on success`() {
        runBlocking {
            val newOrder = Order(null, "user-1", "table-1", "open", 0.0, "") // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val tableCheckStatement: PreparedStatement = mock() // Arrange
            val addStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("tables"))).thenReturn(tableCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(addStatement) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            val tableResultSet: ResultSet = mock() // Arrange
            whenever(tableResultSet.next()).thenReturn(true) // Arrange
            whenever(tableCheckStatement.executeQuery()).thenReturn(tableResultSet) // Arrange
            whenever(addStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.addOrder(newOrder) // Act
            assertNotNull(result) // Assert
        }
    }

    @Test
    fun `addOrder returns null when database insert fails`() {
        runBlocking {
            val newOrder = Order(null, "user-1", "table-1", "open", 0.0, "") // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val tableCheckStatement: PreparedStatement = mock() // Arrange
            val addStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("tables"))).thenReturn(tableCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(addStatement) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            val tableResultSet: ResultSet = mock() // Arrange
            whenever(tableResultSet.next()).thenReturn(true) // Arrange
            whenever(tableCheckStatement.executeQuery()).thenReturn(tableResultSet) // Arrange
            whenever(addStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.addOrder(newOrder) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `updateOrder returns false if ID is null`() {
        runBlocking {
            val order =
                Order(
                    id = null,
                    userId = "user-1",
                    tableId = "table-1",
                    status = "open",
                    total = 100.0,
                    createdAt = "date-1",
                ) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.updateOrder(order) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `updateOrder returns false if user does not exist`() {
        runBlocking {
            val order =
                Order(
                    id = "order-1",
                    userId = "non-existent-user",
                    tableId = "table-1",
                    status = "open",
                    total = 100.0,
                    createdAt = "date-1",
                ) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.updateOrder(order) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateOrder returns false if table does not exist`() {
        runBlocking {
            val order =
                Order(
                    id = "order-1",
                    userId = "user-1",
                    tableId = "non-existent-table",
                    status = "open",
                    total = 100.0,
                    createdAt = "date-1",
                ) // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val tableCheckStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("tables"))).thenReturn(tableCheckStatement) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            val tableResultSet: ResultSet = mock() // Arrange
            whenever(tableResultSet.next()).thenReturn(false) // Arrange
            whenever(tableCheckStatement.executeQuery()).thenReturn(tableResultSet) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.updateOrder(order) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateOrder returns false if status is invalid`() {
        runBlocking {
            val order =
                Order(
                    id = "order-1",
                    userId = "user-1",
                    tableId = "table-1",
                    status = "invalid-status",
                    total = 100.0,
                    createdAt = "date-1",
                ) // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val tableCheckStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("tables"))).thenReturn(tableCheckStatement) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            val tableResultSet: ResultSet = mock() // Arrange
            whenever(tableResultSet.next()).thenReturn(true) // Arrange
            whenever(tableCheckStatement.executeQuery()).thenReturn(tableResultSet) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.updateOrder(order) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateOrder returns true on success`() {
        runBlocking {
            val order =
                Order(
                    id = "order-1",
                    userId = "user-1",
                    tableId = "table-1",
                    status = "open",
                    total = 150.0,
                    createdAt = "date-1",
                ) // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val tableCheckStatement: PreparedStatement = mock() // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("tables"))).thenReturn(tableCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE orders"))).thenReturn(updateStatement) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            val tableResultSet: ResultSet = mock() // Arrange
            whenever(tableResultSet.next()).thenReturn(true) // Arrange
            whenever(tableCheckStatement.executeQuery()).thenReturn(tableResultSet) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.updateOrder(order) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `updateOrder returns false when database update fails`() {
        runBlocking {
            val order =
                Order(
                    id = "order-1",
                    userId = "user-1",
                    tableId = "table-1",
                    status = "open",
                    total = 150.0,
                    createdAt = "date-1",
                ) // Arrange
            val userCheckStatement: PreparedStatement = mock() // Arrange
            val tableCheckStatement: PreparedStatement = mock() // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("users"))).thenReturn(userCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("tables"))).thenReturn(tableCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE orders"))).thenReturn(updateStatement) // Arrange
            val userResultSet: ResultSet = mock() // Arrange
            whenever(userResultSet.next()).thenReturn(true) // Arrange
            whenever(userCheckStatement.executeQuery()).thenReturn(userResultSet) // Arrange
            val tableResultSet: ResultSet = mock() // Arrange
            whenever(tableResultSet.next()).thenReturn(true) // Arrange
            whenever(tableCheckStatement.executeQuery()).thenReturn(tableResultSet) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.updateOrder(order) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `deleteOrder returns true on success`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.deleteOrder("order-1") // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `deleteOrder returns false when order not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.deleteOrder("not-found-order") // Act
            assertFalse(result) // Assert
        }
    }

    private fun validStoreRequest(
        items: List<StoreCheckoutItem> = listOf(StoreCheckoutItem("prod-1", 2, 500)),
        transactionId: String? = null,
    ) = StoreCheckoutRequest(
        userId = "user-1",
        items = items,
        paymentMethodId = "pm-cash",
        currencyId = "cur-mxn",
        amount = 10.0,
        transactionId = transactionId,
        ticketNotes = "",
    )

    private fun setupSuccessfulCheckout(
        orderSt: PreparedStatement = mock(),
        itemSt: PreparedStatement = mock(),
        stockSt: PreparedStatement = mock(),
        ticketSt: PreparedStatement = mock(),
        paymentSt: PreparedStatement = mock(),
        ticketPaymentSt: PreparedStatement = mock(),
    ) {
        whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderSt)
        whenever(mockConnection.prepareStatement(contains("INSERT INTO order_products"))).thenReturn(itemSt)
        whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(stockSt)
        whenever(mockConnection.prepareStatement(contains("INSERT INTO tickets"))).thenReturn(ticketSt)
        whenever(mockConnection.prepareStatement(contains("INSERT INTO payments"))).thenReturn(paymentSt)
        whenever(mockConnection.prepareStatement(contains("INSERT INTO ticket_payments"))).thenReturn(ticketPaymentSt)
        whenever(stockSt.executeUpdate()).thenReturn(1)
    }

    @Test
    fun `checkout returns null when items list is empty`() {
        runBlocking {
            val service = OrderService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest(items = emptyList())) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert — no DB calls
        }
    }

    @Test
    fun `checkout returns null when any item has quantity zero`() {
        runBlocking {
            val items = listOf(StoreCheckoutItem("prod-1", 0, 500)) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest(items = items)) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `checkout returns null when any item has negative quantity`() {
        runBlocking {
            val items = listOf(StoreCheckoutItem("prod-1", -1, 500)) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest(items = items)) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `checkout returns StoreCheckoutResponse with non-null IDs on success`() {
        runBlocking {
            setupSuccessfulCheckout() // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest()) // Act
            assertNotNull(result) // Assert
            assertNotNull(result.orderId) // Assert
            assertNotNull(result.ticketId) // Assert
            assertNotNull(result.paymentId) // Assert
            assertTrue(result.orderId.isNotBlank()) // Assert
            assertTrue(result.ticketId.isNotBlank()) // Assert
            assertTrue(result.paymentId.isNotBlank()) // Assert
        }
    }

    @Test
    fun `checkout returns unique IDs for order, ticket and payment`() {
        runBlocking {
            setupSuccessfulCheckout() // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest())!! // Act
            assertEquals(3, setOf(result.orderId, result.ticketId, result.paymentId).size) // Assert
        }
    }

    @Test
    fun `checkout commits transaction on success`() {
        runBlocking {
            setupSuccessfulCheckout() // Arrange
            val service = OrderService(mockConnection) // Arrange
            service.checkout(validStoreRequest()) // Act
            verify(mockConnection).commit() // Assert
            verify(mockConnection, never()).rollback() // Assert
        }
    }

    @Test
    fun `checkout returns null and rolls back when stock decrement affects 0 rows`() {
        runBlocking {
            val orderSt: PreparedStatement = mock() // Arrange
            val itemSt: PreparedStatement = mock() // Arrange
            val stockSt: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO order_products"))).thenReturn(itemSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(stockSt) // Arrange
            whenever(stockSt.executeUpdate()).thenReturn(0) // Arrange — stock insufficient
            val service = OrderService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest()) // Act
            assertNull(result) // Assert
            verify(mockConnection).rollback() // Assert
            verify(mockConnection, never()).commit() // Assert
        }
    }

    @Test
    fun `checkout rolls back and rethrows on SQL exception`() {
        runBlocking {
            val orderSt: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderSt) // Arrange
            whenever(orderSt.executeUpdate()).thenThrow(SQLException("DB error")) // Arrange
            val service = OrderService(mockConnection) // Arrange
            assertThrows<SQLException> {
                service.checkout(validStoreRequest())
            }
            verify(mockConnection).rollback() // Assert
            verify(mockConnection, never()).commit() // Assert
        }
    }

    @Test
    fun `checkout restores autoCommit to previous value after success`() {
        runBlocking {
            whenever(mockConnection.autoCommit).thenReturn(true) // Arrange — prev = true
            setupSuccessfulCheckout() // Arrange
            val service = OrderService(mockConnection) // Arrange
            service.checkout(validStoreRequest()) // Act
            verify(mockConnection).autoCommit = false // Assert — disabled for transaction
            verify(mockConnection).autoCommit = true // Assert — restored
        }
    }

    @Test
    fun `checkout restores autoCommit after rollback`() {
        runBlocking {
            whenever(mockConnection.autoCommit).thenReturn(true) // Arrange — prev = true
            val orderSt: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderSt) // Arrange
            whenever(orderSt.executeUpdate()).thenThrow(SQLException("forced")) // Arrange
            val service = OrderService(mockConnection) // Arrange
            assertThrows<SQLException> { service.checkout(validStoreRequest()) } // Act
            verify(mockConnection).autoCommit = true // Assert — restored even after exception
        }
    }

    @Test
    fun `checkout uses empty string when transactionId is null`() {
        runBlocking {
            val paymentSt: PreparedStatement = mock() // Arrange
            val orderSt: PreparedStatement = mock() // Arrange
            val itemSt: PreparedStatement = mock() // Arrange
            val stockSt: PreparedStatement = mock() // Arrange
            val ticketSt: PreparedStatement = mock() // Arrange
            val ticketPaymentSt: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO order_products"))).thenReturn(itemSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(stockSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO tickets"))).thenReturn(ticketSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO payments"))).thenReturn(paymentSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO ticket_payments"))).thenReturn(ticketPaymentSt) // Arrange
            whenever(stockSt.executeUpdate()).thenReturn(1) // Arrange
            val service = OrderService(mockConnection) // Arrange
            service.checkout(validStoreRequest(transactionId = null)) // Act
            verify(paymentSt).setString(4, "") // Assert — null → ""
        }
    }

    @Test
    fun `checkout uses provided transactionId when not null`() {
        runBlocking {
            val paymentSt: PreparedStatement = mock() // Arrange
            val orderSt: PreparedStatement = mock() // Arrange
            val itemSt: PreparedStatement = mock() // Arrange
            val stockSt: PreparedStatement = mock() // Arrange
            val ticketSt: PreparedStatement = mock() // Arrange
            val ticketPaymentSt: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO order_products"))).thenReturn(itemSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(stockSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO tickets"))).thenReturn(ticketSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO payments"))).thenReturn(paymentSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO ticket_payments"))).thenReturn(ticketPaymentSt) // Arrange
            whenever(stockSt.executeUpdate()).thenReturn(1) // Arrange
            val service = OrderService(mockConnection) // Arrange
            service.checkout(validStoreRequest(transactionId = "lnbc123")) // Act
            verify(paymentSt).setString(4, "lnbc123") // Assert
        }
    }

    @Test
    fun `checkout processes all items iterating stock decrement for each`() {
        runBlocking {
            val items =
                listOf( // Arrange
                    StoreCheckoutItem("prod-1", 1, 100),
                    StoreCheckoutItem("prod-2", 3, 200),
                )
            val stockSt: PreparedStatement = mock() // Arrange
            val orderSt: PreparedStatement = mock() // Arrange
            val itemSt: PreparedStatement = mock() // Arrange
            val ticketSt: PreparedStatement = mock() // Arrange
            val paymentSt: PreparedStatement = mock() // Arrange
            val ticketPaymentSt: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO order_products"))).thenReturn(itemSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(stockSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO tickets"))).thenReturn(ticketSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO payments"))).thenReturn(paymentSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO ticket_payments"))).thenReturn(ticketPaymentSt) // Arrange
            whenever(stockSt.executeUpdate()).thenReturn(1) // Arrange — both items have stock
            val service = OrderService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest(items = items)) // Act
            assertNotNull(result) // Assert
            verify(stockSt, times(2)).executeUpdate() // Assert — called once per item
        }
    }

    @Test
    fun `checkout rolls back when second item has insufficient stock`() {
        runBlocking {
            val items =
                listOf( // Arrange
                    StoreCheckoutItem("prod-1", 1, 100),
                    StoreCheckoutItem("prod-2", 999, 200),
                )
            val stockSt: PreparedStatement = mock() // Arrange
            val orderSt: PreparedStatement = mock() // Arrange
            val itemSt: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO order_products"))).thenReturn(itemSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(stockSt) // Arrange
            whenever(stockSt.executeUpdate()).thenReturn(1).thenReturn(0) // Arrange — second item fails
            val service = OrderService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest(items = items)) // Act
            assertNull(result) // Assert
            verify(mockConnection).rollback() // Assert
        }
    }

    @Test
    fun `getStoreOrders returns empty list when no orders found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getStoreOrders() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getOrdersWithPaymentsFiltered SQL includes MAX aggregates for bitcoin payment fields`() {
        runBlocking {
            val sqlCaptor = argumentCaptor<String>()
            whenever(mockConnection.prepareStatement(sqlCaptor.capture())).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(false)
            val service = OrderService(mockConnection)
            service.getOrdersWithPaymentsFiltered()
            val query = sqlCaptor.firstValue
            assertTrue(query.contains("MAX(p.satoshi_amount)"))
            assertTrue(query.contains("MAX(p.exchange_rate_at_payment)"))
            assertTrue(query.contains("MAX(p.exchange_rate_currency)"))
            assertTrue(query.contains("MAX(p.fiat_amount_at_payment)"))
        }
    }

    @Test
    fun `getOrdersWithPaymentsFiltered mapper extracts bitcoin fields when present`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false)
            whenever(mockResultSet.getString("id")).thenReturn("order-1")
            whenever(mockResultSet.getString("user_id")).thenReturn("user-1")
            whenever(mockResultSet.getString("table_id")).thenReturn(null)
            whenever(mockResultSet.getString("status")).thenReturn("paid")
            whenever(mockResultSet.getDouble("total")).thenReturn(1.0)
            whenever(mockResultSet.getString("created_at")).thenReturn("2025-01-10T10:00:00")
            whenever(mockResultSet.getString("payment_method")).thenReturn("BTC")
            whenever(mockResultSet.getString("payment_method_ids")).thenReturn("payment-1")
            whenever(mockResultSet.getObject("satoshi_amount")).thenReturn(100000L)
            whenever(mockResultSet.getObject("exchange_rate_at_payment")).thenReturn(95000.0)
            whenever(mockResultSet.getString("exchange_rate_currency")).thenReturn("usd")
            whenever(mockResultSet.getObject("fiat_amount_at_payment")).thenReturn(1.0)
            val service = OrderService(mockConnection)
            val result = service.getOrdersWithPaymentsFiltered()
            assertEquals(100000L, result[0].satoshiAmount)
            assertEquals(95000.0, result[0].exchangeRateAtPayment)
            assertEquals("usd", result[0].exchangeRateCurrency)
            assertEquals(1.0, result[0].fiatAmountAtPayment)
        }
    }

    @Test
    fun `getOrdersWithPaymentsFiltered mapper returns null bitcoin fields when not present`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false)
            whenever(mockResultSet.getString("id")).thenReturn("order-1")
            whenever(mockResultSet.getString("user_id")).thenReturn("user-1")
            whenever(mockResultSet.getString("table_id")).thenReturn(null)
            whenever(mockResultSet.getString("status")).thenReturn("paid")
            whenever(mockResultSet.getDouble("total")).thenReturn(15.0)
            whenever(mockResultSet.getString("created_at")).thenReturn("2025-01-10T10:00:00")
            whenever(mockResultSet.getString("payment_method")).thenReturn("Cash")
            whenever(mockResultSet.getString("payment_method_ids")).thenReturn("payment-1")
            whenever(mockResultSet.getObject("satoshi_amount")).thenReturn(null)
            whenever(mockResultSet.getObject("exchange_rate_at_payment")).thenReturn(null)
            whenever(mockResultSet.getString("exchange_rate_currency")).thenReturn(null)
            whenever(mockResultSet.getObject("fiat_amount_at_payment")).thenReturn(null)
            val service = OrderService(mockConnection)
            val result = service.getOrdersWithPaymentsFiltered()
            assertNull(result[0].satoshiAmount)
            assertNull(result[0].exchangeRateAtPayment)
            assertNull(result[0].exchangeRateCurrency)
            assertNull(result[0].fiatAmountAtPayment)
        }
    }

    @Test
    fun `getStoreOrders uses status filter query when status is provided`() {
        runBlocking {
            val statusSt: PreparedStatement = mock() // Arrange
            val statusRs: ResultSet = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("AND o.status = ?"))).thenReturn(statusSt) // Arrange
            whenever(statusSt.executeQuery()).thenReturn(statusRs) // Arrange
            whenever(statusRs.next()).thenReturn(false) // Arrange
            val service = OrderService(mockConnection) // Arrange
            service.getStoreOrders(status = "paid") // Act
            verify(statusSt).setString(1, "paid") // Assert
        }
    }

    @Test
    fun `getStoreOrderById returns null when order not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getStoreOrderById("not-found") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `cancelStoreOrder returns true when order is cancelled`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.cancelStoreOrder("order-1") // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `cancelStoreOrder returns false when order not found or already closed`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.cancelStoreOrder("not-found") // Act
            assertEquals(false, result) // Assert
        }
    }
}
