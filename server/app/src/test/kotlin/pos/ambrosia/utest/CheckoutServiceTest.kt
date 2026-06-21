package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.times
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.models.StoreCheckoutItem
import pos.ambrosia.models.StoreCheckoutRequest
import pos.ambrosia.services.CheckoutService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.SQLException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class CheckoutServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

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
        orderStatement: PreparedStatement = mock(),
        itemStatement: PreparedStatement = mock(),
        stockStatement: PreparedStatement = mock(),
        ticketStatement: PreparedStatement = mock(),
        paymentStatement: PreparedStatement = mock(),
        ticketPaymentStatement: PreparedStatement = mock(),
    ) {
        whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderStatement)
        whenever(mockConnection.prepareStatement(contains("INSERT INTO order_products"))).thenReturn(itemStatement)
        whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(stockStatement)
        whenever(mockConnection.prepareStatement(contains("INSERT INTO tickets"))).thenReturn(ticketStatement)
        whenever(mockConnection.prepareStatement(contains("INSERT INTO payments"))).thenReturn(paymentStatement)
        whenever(mockConnection.prepareStatement(contains("INSERT INTO ticket_payments"))).thenReturn(ticketPaymentStatement)
        whenever(stockStatement.executeUpdate()).thenReturn(1)
    }

    @Test
    fun `checkout returns null when items list is empty`() {
        runBlocking {
            val service = CheckoutService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest(items = emptyList())) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert — no DB calls
        }
    }

    @Test
    fun `checkout returns null when any item has quantity zero`() {
        runBlocking {
            val items = listOf(StoreCheckoutItem("prod-1", 0, 500)) // Arrange
            val service = CheckoutService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest(items = items)) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `checkout returns null when any item has negative quantity`() {
        runBlocking {
            val items = listOf(StoreCheckoutItem("prod-1", -1, 500)) // Arrange
            val service = CheckoutService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest(items = items)) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `checkout returns StoreCheckoutResponse with non-null IDs on success`() {
        runBlocking {
            setupSuccessfulCheckout() // Arrange
            val service = CheckoutService(mockConnection) // Arrange
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
            val service = CheckoutService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest())!! // Act
            assertEquals(3, setOf(result.orderId, result.ticketId, result.paymentId).size) // Assert
        }
    }

    @Test
    fun `checkout commits transaction on success`() {
        runBlocking {
            setupSuccessfulCheckout() // Arrange
            val service = CheckoutService(mockConnection) // Arrange
            service.checkout(validStoreRequest()) // Act
            verify(mockConnection).commit() // Assert
            verify(mockConnection, never()).rollback() // Assert
        }
    }

    @Test
    fun `checkout returns null and rolls back when stock decrement affects 0 rows`() {
        runBlocking {
            val orderStatement: PreparedStatement = mock() // Arrange
            val itemStatement: PreparedStatement = mock() // Arrange
            val stockStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO order_products"))).thenReturn(itemStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(stockStatement) // Arrange
            whenever(stockStatement.executeUpdate()).thenReturn(0) // Arrange — stock insufficient
            val service = CheckoutService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest()) // Act
            assertNull(result) // Assert
            verify(mockConnection).rollback() // Assert
            verify(mockConnection, never()).commit() // Assert
        }
    }

    @Test
    fun `checkout rolls back and rethrows on SQL exception`() {
        val orderStatement: PreparedStatement = mock() // Arrange
        whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderStatement) // Arrange
        whenever(orderStatement.executeUpdate()).thenThrow(SQLException("DB error")) // Arrange
        val service = CheckoutService(mockConnection) // Arrange
        assertFailsWith<SQLException> {
            runBlocking { service.checkout(validStoreRequest()) }
        }
        verify(mockConnection).rollback() // Assert
        verify(mockConnection, never()).commit() // Assert
    }

    @Test
    fun `checkout restores autoCommit to previous value after success`() {
        runBlocking {
            whenever(mockConnection.autoCommit).thenReturn(true) // Arrange — prev = true
            setupSuccessfulCheckout() // Arrange
            val service = CheckoutService(mockConnection) // Arrange
            service.checkout(validStoreRequest()) // Act
            verify(mockConnection).autoCommit = false // Assert — disabled for transaction
            verify(mockConnection).autoCommit = true // Assert — restored
        }
    }

    @Test
    fun `checkout restores autoCommit after rollback`() {
        whenever(mockConnection.autoCommit).thenReturn(true) // Arrange — prev = true
        val orderStatement: PreparedStatement = mock() // Arrange
        whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderStatement) // Arrange
        whenever(orderStatement.executeUpdate()).thenThrow(SQLException("forced")) // Arrange
        val service = CheckoutService(mockConnection) // Arrange
        assertFailsWith<SQLException> { runBlocking { service.checkout(validStoreRequest()) } } // Act
        verify(mockConnection).autoCommit = true // Assert — restored even after exception
    }

    @Test
    fun `checkout uses empty string when transactionId is null`() {
        runBlocking {
            val paymentStatement: PreparedStatement = mock() // Arrange
            val orderStatement: PreparedStatement = mock() // Arrange
            val itemStatement: PreparedStatement = mock() // Arrange
            val stockStatement: PreparedStatement = mock() // Arrange
            val ticketStatement: PreparedStatement = mock() // Arrange
            val ticketPaymentStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO order_products"))).thenReturn(itemStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(stockStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO tickets"))).thenReturn(ticketStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO payments"))).thenReturn(paymentStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO ticket_payments"))).thenReturn(ticketPaymentStatement) // Arrange
            whenever(stockStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = CheckoutService(mockConnection) // Arrange
            service.checkout(validStoreRequest(transactionId = null)) // Act
            verify(paymentStatement).setString(4, "") // Assert — null → ""
        }
    }

    @Test
    fun `checkout uses provided transactionId when not null`() {
        runBlocking {
            val paymentStatement: PreparedStatement = mock() // Arrange
            val orderStatement: PreparedStatement = mock() // Arrange
            val itemStatement: PreparedStatement = mock() // Arrange
            val stockStatement: PreparedStatement = mock() // Arrange
            val ticketStatement: PreparedStatement = mock() // Arrange
            val ticketPaymentStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO order_products"))).thenReturn(itemStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(stockStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO tickets"))).thenReturn(ticketStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO payments"))).thenReturn(paymentStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO ticket_payments"))).thenReturn(ticketPaymentStatement) // Arrange
            whenever(stockStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = CheckoutService(mockConnection) // Arrange
            service.checkout(validStoreRequest(transactionId = "lnbc123")) // Act
            verify(paymentStatement).setString(4, "lnbc123") // Assert
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
            val stockStatement: PreparedStatement = mock() // Arrange
            val orderStatement: PreparedStatement = mock() // Arrange
            val itemStatement: PreparedStatement = mock() // Arrange
            val ticketStatement: PreparedStatement = mock() // Arrange
            val paymentStatement: PreparedStatement = mock() // Arrange
            val ticketPaymentStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO order_products"))).thenReturn(itemStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(stockStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO tickets"))).thenReturn(ticketStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO payments"))).thenReturn(paymentStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO ticket_payments"))).thenReturn(ticketPaymentStatement) // Arrange
            whenever(stockStatement.executeUpdate()).thenReturn(1) // Arrange — both items have stock
            val service = CheckoutService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest(items = items)) // Act
            assertNotNull(result) // Assert
            verify(stockStatement, times(2)).executeUpdate() // Assert — called once per item
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
            val stockStatement: PreparedStatement = mock() // Arrange
            val orderStatement: PreparedStatement = mock() // Arrange
            val itemStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO order_products"))).thenReturn(itemStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(stockStatement) // Arrange
            whenever(stockStatement.executeUpdate()).thenReturn(1).thenReturn(0) // Arrange — second item fails
            val service = CheckoutService(mockConnection) // Arrange
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
            val service = CheckoutService(mockConnection) // Arrange
            val result = service.getStoreOrders() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getStoreOrders uses status filter query when status is provided`() {
        runBlocking {
            val statusStatement: PreparedStatement = mock() // Arrange
            val statusResultSet: ResultSet = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("AND o.status = ?"))).thenReturn(statusStatement) // Arrange
            whenever(statusStatement.executeQuery()).thenReturn(statusResultSet) // Arrange
            whenever(statusResultSet.next()).thenReturn(false) // Arrange
            val service = CheckoutService(mockConnection) // Arrange
            service.getStoreOrders(status = "paid") // Act
            verify(statusStatement).setString(1, "paid") // Assert
        }
    }

    @Test
    fun `getStoreOrderById returns null when order not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = CheckoutService(mockConnection) // Arrange
            val result = service.getStoreOrderById("not-found") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `cancelStoreOrder returns true when order is cancelled`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = CheckoutService(mockConnection) // Arrange
            val result = service.cancelStoreOrder("order-1") // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `cancelStoreOrder returns false when order not found or already closed`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = CheckoutService(mockConnection) // Arrange
            val result = service.cancelStoreOrder("not-found") // Act
            assertEquals(false, result) // Assert
        }
    }
}
