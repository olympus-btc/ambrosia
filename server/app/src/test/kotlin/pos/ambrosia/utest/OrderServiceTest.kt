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
}
