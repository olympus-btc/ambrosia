package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.v1.exceptions.ExposedSQLException
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.Product
import pos.ambrosia.services.ProductService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ProductServiceTest {
    private lateinit var dbFile: File
    private val service = ProductService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    private fun newProduct(
        id: String? = null,
        sku: String? = "SKU-1",
        name: String = "Prod1",
        categoryIds: List<String> = emptyList(),
        minStockThreshold: Int = 1,
        maxStockThreshold: Int = 10,
    ): Product =
        Product(
            id = id,
            SKU = sku,
            name = name,
            description = null,
            imageUrl = null,
            categoryIds = categoryIds,
            minStockThreshold = minStockThreshold,
            maxStockThreshold = maxStockThreshold,
        )

    @Test
    fun `getProducts returns list when found`() {
        runBlocking {
            ExposedTestDb.seedProduct(name = "Prod1", sku = "SKU-1", priceCents = 199)
            ExposedTestDb.seedProduct(name = "Prod2", sku = "SKU-2", priceCents = 499)

            val result = service.getProducts()
            assertEquals(2, result.size)
            assertTrue(result.any { it.SKU == "SKU-1" })
            assertTrue(result.any { it.priceCents == 499 })
        }
    }

    @Test
    fun `getProducts returns empty list when none found`() {
        runBlocking {
            val result = service.getProducts()
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getProducts excludes soft deleted products`() {
        runBlocking {
            ExposedTestDb.seedProduct(name = "Active")
            ExposedTestDb.seedProduct(name = "Deleted", isDeleted = true)

            val result = service.getProducts()
            assertEquals(1, result.size)
            assertEquals("Active", result[0].name)
        }
    }

    @Test
    fun `getProductById returns product when found`() {
        runBlocking {
            val id = ExposedTestDb.seedProduct(name = "Prod1", sku = "SKU-1")

            val result = service.getProductById(id)
            assertNotNull(result)
            assertEquals("SKU-1", result.SKU)
        }
    }

    @Test
    fun `getProductById returns null when not found`() {
        runBlocking {
            val result =
                service.getProductById(
                    java.util.UUID
                        .randomUUID()
                        .toString(),
                )
            assertNull(result)
        }
    }

    @Test
    fun `getProductBySKU returns product when found`() {
        runBlocking {
            val id = ExposedTestDb.seedProduct(name = "Prod1", sku = "SKU-1")

            val result = service.getProductBySKU("SKU-1")
            assertNotNull(result)
            assertEquals(id, result.id)
        }
    }

    @Test
    fun `getProductBySKU returns null when not found`() {
        runBlocking {
            val result = service.getProductBySKU("NOPE")
            assertNull(result)
        }
    }

    @Test
    fun `getProductsByCategory returns list when found`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory(type = "product")
            val productId = ExposedTestDb.seedProduct(name = "Prod1", sku = "SKU-1")
            ExposedTestDb.seedProductCategory(productId, categoryId)
            ExposedTestDb.seedProduct(name = "Prod2", sku = "SKU-2")

            val result = service.getProductsByCategory(categoryId)
            assertEquals(1, result.size)
            assertEquals("SKU-1", result[0].SKU)
        }
    }

    @Test
    fun `getProductsByCategory returns empty list when none found`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory(type = "product")
            val result = service.getProductsByCategory(categoryId)
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `addProduct returns null if invalid data`() {
        runBlocking {
            val invalid = newProduct(sku = " ", name = " ", minStockThreshold = -1, maxStockThreshold = -1)
            val result = service.addProduct(invalid)
            assertNull(result)
        }
    }

    @Test
    fun `addProduct throws if SKU already exists`() {
        runBlocking {
            ExposedTestDb.seedProduct(name = "Existing", sku = "SKU-1")
            val newProductData = newProduct(sku = "SKU-1", name = "Prod1")
            assertFailsWith<ExposedSQLException> { service.addProduct(newProductData) }
        }
    }

    @Test
    fun `addProduct returns new ID on success`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory(type = "product")
            val newProductData = newProduct(sku = "SKU-NEW", name = "New Product", categoryIds = listOf(categoryId))
            val result = service.addProduct(newProductData)
            assertNotNull(result)
            assertTrue(result.isNotBlank())

            val created = service.getProductById(result)
            assertEquals(listOf(categoryId), created?.categoryIds)
        }
    }

    @Test
    fun `addProduct succeeds with null SKU`() {
        runBlocking {
            val newProductData = newProduct(sku = null, name = "No SKU Product")
            val result = service.addProduct(newProductData)
            assertNotNull(result)
        }
    }

    @Test
    fun `addProduct succeeds with blank SKU`() {
        runBlocking {
            val newProductData = newProduct(sku = "   ", name = "Blank SKU Product")
            val result = service.addProduct(newProductData)
            assertNotNull(result)
        }
    }

    @Test
    fun `addProduct returns new ID when categoryIds is empty`() {
        runBlocking {
            val newProductData = newProduct(sku = "SKU-NO-CAT", name = "New Product", categoryIds = emptyList())
            val result = service.addProduct(newProductData)
            assertNotNull(result)
            assertTrue(result.isNotBlank())
        }
    }

    @Test
    fun `updateProduct returns false if ID is null`() {
        runBlocking {
            val productWithNullId = newProduct(id = null, sku = "SKU-1", name = "Name")
            val result = service.updateProduct(productWithNullId)
            assertFalse(result)
        }
    }

    @Test
    fun `updateProduct returns false if invalid data`() {
        runBlocking {
            val invalid = newProduct(id = "p-1", name = " ", minStockThreshold = -1, maxStockThreshold = -1)
            val result = service.updateProduct(invalid)
            assertFalse(result)
        }
    }

    @Test
    fun `updateProduct throws if SKU belongs to another product`() {
        runBlocking {
            ExposedTestDb.seedProduct(name = "Other", sku = "SKU-TAKEN")
            val id = ExposedTestDb.seedProduct(name = "Mine", sku = "SKU-MINE")

            val toUpdate = newProduct(id = id, sku = "SKU-TAKEN", name = "New Name")
            assertFailsWith<ExposedSQLException> { service.updateProduct(toUpdate) }

            val unchanged = service.getProductById(id)
            assertEquals("SKU-MINE", unchanged?.SKU)
        }
    }

    @Test
    fun `updateProduct returns true on success`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory(type = "product")
            val id = ExposedTestDb.seedProduct(name = "Old Name", sku = "SKU-OLD")

            val toUpdate = newProduct(id = id, sku = "SKU-OK", name = "Updated", categoryIds = listOf(categoryId))
            val result = service.updateProduct(toUpdate)
            assertTrue(result)

            val updated = service.getProductById(id)
            assertEquals("Updated", updated?.name)
            assertEquals("SKU-OK", updated?.SKU)
            assertEquals(listOf(categoryId), updated?.categoryIds)
        }
    }

    @Test
    fun `updateProduct succeeds with null SKU`() {
        runBlocking {
            val id = ExposedTestDb.seedProduct(name = "Old Name", sku = "SKU-OLD")

            val toUpdate = newProduct(id = id, sku = null, name = "Updated No SKU", categoryIds = emptyList())
            val result = service.updateProduct(toUpdate)
            assertTrue(result)

            val updated = service.getProductById(id)
            assertNull(updated?.SKU)
        }
    }

    @Test
    fun `updateProduct returns true when categoryIds is empty`() {
        runBlocking {
            val categoryId = ExposedTestDb.seedCategory(type = "product")
            val id = ExposedTestDb.seedProduct(name = "Old Name", sku = "SKU-1")
            ExposedTestDb.seedProductCategory(id, categoryId)

            val toUpdate = newProduct(id = id, sku = "SKU-1", name = "Updated Name", categoryIds = emptyList())
            val result = service.updateProduct(toUpdate)
            assertTrue(result)

            val updated = service.getProductById(id)
            assertTrue(updated?.categoryIds?.isEmpty() == true)
        }
    }

    @Test
    fun `updateProduct returns false when not found`() {
        runBlocking {
            val toUpdate =
                newProduct(
                    id =
                        java.util.UUID
                            .randomUUID()
                            .toString(),
                    sku = "SKU-OK",
                    name = "Updated",
                )
            val result = service.updateProduct(toUpdate)
            assertFalse(result)
        }
    }

    @Test
    fun `deleteProduct returns true on success`() {
        runBlocking {
            val id = ExposedTestDb.seedProduct(name = "Prod1", sku = "SKU-1")

            val result = service.deleteProduct(id)
            assertTrue(result)
            assertNull(service.getProductById(id))
        }
    }

    @Test
    fun `deleteProduct returns false when not found`() {
        runBlocking {
            val result =
                service.deleteProduct(
                    java.util.UUID
                        .randomUUID()
                        .toString(),
                )
            assertFalse(result)
        }
    }
}
