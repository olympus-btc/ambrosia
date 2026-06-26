package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.CategoryItem
import pos.ambrosia.services.CategoryService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class CategoryServiceTest {
    private lateinit var dbFile: File
    private val service = CategoryService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `addCategory returns null for invalid type`() {
        runBlocking {
            val result = service.addCategory("invalid-type", CategoryItem(name = "Bebidas"))
            assertNull(result)
        }
    }

    @Test
    fun `addCategory returns null for blank name`() {
        runBlocking {
            val result = service.addCategory("dish", CategoryItem(name = "  "))
            assertNull(result)
        }
    }

    @Test
    fun `addCategory returns null if name already exists for type`() {
        runBlocking {
            ExposedTestDb.seedCategory("Bebidas", "dish")
            val result = service.addCategory("dish", CategoryItem(name = "Bebidas"))
            assertNull(result)
        }
    }

    @Test
    fun `addCategory allows same name for different types`() {
        runBlocking {
            ExposedTestDb.seedCategory("Bebidas", "dish")
            val result = service.addCategory("product", CategoryItem(name = "Bebidas"))
            assertNotNull(result)
        }
    }

    @Test
    fun `addCategory returns new ID on success`() {
        runBlocking {
            val result = service.addCategory("product", CategoryItem(name = "Lacteos"))
            assertNotNull(result)
        }
    }

    @Test
    fun `getCategories returns null for invalid type`() {
        runBlocking {
            val result = service.getCategories("invalid-type")
            assertNull(result)
        }
    }

    @Test
    fun `getCategories returns empty list when none found`() {
        runBlocking {
            val result = service.getCategories("dish")
            assertNotNull(result)
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getCategories returns list for matching type only`() {
        runBlocking {
            ExposedTestDb.seedCategory("Bebidas", "product")
            ExposedTestDb.seedCategory("Postres", "product")
            ExposedTestDb.seedCategory("Carnes", "dish")

            val result = service.getCategories("product")
            assertNotNull(result)
            assertEquals(2, result.size)
            assertTrue(result.any { it.name == "Bebidas" })
            assertTrue(result.any { it.name == "Postres" })
        }
    }

    @Test
    fun `getCategoryById returns null for invalid type`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Bebidas", "product")
            val result = service.getCategoryById(categoryId, "invalid-type")
            assertNull(result)
        }
    }

    @Test
    fun `getCategoryById returns null when not found`() {
        runBlocking {
            val result = service.getCategoryById(UUID.randomUUID().toString(), "product")
            assertNull(result)
        }
    }

    @Test
    fun `getCategoryById returns null when type does not match`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Bebidas", "product")
            val result = service.getCategoryById(categoryId, "dish")
            assertNull(result)
        }
    }

    @Test
    fun `getCategoryById returns category when found`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Bebidas", "product")
            val result = service.getCategoryById(categoryId, "product")
            assertNotNull(result)
            assertEquals(categoryId, result.id)
            assertEquals("Bebidas", result.name)
        }
    }

    @Test
    fun `updateCategory returns false for invalid type`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Bebidas", "product")
            val result = service.updateCategory("invalid-type", CategoryItem(id = categoryId, name = "Refrescos"))
            assertFalse(result)
        }
    }

    @Test
    fun `updateCategory returns false when id is null`() {
        runBlocking {
            val result = service.updateCategory("product", CategoryItem(id = null, name = "Refrescos"))
            assertFalse(result)
        }
    }

    @Test
    fun `updateCategory returns false for blank name`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Bebidas", "product")
            val result = service.updateCategory("product", CategoryItem(id = categoryId, name = "  "))
            assertFalse(result)
        }
    }

    @Test
    fun `updateCategory returns false when name already exists for type`() {
        runBlocking {
            ExposedTestDb.seedCategory("Postres", "product")
            val categoryId = ExposedTestDb.seedCategory("Bebidas", "product")
            val result = service.updateCategory("product", CategoryItem(id = categoryId, name = "Postres"))
            assertFalse(result)
        }
    }

    @Test
    fun `updateCategory returns false when not found`() {
        runBlocking {
            val result = service.updateCategory("product", CategoryItem(id = UUID.randomUUID().toString(), name = "Refrescos"))
            assertFalse(result)
        }
    }

    @Test
    fun `updateCategory returns false when type does not match`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Bebidas", "product")
            val result = service.updateCategory("dish", CategoryItem(id = categoryId, name = "Refrescos"))
            assertFalse(result)
        }
    }

    @Test
    fun `updateCategory returns true on success`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Bebidas", "product")
            val result = service.updateCategory("product", CategoryItem(id = categoryId, name = "Refrescos"))
            assertTrue(result)

            val updated = service.getCategoryById(categoryId, "product")
            assertEquals("Refrescos", updated?.name)
        }
    }

    @Test
    fun `deleteCategory returns false for invalid type`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Bebidas", "product")
            val result = service.deleteCategory(categoryId, "invalid-type")
            assertFalse(result)
        }
    }

    @Test
    fun `deleteCategory returns false when not found`() {
        runBlocking {
            val result = service.deleteCategory(UUID.randomUUID().toString(), "product")
            assertFalse(result)
        }
    }

    @Test
    fun `deleteCategory returns false when type does not match`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Bebidas", "product")
            val result = service.deleteCategory(categoryId, "dish")
            assertFalse(result)
        }
    }

    @Test
    fun `deleteCategory soft deletes category and clears product_categories`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory("Bebidas", "product")
            val productId = ExposedTestDb.seedProduct("Cola")
            ExposedTestDb.seedProductCategory(productId, categoryId)

            val result = service.deleteCategory(categoryId, "product")
            assertTrue(result)
            assertNull(service.getCategoryById(categoryId, "product"))
        }
    }
}
