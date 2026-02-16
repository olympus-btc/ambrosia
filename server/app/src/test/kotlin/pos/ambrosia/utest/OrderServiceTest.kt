package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.*
import pos.ambrosia.models.Order
import pos.ambrosia.services.OrderService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.*

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
            whenever(mockResultSet.getString("waiter")).thenReturn("waiter-1").thenReturn("waiter-2") // Arrange
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
    fun `getOrderById returns order when found`() {
        runBlocking {
            val expectedOrder = Order("order-1", "user-1", "table-1", "waiter-1", "open", 100.0, "date-1") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn(expectedOrder.id) // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn(expectedOrder.user_id) // Arrange
            whenever(mockResultSet.getString("table_id")).thenReturn(expectedOrder.table_id) // Arrange
            whenever(mockResultSet.getString("waiter")).thenReturn(expectedOrder.waiter) // Arrange
            whenever(mockResultSet.getString("status")).thenReturn(expectedOrder.status) // Arrange
            whenever(mockResultSet.getDouble("total")).thenReturn(expectedOrder.total) // Arrange
            whenever(mockResultSet.getString("created_at")).thenReturn(expectedOrder.created_at) // Arrange
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
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("order-1") // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn("user-1") // Arrange
            whenever(mockResultSet.getString("table_id")).thenReturn("table-1") // Arrange
            whenever(mockResultSet.getString("waiter")).thenReturn("waiter-1") // Arrange
            whenever(mockResultSet.getString("status")).thenReturn("open") // Arrange
            whenever(mockResultSet.getDouble("total")).thenReturn(100.0) // Arrange
            whenever(mockResultSet.getString("created_at")).thenReturn("date-1") // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByTableId("table-1") // Act
            assertEquals(1, result.size) // Assert
            assertEquals("order-1", result[0].id) // Assert
        }
    }

    @Test
    fun `getOrdersByTableId returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByTableId("table-2") // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getOrdersByUserId returns orders when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("order-1") // Arrange
            whenever(mockResultSet.getString("user_id")).thenReturn("user-1") // Arrange
            whenever(mockResultSet.getString("table_id")).thenReturn("table-1") // Arrange
            whenever(mockResultSet.getString("waiter")).thenReturn("waiter-1") // Arrange
            whenever(mockResultSet.getString("status")).thenReturn("open") // Arrange
            whenever(mockResultSet.getDouble("total")).thenReturn(100.0) // Arrange
            whenever(mockResultSet.getString("created_at")).thenReturn("date-1") // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByUserId("user-1") // Act
            assertEquals(1, result.size) // Assert
            assertEquals("order-1", result[0].id) // Assert
        }
    }

    @Test
    fun `getOrdersByUserId returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByUserId("user-2") // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getOrdersByStatus returns empty list for invalid status`() {
        runBlocking {
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByStatus("invalid-status") // Act
            assertTrue(result.isEmpty()) // Assert
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
            whenever(mockResultSet.getString("waiter")).thenReturn("waiter-1") // Arrange
            whenever(mockResultSet.getString("status")).thenReturn("paid") // Arrange
            whenever(mockResultSet.getDouble("total")).thenReturn(100.0) // Arrange
            whenever(mockResultSet.getString("created_at")).thenReturn("date-1") // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.getOrdersByStatus("paid") // Act
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
            whenever(mockResultSet.getString("waiter")).thenReturn("waiter-1") // Arrange
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
            val newOrder = Order(null, "non-existent-user", "table-1", "waiter-1", "open", 0.0, "") // Arrange
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
            val newOrder = Order(null, "user-1", "non-existent-table", "waiter-1", "open", 0.0, "") // Arrange
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
            val newOrder = Order(null, "user-1", "table-1", "waiter-1", "invalid-status", 0.0, "") // Arrange
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
            val newOrder = Order(null, "user-1", "table-1", "waiter-1", "open", 0.0, "") // Arrange
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
            val newOrder = Order(null, "user-1", "table-1", "waiter-1", "open", 0.0, "") // Arrange
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
                    user_id = "user-1",
                    table_id = "table-1",
                    waiter = "waiter-1",
                    status = "open",
                    total = 100.0,
                    created_at = "date-1",
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
                    user_id = "non-existent-user",
                    table_id = "table-1",
                    waiter = "waiter-1",
                    status = "open",
                    total = 100.0,
                    created_at = "date-1",
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
                    user_id = "user-1",
                    table_id = "non-existent-table",
                    waiter = "waiter-1",
                    status = "open",
                    total = 100.0,
                    created_at = "date-1",
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
                    user_id = "user-1",
                    table_id = "table-1",
                    waiter = "waiter-1",
                    status = "invalid-status",
                    total = 100.0,
                    created_at = "date-1",
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
                    user_id = "user-1",
                    table_id = "table-1",
                    waiter = "waiter-1",
                    status = "open",
                    total = 150.0,
                    created_at = "date-1",
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
                    user_id = "user-1",
                    table_id = "table-1",
                    waiter = "waiter-1",
                    status = "open",
                    total = 150.0,
                    created_at = "date-1",
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
}
