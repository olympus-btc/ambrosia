package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.Order
import pos.ambrosia.services.OrderService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class OrderServiceTest {
    private lateinit var dbFile: File
    private val service = OrderService()

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

    private fun seedTable(): String {
        val spaceId = ExposedTestDb.seedSpace()
        return ExposedTestDb.seedDiningTable("Table 1", spaceId)
    }

    @Test
    fun `getOrders returns list of orders when found`() {
        runBlocking {
            val userId = seedUser()
            val orderId1 = ExposedTestDb.seedOrder(userId)
            val orderId2 = ExposedTestDb.seedOrder(userId)

            val result = service.getOrders()
            assertEquals(2, result.size)
            assertTrue(result.any { it.id == orderId1 })
            assertTrue(result.any { it.id == orderId2 })
        }
    }

    @Test
    fun `getOrders returns empty list when none found`() {
        runBlocking {
            val result = service.getOrders()
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getOrderById returns order when found`() {
        runBlocking {
            val userId = seedUser()
            val orderId = ExposedTestDb.seedOrder(userId, total = 100.0, status = "open")

            val result = service.getOrderById(orderId)
            assertNotNull(result)
            assertEquals(orderId, result.id)
            assertEquals(userId, result.userId)
            assertEquals("open", result.status)
            assertEquals(100.0, result.total)
        }
    }

    @Test
    fun `getOrderById returns null when not found`() {
        runBlocking {
            val result = service.getOrderById(UUID.randomUUID().toString())
            assertNull(result)
        }
    }

    @Test
    fun `getOrdersByTableId returns orders when found`() {
        runBlocking {
            val userId = seedUser()
            val tableId = seedTable()
            val orderId = ExposedTestDb.seedOrder(userId, tableId = tableId)

            val result = service.getOrdersByTableId(tableId)
            assertNotNull(result)
            assertEquals(1, result.size)
            assertEquals(orderId, result[0].id)
        }
    }

    @Test
    fun `getOrdersByTableId returns empty list when none found`() {
        runBlocking {
            val tableId = seedTable()
            val result = service.getOrdersByTableId(tableId)
            assertNotNull(result)
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getOrdersByTableId returns null when table not found`() {
        runBlocking {
            val result = service.getOrdersByTableId(UUID.randomUUID().toString())
            assertNull(result)
        }
    }

    @Test
    fun `getOrdersByUserId returns orders when found`() {
        runBlocking {
            val userId = seedUser()
            val orderId = ExposedTestDb.seedOrder(userId)

            val result = service.getOrdersByUserId(userId)
            assertNotNull(result)
            assertEquals(1, result.size)
            assertEquals(orderId, result[0].id)
        }
    }

    @Test
    fun `getOrdersByUserId returns empty list when none found`() {
        runBlocking {
            val userId = seedUser()
            val result = service.getOrdersByUserId(userId)
            assertNotNull(result)
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getOrdersByUserId returns null when user not found`() {
        runBlocking {
            val result = service.getOrdersByUserId(UUID.randomUUID().toString())
            assertNull(result)
        }
    }

    @Test
    fun `getOrdersByStatus returns null for invalid status`() {
        runBlocking {
            val result = service.getOrdersByStatus("invalid-status")
            assertNull(result)
        }
    }

    @Test
    fun `getOrdersByStatus returns orders when found`() {
        runBlocking {
            val userId = seedUser()
            val orderId = ExposedTestDb.seedOrder(userId, status = "paid")

            val result = service.getOrdersByStatus("paid")
            assertNotNull(result)
            assertEquals(1, result.size)
            assertEquals(orderId, result[0].id)
        }
    }

    @Test
    fun `getOrdersByStatus returns empty list when none found`() {
        runBlocking {
            val result = service.getOrdersByStatus("open")
            assertNotNull(result)
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getOrdersByDateRange returns orders when found`() {
        runBlocking {
            val userId = seedUser()
            val orderId = ExposedTestDb.seedOrder(userId, createdAt = "2023-01-15T00:00:00")

            val result = service.getOrdersByDateRange("2023-01-01", "2023-01-31")
            assertEquals(1, result.size)
            assertEquals(orderId, result[0].id)
        }
    }

    @Test
    fun `getOrdersByDateRange returns empty list when none found`() {
        runBlocking {
            val result = service.getOrdersByDateRange("2023-02-01", "2023-02-28")
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `addOrder returns null if user does not exist`() {
        runBlocking {
            val newOrder = Order(null, UUID.randomUUID().toString(), null, "open", 0.0, "")
            val result = service.addOrder(newOrder)
            assertNull(result)
        }
    }

    @Test
    fun `addOrder returns null if table does not exist`() {
        runBlocking {
            val userId = seedUser()
            val newOrder = Order(null, userId, UUID.randomUUID().toString(), "open", 0.0, "")
            val result = service.addOrder(newOrder)
            assertNull(result)
        }
    }

    @Test
    fun `addOrder returns null if status is invalid`() {
        runBlocking {
            val userId = seedUser()
            val newOrder = Order(null, userId, null, "invalid-status", 0.0, "")
            val result = service.addOrder(newOrder)
            assertNull(result)
        }
    }

    @Test
    fun `addOrder returns new ID on success`() {
        runBlocking {
            val userId = seedUser()
            val newOrder = Order(null, userId, null, "open", 0.0, "")
            val result = service.addOrder(newOrder)
            assertNotNull(result)
        }
    }

    @Test
    fun `updateOrder returns false if ID is null`() {
        runBlocking {
            val userId = seedUser()
            val order =
                Order(
                    id = null,
                    userId = userId,
                    tableId = null,
                    status = "open",
                    total = 100.0,
                    createdAt = "date-1",
                )
            val result = service.updateOrder(order)
            assertFalse(result)
        }
    }

    @Test
    fun `updateOrder returns false if user does not exist`() {
        runBlocking {
            val userId = seedUser()
            val orderId = ExposedTestDb.seedOrder(userId)
            val order =
                Order(
                    id = orderId,
                    userId = UUID.randomUUID().toString(),
                    tableId = null,
                    status = "open",
                    total = 100.0,
                    createdAt = "date-1",
                )
            val result = service.updateOrder(order)
            assertFalse(result)
        }
    }

    @Test
    fun `updateOrder returns false if table does not exist`() {
        runBlocking {
            val userId = seedUser()
            val orderId = ExposedTestDb.seedOrder(userId)
            val order =
                Order(
                    id = orderId,
                    userId = userId,
                    tableId = UUID.randomUUID().toString(),
                    status = "open",
                    total = 100.0,
                    createdAt = "date-1",
                )
            val result = service.updateOrder(order)
            assertFalse(result)
        }
    }

    @Test
    fun `updateOrder returns false if status is invalid`() {
        runBlocking {
            val userId = seedUser()
            val orderId = ExposedTestDb.seedOrder(userId)
            val order =
                Order(
                    id = orderId,
                    userId = userId,
                    tableId = null,
                    status = "invalid-status",
                    total = 100.0,
                    createdAt = "date-1",
                )
            val result = service.updateOrder(order)
            assertFalse(result)
        }
    }

    @Test
    fun `updateOrder returns true on success`() {
        runBlocking {
            val userId = seedUser()
            val orderId = ExposedTestDb.seedOrder(userId, total = 100.0)
            val order =
                Order(
                    id = orderId,
                    userId = userId,
                    tableId = null,
                    status = "open",
                    total = 150.0,
                    createdAt = "date-1",
                )
            val result = service.updateOrder(order)
            assertTrue(result)

            val updated = service.getOrderById(orderId)
            assertEquals(150.0, updated?.total)
        }
    }

    @Test
    fun `updateOrder returns false when order does not exist`() {
        runBlocking {
            val userId = seedUser()
            val order =
                Order(
                    id = UUID.randomUUID().toString(),
                    userId = userId,
                    tableId = null,
                    status = "open",
                    total = 150.0,
                    createdAt = "date-1",
                )
            val result = service.updateOrder(order)
            assertFalse(result)
        }
    }

    @Test
    fun `deleteOrder returns true on success`() {
        runBlocking {
            val userId = seedUser()
            val orderId = ExposedTestDb.seedOrder(userId)
            val result = service.deleteOrder(orderId)
            assertTrue(result)
            assertNull(service.getOrderById(orderId))
        }
    }

    @Test
    fun `deleteOrder returns false when order not found`() {
        runBlocking {
            val result = service.deleteOrder(UUID.randomUUID().toString())
            assertFalse(result)
        }
    }

    private fun validStoreRequest(
        items: List<StoreCheckoutItem> = listOf(StoreCheckoutItem(productId = "prod-1", variantId = "var-1", quantity = 2, priceAtOrder = 500)),
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
        whenever(mockConnection.prepareStatement(contains("UPDATE product_variants"))).thenReturn(stockSt)
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
            val items = listOf(StoreCheckoutItem(productId = "prod-1", quantity = 0, priceAtOrder = 500)) // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest(items = items)) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `checkout returns null when any item has negative quantity`() {
        runBlocking {
            val items = listOf(StoreCheckoutItem(productId = "prod-1", quantity = -1, priceAtOrder = 500)) // Arrange
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
            whenever(mockConnection.prepareStatement(contains("UPDATE product_variants"))).thenReturn(stockSt) // Arrange
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
            whenever(mockConnection.prepareStatement(contains("UPDATE product_variants"))).thenReturn(stockSt) // Arrange
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
            whenever(mockConnection.prepareStatement(contains("UPDATE product_variants"))).thenReturn(stockSt) // Arrange
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
                    StoreCheckoutItem(productId = "prod-1", variantId = "var-1", quantity = 1, priceAtOrder = 100),
                    StoreCheckoutItem(productId = "prod-2", variantId = "var-2", quantity = 3, priceAtOrder = 200),
                )
            val stockSt: PreparedStatement = mock() // Arrange
            val orderSt: PreparedStatement = mock() // Arrange
            val itemSt: PreparedStatement = mock() // Arrange
            val ticketSt: PreparedStatement = mock() // Arrange
            val paymentSt: PreparedStatement = mock() // Arrange
            val ticketPaymentSt: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO order_products"))).thenReturn(itemSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE product_variants"))).thenReturn(stockSt) // Arrange
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
                    StoreCheckoutItem(productId = "prod-1", variantId = "var-1", quantity = 1, priceAtOrder = 100),
                    StoreCheckoutItem(productId = "prod-2", variantId = "var-2", quantity = 999, priceAtOrder = 200),
                )
            val stockSt: PreparedStatement = mock() // Arrange
            val orderSt: PreparedStatement = mock() // Arrange
            val itemSt: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO order_products"))).thenReturn(itemSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE product_variants"))).thenReturn(stockSt) // Arrange
            whenever(stockSt.executeUpdate()).thenReturn(1).thenReturn(0) // Arrange — second item fails
            val service = OrderService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest(items = items)) // Act
            assertNull(result) // Assert
            verify(mockConnection).rollback() // Assert
        }
    }

    @Test
    fun `checkout auto-resolves variantId when item variantId is null`() {
        runBlocking {
            val items = listOf(StoreCheckoutItem(productId = "prod-1", variantId = null, quantity = 1, priceAtOrder = 100)) // Arrange
            val variantQuerySt: PreparedStatement = mock() // Arrange
            val variantQueryRs: ResultSet = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT id FROM product_variants"))).thenReturn(variantQuerySt) // Arrange
            whenever(variantQuerySt.executeQuery()).thenReturn(variantQueryRs) // Arrange
            whenever(variantQueryRs.next()).thenReturn(true) // Arrange — variant found
            whenever(variantQueryRs.getString("id")).thenReturn("auto-var-1") // Arrange
            setupSuccessfulCheckout() // Arrange
            val service = OrderService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest(items = items)) // Act
            assertNotNull(result) // Assert
        }
    }

    @Test
    fun `checkout returns null when no variant exists for product`() {
        runBlocking {
            val items = listOf(StoreCheckoutItem(productId = "prod-1", variantId = null, quantity = 1, priceAtOrder = 100)) // Arrange
            val orderSt: PreparedStatement = mock() // Arrange
            val variantQuerySt: PreparedStatement = mock() // Arrange
            val variantQueryRs: ResultSet = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO orders"))).thenReturn(orderSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT id FROM product_variants"))).thenReturn(variantQuerySt) // Arrange
            whenever(variantQuerySt.executeQuery()).thenReturn(variantQueryRs) // Arrange
            whenever(variantQueryRs.next()).thenReturn(false) // Arrange — no variant found
            val service = OrderService(mockConnection) // Arrange
            val result = service.checkout(validStoreRequest(items = items)) // Act
            assertNull(result) // Assert
            verify(mockConnection).rollback() // Assert
        }
    }

    @Test
    fun `checkout inserts variant_id at position 3 in order_products`() {
        runBlocking {
            val items = listOf(StoreCheckoutItem(productId = "prod-1", variantId = "var-42", quantity = 1, priceAtOrder = 100)) // Arrange
            val itemSt: PreparedStatement = mock() // Arrange
            setupSuccessfulCheckout(itemSt = itemSt) // Arrange
            val service = OrderService(mockConnection) // Arrange
            service.checkout(validStoreRequest(items = items)) // Act
            verify(itemSt).setString(3, "var-42") // Assert — variant_id at position 3
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
