package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.Dish
import pos.ambrosia.services.DishService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DishServiceTest {
    private lateinit var dbFile: File
    private val service = DishService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `getDishes returns list of dishes when found`() =
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Mains", "dish")
            ExposedTestDb.seedDish("Pizza", 12.99, categoryId)
            ExposedTestDb.seedDish("Pasta", 10.50, categoryId)

            val result = service.getDishes()

            assertEquals(2, result.size)
            assertEquals(setOf("Pizza", "Pasta"), result.map { it.name }.toSet())
        }

    @Test
    fun `getDishes returns empty list when none found`() =
        runBlocking {
            assertTrue(service.getDishes().isEmpty())
        }

    @Test
    fun `getDishById returns dish when found`() =
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Mains", "dish")
            val id = ExposedTestDb.seedDish("Pizza", 12.99, categoryId)

            val result = service.getDishById(id)

            assertNotNull(result)
            assertEquals(Dish(id = id, name = "Pizza", price = 12.99, categoryId = categoryId), result)
        }

    @Test
    fun `getDishById returns null when not found`() =
        runBlocking {
            assertNull(service.getDishById(UUID.randomUUID().toString()))
        }

    @Test
    fun `getDishesByCategory returns dishes when found`() =
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Mains", "dish")
            ExposedTestDb.seedDish("Pizza", 12.99, categoryId)

            val result = service.getDishesByCategory(categoryId)

            assertEquals(1, result.size)
            assertEquals("Pizza", result[0].name)
        }

    @Test
    fun `getDishesByCategory returns empty list when none found`() =
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Mains", "dish")

            assertTrue(service.getDishesByCategory(categoryId).isEmpty())
        }

    @Test
    fun `addDish returns null if category does not exist`() =
        runBlocking {
            val newDish = Dish(id = null, name = "New Dish", price = 10.0, categoryId = UUID.randomUUID().toString())

            assertNull(service.addDish(newDish))
        }

    @Test
    fun `addDish returns null if name is blank`() =
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Mains", "dish")
            val dish = Dish(id = null, name = "  ", price = 10.0, categoryId = categoryId)

            assertNull(service.addDish(dish))
        }

    @Test
    fun `addDish returns null if price is invalid`() =
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Mains", "dish")
            val dish = Dish(id = null, name = "Fries", price = 0.0, categoryId = categoryId)

            assertNull(service.addDish(dish))
        }

    @Test
    fun `addDish returns new ID on success`() =
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Mains", "dish")
            val newDish = Dish(id = null, name = "New Dish", price = 15.0, categoryId = categoryId)

            val result = service.addDish(newDish)

            assertNotNull(result)
            assertTrue(result.isNotBlank())
            assertEquals("New Dish", service.getDishById(result)?.name)
        }

    @Test
    fun `updateDish returns false if ID is null`() =
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Mains", "dish")
            val dishWithNullId = Dish(id = null, name = "A Name", price = 10.0, categoryId = categoryId)

            assertFalse(service.updateDish(dishWithNullId))
        }

    @Test
    fun `updateDish returns false if category does not exist`() =
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Mains", "dish")
            val id = ExposedTestDb.seedDish("Pizza", 12.99, categoryId)
            val dishToUpdate = Dish(id = id, name = "A Name", price = 10.0, categoryId = UUID.randomUUID().toString())

            assertFalse(service.updateDish(dishToUpdate))
        }

    @Test
    fun `updateDish returns false if name is blank`() =
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Mains", "dish")
            val id = ExposedTestDb.seedDish("Pizza", 12.99, categoryId)
            val dishWithBlankName = Dish(id = id, name = "  ", price = 10.0, categoryId = categoryId)

            assertFalse(service.updateDish(dishWithBlankName))
        }

    @Test
    fun `updateDish returns false if price is invalid`() =
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Mains", "dish")
            val id = ExposedTestDb.seedDish("Pizza", 12.99, categoryId)
            val dishWithInvalidPrice = Dish(id = id, name = "Fries", price = -5.0, categoryId = categoryId)

            assertFalse(service.updateDish(dishWithInvalidPrice))
        }

    @Test
    fun `updateDish returns true on success`() =
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Mains", "dish")
            val id = ExposedTestDb.seedDish("Pizza", 12.99, categoryId)
            val dishToUpdate = Dish(id = id, name = "Updated Dish", price = 20.0, categoryId = categoryId)

            val result = service.updateDish(dishToUpdate)

            assertTrue(result)
            assertEquals(dishToUpdate, service.getDishById(id))
        }

    @Test
    fun `updateDish returns false when dish not found`() =
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Mains", "dish")
            val dishToUpdate = Dish(id = UUID.randomUUID().toString(), name = "Updated Dish", price = 20.0, categoryId = categoryId)

            assertFalse(service.updateDish(dishToUpdate))
        }

    @Test
    fun `deleteDish returns false if dish is in use`() =
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Mains", "dish")
            val dishId = ExposedTestDb.seedDish("Pizza", 12.99, categoryId)
            val userId = ExposedTestDb.seedUser("User")
            val orderId = ExposedTestDb.seedOrder(userId)
            ExposedTestDb.seedOrderDish(orderId, dishId)

            assertFalse(service.deleteDish(dishId))
        }

    @Test
    fun `deleteDish returns true on success`() =
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Mains", "dish")
            val dishId = ExposedTestDb.seedDish("Pizza", 12.99, categoryId)

            val result = service.deleteDish(dishId)

            assertTrue(result)
            assertNull(service.getDishById(dishId))
        }

    @Test
    fun `deleteDish returns false if dish id does not exist`() =
        runBlocking {
            assertFalse(service.deleteDish(UUID.randomUUID().toString()))
        }
}
