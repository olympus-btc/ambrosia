package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.assertThrows
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.models.StoreCheckoutItem
import pos.ambrosia.models.StoreCheckoutRequest
import pos.ambrosia.services.StoreOrderService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.SQLException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class StoreOrderServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun validRequest(
        items: List<StoreCheckoutItem> =
            listOf(
                StoreCheckoutItem("prod-1", 2, 500),
            ),
        transactionId: String? = null,
    ) = StoreCheckoutRequest(
        user_id = "user-1",
        waiter = "Ana",
        items = items,
        payment_method_id = "pm-cash",
        currency_id = "cur-mxn",
        amount = 10.0,
        transaction_id = transactionId,
        ticket_notes = "",
    )

    /** Configures all INSERT/UPDATE mocks for a successful checkout. */
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

    // ── checkout ─────────────────────────────────────────────────────────────

    @Test
    fun `checkout returns null when items list is empty`() {
        runBlocking {
            val service = StoreOrderService(mockConnection) // Arrange
            val result = service.checkout(validRequest(items = emptyList())) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert — no DB calls
        }
    }

    @Test
    fun `checkout returns null when any item has quantity zero`() {
        runBlocking {
            val items = listOf(StoreCheckoutItem("prod-1", 0, 500)) // Arrange
            val service = StoreOrderService(mockConnection) // Arrange
            val result = service.checkout(validRequest(items = items)) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `checkout returns null when any item has negative quantity`() {
        runBlocking {
            val items = listOf(StoreCheckoutItem("prod-1", -1, 500)) // Arrange
            val service = StoreOrderService(mockConnection) // Arrange
            val result = service.checkout(validRequest(items = items)) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `checkout returns StoreCheckoutResponse with non-null IDs on success`() {
        runBlocking {
            setupSuccessfulCheckout() // Arrange
            val service = StoreOrderService(mockConnection) // Arrange
            val result = service.checkout(validRequest()) // Act
            assertNotNull(result) // Assert
            assertNotNull(result.order_id) // Assert
            assertNotNull(result.ticket_id) // Assert
            assertNotNull(result.payment_id) // Assert
            assertTrue(result.order_id.isNotBlank()) // Assert
            assertTrue(result.ticket_id.isNotBlank()) // Assert
            assertTrue(result.payment_id.isNotBlank()) // Assert
        }
    }

    @Test
    fun `checkout returns unique IDs for order, ticket and payment`() {
        runBlocking {
            setupSuccessfulCheckout() // Arrange
            val service = StoreOrderService(mockConnection) // Arrange
            val result = service.checkout(validRequest())!! // Act
            assertEquals(3, setOf(result.order_id, result.ticket_id, result.payment_id).size) // Assert
        }
    }

    @Test
    fun `checkout commits transaction on success`() {
        runBlocking {
            setupSuccessfulCheckout() // Arrange
            val service = StoreOrderService(mockConnection) // Arrange
            service.checkout(validRequest()) // Act
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
            val service = StoreOrderService(mockConnection) // Arrange
            val result = service.checkout(validRequest()) // Act
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
            val service = StoreOrderService(mockConnection) // Arrange
            assertThrows<SQLException> {
                // Act + Assert
                service.checkout(validRequest())
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
            val service = StoreOrderService(mockConnection) // Arrange
            service.checkout(validRequest()) // Act
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
            val service = StoreOrderService(mockConnection) // Arrange
            assertThrows<SQLException> { service.checkout(validRequest()) } // Act
            verify(mockConnection).autoCommit = true // Assert — restored even after exception
        }
    }

    @Test
    fun `checkout uses empty string when transaction_id is null`() {
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
            val service = StoreOrderService(mockConnection) // Arrange
            service.checkout(validRequest(transactionId = null)) // Act
            verify(paymentSt).setString(4, "") // Assert — null → ""
        }
    }

    @Test
    fun `checkout uses provided transaction_id when not null`() {
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
            val service = StoreOrderService(mockConnection) // Arrange
            service.checkout(validRequest(transactionId = "lnbc123")) // Act
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
            val service = StoreOrderService(mockConnection) // Arrange
            val result = service.checkout(validRequest(items = items)) // Act
            assertNotNull(result) // Assert
            verify(stockSt, org.mockito.kotlin.times(2)).executeUpdate() // Assert — called once per item
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
            val service = StoreOrderService(mockConnection) // Arrange
            val result = service.checkout(validRequest(items = items)) // Act
            assertNull(result) // Assert
            verify(mockConnection).rollback() // Assert
        }
    }

    // ── getOrders ─────────────────────────────────────────────────────────────

    @Test
    fun `getOrders returns empty list when no orders found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = StoreOrderService(mockConnection) // Arrange
            val result = service.getOrders() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getOrders uses status filter query when status is provided`() {
        runBlocking {
            val statusSt: PreparedStatement = mock() // Arrange
            val statusRs: ResultSet = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("AND status = ?"))).thenReturn(statusSt) // Arrange
            whenever(statusSt.executeQuery()).thenReturn(statusRs) // Arrange
            whenever(statusRs.next()).thenReturn(false) // Arrange
            val service = StoreOrderService(mockConnection) // Arrange
            service.getOrders(status = "paid") // Act
            verify(statusSt).setString(1, "paid") // Assert
        }
    }

    // ── getOrderById ──────────────────────────────────────────────────────────

    @Test
    fun `getOrderById returns null when order not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = StoreOrderService(mockConnection) // Arrange
            val result = service.getOrderById("not-found") // Act
            assertNull(result) // Assert
        }
    }

    // ── cancelOrder ───────────────────────────────────────────────────────────

    @Test
    fun `cancelOrder returns true when order is cancelled`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = StoreOrderService(mockConnection) // Arrange
            val result = service.cancelOrder("order-1") // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `cancelOrder returns false when order not found or already closed`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = StoreOrderService(mockConnection) // Arrange
            val result = service.cancelOrder("not-found") // Act
            assertEquals(false, result) // Assert
        }
    }
}
