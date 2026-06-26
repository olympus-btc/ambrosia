package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.OrderDish
import pos.ambrosia.services.OrderDishService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class OrderDishServiceTest {
    private lateinit var dbFile: File
    private val service = OrderDishService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `getOrderDishesByOrderId returns list of dishes when found`() {
        runBlocking {
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)
            val dish1 = ExposedTestDb.seedDish("Pizza", 50.0)
            val dish2 = ExposedTestDb.seedDish("Pasta", 100.0)

            assertNotNull(
                service.addOrderDish(
                    OrderDish(
                        orderId = orderId,
                        dishId = dish1,
                        priceAtOrder = 50.0,
                        notes = "Extra spicy",
                        status = "PENDING",
                        shouldPrepare = true,
                    ),
                ),
            )
            assertNotNull(
                service.addOrderDish(
                    OrderDish(
                        orderId = orderId,
                        dishId = dish2,
                        priceAtOrder = 100.0,
                        notes = "No onion",
                        status = "PENDING",
                        shouldPrepare = true,
                    ),
                ),
            )

            val result = service.getOrderDishesByOrderId(orderId)
            assertEquals(2, result.size)
            assertTrue(result.any { it.dishId == dish1 })
            assertTrue(result.any { it.dishId == dish2 })
        }
    }

    @Test
    fun `getOrderDishesByOrderId returns empty list when none found`() {
        runBlocking {
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)
            val result = service.getOrderDishesByOrderId(orderId)
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getOrderDishById returns dish when found`() {
        runBlocking {
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)
            val dishId = ExposedTestDb.seedDish("Pizza", 50.0)

            val id =
                service.addOrderDish(
                    OrderDish(orderId = orderId, dishId = dishId, priceAtOrder = 50.0, status = "PENDING", shouldPrepare = true),
                )
            assertNotNull(id)

            val result = service.getOrderDishById(id)
            assertNotNull(result)
            assertEquals(orderId, result.orderId)
            assertEquals(dishId, result.dishId)
            assertEquals(50.0, result.priceAtOrder)
            assertEquals("PENDING", result.status)
            assertTrue(result.shouldPrepare)
        }
    }

    @Test
    fun `getOrderDishById returns null when none found`() {
        runBlocking {
            val result =
                service.getOrderDishById(
                    java.util.UUID
                        .randomUUID()
                        .toString(),
                )
            assertNull(result)
        }
    }

    @Test
    fun `addOrderDish returns null if order id not found`() {
        runBlocking {
            val dishId = ExposedTestDb.seedDish("Pizza", 50.0)
            val orderDish =
                OrderDish(
                    orderId =
                        java.util.UUID
                            .randomUUID()
                            .toString(),
                    dishId = dishId,
                    priceAtOrder = 50.0,
                    notes = "Extra spicy",
                    status = "PENDING",
                    shouldPrepare = true,
                )
            val result = service.addOrderDish(orderDish)
            assertNull(result)
        }
    }

    @Test
    fun `addOrderDish returns null if dish id not found`() {
        runBlocking {
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)
            val orderDish =
                OrderDish(
                    orderId = orderId,
                    dishId =
                        java.util.UUID
                            .randomUUID()
                            .toString(),
                    priceAtOrder = 50.0,
                    notes = "Extra spicy",
                    status = "PENDING",
                    shouldPrepare = true,
                )
            val result = service.addOrderDish(orderDish)
            assertNull(result)
        }
    }

    @Test
    fun `addOrderDish returns new ID on success`() {
        runBlocking {
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)
            val dishId = ExposedTestDb.seedDish("Pizza", 50.0)
            val orderDish =
                OrderDish(
                    orderId = orderId,
                    dishId = dishId,
                    priceAtOrder = 50.0,
                    notes = "Extra spicy",
                    status = "PENDING",
                    shouldPrepare = true,
                )
            val result = service.addOrderDish(orderDish)
            assertNotNull(result)
        }
    }

    @Test
    fun `updateOrderDish returns false if ID is null`() {
        runBlocking {
            val orderDish =
                OrderDish(
                    id = null,
                    orderId = "order123",
                    dishId = "dish1",
                    priceAtOrder = 50.0,
                    notes = "Extra spicy",
                    status = "PENDING",
                    shouldPrepare = true,
                )
            val result = service.updateOrderDish(orderDish)
            assertFalse(result)
        }
    }

    @Test
    fun `updateOrderDish returns true on success`() {
        runBlocking {
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)
            val dishId = ExposedTestDb.seedDish("Pizza", 50.0)
            val id =
                service.addOrderDish(
                    OrderDish(
                        orderId = orderId,
                        dishId = dishId,
                        priceAtOrder = 50.0,
                        notes = "Extra spicy",
                        status = "PENDING",
                        shouldPrepare = true,
                    ),
                )
            assertNotNull(id)

            val updated =
                OrderDish(
                    id = id,
                    orderId = orderId,
                    dishId = dishId,
                    priceAtOrder = 55.0,
                    notes = "No spicy",
                    status = "COOKING",
                    shouldPrepare = false,
                )
            val result = service.updateOrderDish(updated)
            assertTrue(result)

            val fetched = service.getOrderDishById(id)
            assertNotNull(fetched)
            assertEquals(55.0, fetched.priceAtOrder)
            assertEquals("COOKING", fetched.status)
            assertFalse(fetched.shouldPrepare)
        }
    }

    @Test
    fun `updateOrderDish returns false when order dish not found`() {
        runBlocking {
            val orderDish =
                OrderDish(
                    id =
                        java.util.UUID
                            .randomUUID()
                            .toString(),
                    orderId = "order123",
                    dishId = "dish1",
                    priceAtOrder = 50.0,
                    notes = "Extra spicy",
                    status = "PENDING",
                    shouldPrepare = true,
                )
            val result = service.updateOrderDish(orderDish)
            assertFalse(result)
        }
    }

    @Test
    fun `deleteOrderDish returns true on success`() {
        runBlocking {
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)
            val dishId = ExposedTestDb.seedDish("Pizza", 50.0)
            val id =
                service.addOrderDish(
                    OrderDish(orderId = orderId, dishId = dishId, priceAtOrder = 50.0, status = "PENDING", shouldPrepare = true),
                )
            assertNotNull(id)

            val result = service.deleteOrderDish(id)
            assertTrue(result)
            assertNull(service.getOrderDishById(id))
        }
    }

    @Test
    fun `deleteOrderDish returns false when order dish not found`() {
        runBlocking {
            val result =
                service.deleteOrderDish(
                    java.util.UUID
                        .randomUUID()
                        .toString(),
                )
            assertFalse(result)
        }
    }

    @Test
    fun `deleteOrderDishesByOrderId returns true on success`() {
        runBlocking {
            val userId = ExposedTestDb.seedUser("waiter")
            val orderId = ExposedTestDb.seedOrder(userId)
            val dish1 = ExposedTestDb.seedDish("Pizza", 50.0)
            val dish2 = ExposedTestDb.seedDish("Pasta", 100.0)
            service.addOrderDish(
                OrderDish(orderId = orderId, dishId = dish1, priceAtOrder = 50.0, status = "PENDING", shouldPrepare = true),
            )
            service.addOrderDish(
                OrderDish(orderId = orderId, dishId = dish2, priceAtOrder = 100.0, status = "PENDING", shouldPrepare = true),
            )

            val result = service.deleteOrderDishesByOrderId(orderId)
            assertTrue(result)
            assertTrue(service.getOrderDishesByOrderId(orderId).isEmpty())
        }
    }
}
