package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.db.tables.IngredientEntity
import pos.ambrosia.models.Ingredient
import pos.ambrosia.services.IngredientService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class IngredientServiceTest {
    private lateinit var dbFile: File
    private val service = IngredientService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `getIngredients returns list of ingredients when found`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            ExposedTestDb.seedIngredient("Tomatoes", categoryId)
            ExposedTestDb.seedIngredient("Cheese", categoryId)

            val result = service.getIngredients()
            assertEquals(2, result.size)
            assertTrue(result.any { it.name == "Tomatoes" })
            assertTrue(result.any { it.name == "Cheese" })
        }
    }

    @Test
    fun `getIngredients returns empty list when none found`() {
        runBlocking {
            val result = service.getIngredients()
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getIngredientById returns ingredient when found`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientId = ExposedTestDb.seedIngredient("Tomatoes", categoryId)

            val result = service.getIngredientById(ingredientId)
            assertNotNull(result)
            assertEquals("Tomatoes", result.name)
            assertEquals(categoryId, result.categoryId)
        }
    }

    @Test
    fun `getIngredientById returns null when not found`() {
        runBlocking {
            val result = service.getIngredientById(UUID.randomUUID().toString())
            assertNull(result)
        }
    }

    @Test
    fun `getIngredientsByCategory returns ingredients when found`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val otherCategoryId = ExposedTestDb.seedCategory("Dairy", "ingredient")
            ExposedTestDb.seedIngredient("Tomatoes", categoryId)
            ExposedTestDb.seedIngredient("Cheese", otherCategoryId)

            val result = service.getIngredientsByCategory(categoryId)
            assertEquals(1, result.size)
            assertEquals("Tomatoes", result[0].name)
        }
    }

    @Test
    fun `getIngredientsByCategory returns empty list when none found`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Dairy", "ingredient")
            val result = service.getIngredientsByCategory(categoryId)
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `addIngredient returns null if category does not exist`() {
        runBlocking {
            val newIngredient = Ingredient(null, "Tomatoes", UUID.randomUUID().toString(), 10.0, "kg", 1.0, 1.0)
            val result = service.addIngredient(newIngredient)
            assertNull(result)
        }
    }

    @Test
    fun `addIngredient returns null if category is not of type ingredient`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Bebidas", "product")
            val newIngredient = Ingredient(null, "Tomatoes", categoryId, 10.0, "kg", 1.0, 1.0)
            val result = service.addIngredient(newIngredient)
            assertNull(result)
        }
    }

    @Test
    fun `addIngredient returns null if name is blank`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientWithBlankName = Ingredient(null, "  ", categoryId, 10.0, "kg", 1.0, 1.0)
            val result = service.addIngredient(ingredientWithBlankName)
            assertNull(result)
        }
    }

    @Test
    fun `addIngredient returns null if quantity is invalid`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientWithInvalidQuantity = Ingredient(null, "Tomatoes", categoryId, -5.0, "kg", 1.0, 1.0)
            val result = service.addIngredient(ingredientWithInvalidQuantity)
            assertNull(result)
        }
    }

    @Test
    fun `addIngredient returns null if low stock threshold is invalid`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientWithInvalidThreshold = Ingredient(null, "Tomatoes", categoryId, 10.0, "kg", -1.0, 1.0)
            val result = service.addIngredient(ingredientWithInvalidThreshold)
            assertNull(result)
        }
    }

    @Test
    fun `addIngredient returns null if cost per unit is invalid`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientWithInvalidCost = Ingredient(null, "Tomatoes", categoryId, 10.0, "kg", 1.0, -1.0)
            val result = service.addIngredient(ingredientWithInvalidCost)
            assertNull(result)
        }
    }

    @Test
    fun `addIngredient returns new ID on success`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val newIngredient = Ingredient(null, "New Ingredient", categoryId, 15.0, "kg", 1.0, 1.0)
            val result = service.addIngredient(newIngredient)
            assertNotNull(result)
            assertTrue(result.isNotBlank())
        }
    }

    @Test
    fun `updateIngredient returns false if ID is null`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientWithNullId = Ingredient(null, "A Name", categoryId, 10.0, "kg", 1.0, 1.0)
            val result = service.updateIngredient(ingredientWithNullId)
            assertFalse(result)
        }
    }

    @Test
    fun `updateIngredient returns false if category does not exist`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientId = ExposedTestDb.seedIngredient("Tomatoes", categoryId)
            val ingredientToUpdate = Ingredient(ingredientId, "A Name", UUID.randomUUID().toString(), 10.0, "kg", 1.0, 1.0)
            val result = service.updateIngredient(ingredientToUpdate)
            assertFalse(result)
        }
    }

    @Test
    fun `updateIngredient returns false if name is blank`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientId = ExposedTestDb.seedIngredient("Tomatoes", categoryId)
            val ingredientWithBlankName = Ingredient(ingredientId, "  ", categoryId, 10.0, "kg", 1.0, 1.0)
            val result = service.updateIngredient(ingredientWithBlankName)
            assertFalse(result)
        }
    }

    @Test
    fun `updateIngredient returns false if quantity is invalid`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientId = ExposedTestDb.seedIngredient("Tomatoes", categoryId)
            val ingredientWithInvalidQuantity = Ingredient(ingredientId, "Tomatoes", categoryId, -5.0, "kg", 1.0, 1.0)
            val result = service.updateIngredient(ingredientWithInvalidQuantity)
            assertFalse(result)
        }
    }

    @Test
    fun `updateIngredient returns false if low stock threshold is invalid`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientId = ExposedTestDb.seedIngredient("Tomatoes", categoryId)
            val ingredientWithInvalidThreshold = Ingredient(ingredientId, "Tomatoes", categoryId, 10.0, "kg", -1.0, 1.0)
            val result = service.updateIngredient(ingredientWithInvalidThreshold)
            assertFalse(result)
        }
    }

    @Test
    fun `updateIngredient returns false if cost per unit is invalid`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientId = ExposedTestDb.seedIngredient("Tomatoes", categoryId)
            val ingredientWithInvalidCost = Ingredient(ingredientId, "Tomatoes", categoryId, 10.0, "kg", 1.0, -1.0)
            val result = service.updateIngredient(ingredientWithInvalidCost)
            assertFalse(result)
        }
    }

    @Test
    fun `updateIngredient returns false when not found`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientToUpdate = Ingredient(UUID.randomUUID().toString(), "Tomatoes", categoryId, 10.0, "kg", 1.0, 1.0)
            val result = service.updateIngredient(ingredientToUpdate)
            assertFalse(result)
        }
    }

    @Test
    fun `updateIngredient returns true on success`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientId = ExposedTestDb.seedIngredient("Tomatoes", categoryId)
            val ingredientToUpdate = Ingredient(ingredientId, "Updated Ingredient", categoryId, 25.0, "g", 5.0, 0.5)

            val result = service.updateIngredient(ingredientToUpdate)
            assertTrue(result)

            val updated = service.getIngredientById(ingredientId)
            assertEquals("Updated Ingredient", updated?.name)
            assertEquals(25.0, updated?.quantity)
        }
    }

    @Test
    fun `deleteIngredient returns false if ingredient is in use`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientId = ExposedTestDb.seedIngredient("Tomatoes", categoryId)
            val dishId = ExposedTestDb.seedDish("Salad", 10.0, ExposedTestDb.seedCategory("Salads", "dish"))
            ExposedTestDb.seedDishIngredient(dishId, ingredientId)

            val result = service.deleteIngredient(ingredientId)
            assertFalse(result)
            assertNotNull(service.getIngredientById(ingredientId))
        }
    }

    @Test
    fun `deleteIngredient returns true on success`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientId = ExposedTestDb.seedIngredient("Tomatoes", categoryId)

            val result = service.deleteIngredient(ingredientId)
            assertTrue(result)
            assertNull(service.getIngredientById(ingredientId))
        }
    }

    @Test
    fun `deleteIngredient returns false if ingredient id does not exist`() {
        runBlocking {
            val result = service.deleteIngredient(UUID.randomUUID().toString())
            assertFalse(result)
        }
    }

    @Test
    fun `getLowStockIngredients returns list when found`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Dry goods", "ingredient")
            val lowStockId = ExposedTestDb.seedIngredient("Flour", categoryId)
            transaction {
                val entity = IngredientEntity.findById(UUID.fromString(lowStockId))!!
                entity.quantity = 1.5
                entity.lowStockThreshold = 2.0
            }
            val okStockId = ExposedTestDb.seedIngredient("Sugar", categoryId)
            transaction {
                val entity = IngredientEntity.findById(UUID.fromString(okStockId))!!
                entity.quantity = 10.0
                entity.lowStockThreshold = 2.0
            }

            val result = service.getLowStockIngredients()
            assertEquals(1, result.size)
            assertEquals("Flour", result[0].name)
        }
    }

    @Test
    fun `getLowStockIngredients returns empty list when none found`() {
        runBlocking {
            val result = service.getLowStockIngredients()
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `updateIngredientQuantity returns false if quantity is negative`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientId = ExposedTestDb.seedIngredient("Tomatoes", categoryId)
            val result = service.updateIngredientQuantity(ingredientId, -1.0)
            assertFalse(result)
        }
    }

    @Test
    fun `updateIngredientQuantity returns true on success`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Vegetables", "ingredient")
            val ingredientId = ExposedTestDb.seedIngredient("Tomatoes", categoryId)
            val result = service.updateIngredientQuantity(ingredientId, 50.0)
            assertTrue(result)

            val updated = service.getIngredientById(ingredientId)
            assertEquals(50.0, updated?.quantity)
        }
    }

    @Test
    fun `updateIngredientQuantity returns false when ingredient not found`() {
        runBlocking {
            val result = service.updateIngredientQuantity(UUID.randomUUID().toString(), 50.0)
            assertFalse(result)
        }
    }
}
