package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.v1.exceptions.ExposedSQLException
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.BundleComponent
import pos.ambrosia.models.Product
import pos.ambrosia.models.ProductStockAdjustment
import pos.ambrosia.services.ProductService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.ProductIsBundleComponentException
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
        costCents: Int = 100,
        categoryIds: List<String> = emptyList(),
        quantity: Int = 5,
        minStockThreshold: Int = 1,
        maxStockThreshold: Int = 10,
        priceCents: Int = 199,
    ): Product =
        Product(
            id = id,
            SKU = sku,
            name = name,
            description = null,
            imageUrl = null,
            costCents = costCents,
            categoryIds = categoryIds,
            quantity = quantity,
            minStockThreshold = minStockThreshold,
            maxStockThreshold = maxStockThreshold,
            priceCents = priceCents,
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
            val invalid =
                newProduct(sku = " ", costCents = -1, quantity = -5, minStockThreshold = -1, maxStockThreshold = -1, priceCents = -10)
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
    fun `addProduct succeeds with null SKU and description`() {
        runBlocking {
            val newProductData = newProduct(sku = null, name = "No SKU Product")
            val result = service.addProduct(newProductData)
            assertNotNull(result)
        }
    }

    @Test
    fun `addProduct succeeds with blank SKU and does not check uniqueness`() {
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
            val productWithNullId =
                newProduct(
                    id = null,
                    sku = "SKU-1",
                    name = "Name",
                    categoryIds = listOf("cat-1"),
                    quantity = 1,
                    minStockThreshold = 0,
                    maxStockThreshold = 0,
                    priceCents = 100,
                )
            val result = service.updateProduct(productWithNullId)
            assertFalse(result)
        }
    }

    @Test
    fun `updateProduct returns false if invalid data`() {
        runBlocking {
            val invalid =
                newProduct(
                    id = "p-1",
                    sku = "",
                    name = "Valid Name",
                    costCents = -1,
                    categoryIds = emptyList(),
                    quantity = -1,
                    minStockThreshold = -1,
                    maxStockThreshold = -1,
                    priceCents = -1,
                )
            val result = service.updateProduct(invalid)
            assertFalse(result)
        }
    }

    @Test
    fun `updateProduct throws if SKU belongs to another product`() {
        runBlocking {
            ExposedTestDb.seedProduct(name = "Other", sku = "SKU-TAKEN")
            val id = ExposedTestDb.seedProduct(name = "Mine", sku = "SKU-MINE")

            val toUpdate =
                newProduct(
                    id = id,
                    sku = "SKU-TAKEN",
                    name = "New Name",
                    categoryIds = listOf("cat-1"),
                    quantity = 5,
                    minStockThreshold = 1,
                    maxStockThreshold = 10,
                    priceCents = 250,
                )
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

            val toUpdate =
                newProduct(
                    id = id,
                    sku = "SKU-OK",
                    name = "Updated",
                    categoryIds = listOf(categoryId),
                    quantity = 5,
                    minStockThreshold = 1,
                    maxStockThreshold = 10,
                    priceCents = 250,
                )
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

            val toUpdate =
                newProduct(
                    id = id,
                    sku = null,
                    name = "Updated No SKU",
                    categoryIds = emptyList(),
                    quantity = 5,
                    minStockThreshold = 1,
                    maxStockThreshold = 10,
                    priceCents = 250,
                )
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

            val toUpdate =
                newProduct(
                    id = id,
                    sku = "SKU-1",
                    name = "Updated Name",
                    categoryIds = emptyList(),
                    quantity = 5,
                    minStockThreshold = 1,
                    maxStockThreshold = 10,
                    priceCents = 250,
                )
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
                    categoryIds = listOf("cat-1"),
                    quantity = 5,
                    minStockThreshold = 1,
                    maxStockThreshold = 10,
                    priceCents = 250,
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

    @Test
    fun `deleteProduct throws ProductIsBundleComponentException when product is a bundle component`() {
        runBlocking {
            val componentId = ExposedTestDb.seedProduct(name = "Component")
            val bundleId = ExposedTestDb.seedProduct(name = "My Bundle", isBundle = true)
            ExposedTestDb.seedBundleComponent(bundleId, componentId)

            val exception =
                assertFailsWith<ProductIsBundleComponentException> {
                    service.deleteProduct(componentId)
                }
            assertTrue(exception.bundleNames.contains("My Bundle"))
        }
    }

    @Test
    fun `addProduct returns null when bundle has no components`() {
        runBlocking {
            val bundle =
                Product(
                    name = "Empty Bundle",
                    costCents = 0,
                    quantity = 0,
                    minStockThreshold = 0,
                    maxStockThreshold = 0,
                    priceCents = 500,
                    isBundle = true,
                    bundleComponents = emptyList(),
                )
            val result = service.addProduct(bundle)
            assertNull(result)
        }
    }

    @Test
    fun `addProduct creates bundle and persists components`() {
        runBlocking {
            val componentId = ExposedTestDb.seedProduct(name = "Part A", costCents = 100, quantity = 10)
            val bundle =
                Product(
                    name = "Kit",
                    costCents = 0,
                    quantity = 0,
                    minStockThreshold = 0,
                    maxStockThreshold = 0,
                    priceCents = 500,
                    isBundle = true,
                    bundleComponents = listOf(BundleComponent(componentId, quantity = 2)),
                )
            val bundleId = service.addProduct(bundle)
            assertNotNull(bundleId)

            val created = service.getProductById(bundleId)
            assertNotNull(created)
            assertTrue(created.isBundle)
            assertEquals(1, created.bundleComponents.size)
            assertEquals(componentId, created.bundleComponents[0].componentId)
            assertEquals(2, created.bundleComponents[0].quantity)
        }
    }

    @Test
    fun `getProductById returns quantity as min floor of component stocks for bundle`() {
        runBlocking {
            val componentA = ExposedTestDb.seedProduct(name = "A", quantity = 10)
            val componentB = ExposedTestDb.seedProduct(name = "B", quantity = 7)
            val bundleId = ExposedTestDb.seedProduct(name = "Bundle", isBundle = true)
            ExposedTestDb.seedBundleComponent(bundleId, componentA, quantity = 2)
            ExposedTestDb.seedBundleComponent(bundleId, componentB, quantity = 1)

            val result = service.getProductById(bundleId)
            assertEquals(5, result?.quantity)
        }
    }

    @Test
    fun `getProductById returns zero quantity when a component has no stock`() {
        runBlocking {
            val componentA = ExposedTestDb.seedProduct(name = "A", quantity = 5)
            val componentB = ExposedTestDb.seedProduct(name = "B", quantity = 0)
            val bundleId = ExposedTestDb.seedProduct(name = "Bundle", isBundle = true)
            ExposedTestDb.seedBundleComponent(bundleId, componentA, quantity = 1)
            ExposedTestDb.seedBundleComponent(bundleId, componentB, quantity = 1)

            val result = service.getProductById(bundleId)
            assertEquals(0, result?.quantity)
        }
    }

    @Test
    fun `getProductById returns bundleCostCents as sum of component costs times required quantity`() {
        runBlocking {
            val componentA = ExposedTestDb.seedProduct(name = "A", costCents = 300, quantity = 10)
            val componentB = ExposedTestDb.seedProduct(name = "B", costCents = 200, quantity = 10)
            val bundleId = ExposedTestDb.seedProduct(name = "Bundle", isBundle = true)
            ExposedTestDb.seedBundleComponent(bundleId, componentA, quantity = 2)
            ExposedTestDb.seedBundleComponent(bundleId, componentB, quantity = 1)

            val result = service.getProductById(bundleId)
            assertEquals(800, result?.bundleCostCents)
        }
    }

    @Test
    fun `updateProduct replaces bundle components`() {
        runBlocking {
            val componentA = ExposedTestDb.seedProduct(name = "A", quantity = 10)
            val componentB = ExposedTestDb.seedProduct(name = "B", quantity = 10)
            val bundleId = ExposedTestDb.seedProduct(name = "Bundle", isBundle = true)
            ExposedTestDb.seedBundleComponent(bundleId, componentA, quantity = 1)

            val updated =
                Product(
                    id = bundleId,
                    name = "Bundle",
                    costCents = 0,
                    quantity = 0,
                    minStockThreshold = 0,
                    maxStockThreshold = 0,
                    priceCents = 500,
                    isBundle = true,
                    bundleComponents = listOf(BundleComponent(componentB, quantity = 3)),
                )
            assertTrue(service.updateProduct(updated))

            val result = service.getProductById(bundleId)
            assertEquals(1, result?.bundleComponents?.size)
            assertEquals(componentB, result?.bundleComponents?.get(0)?.componentId)
            assertEquals(3, result?.bundleComponents?.get(0)?.quantity)
        }
    }

    @Test
    fun `updateProduct clears bundle components when switching to non-bundle`() {
        runBlocking {
            val componentId = ExposedTestDb.seedProduct(name = "Part", quantity = 10)
            val bundleId = ExposedTestDb.seedProduct(name = "Bundle", isBundle = true)
            ExposedTestDb.seedBundleComponent(bundleId, componentId, quantity = 1)

            val updated =
                Product(
                    id = bundleId,
                    name = "Bundle",
                    costCents = 0,
                    quantity = 5,
                    minStockThreshold = 0,
                    maxStockThreshold = 0,
                    priceCents = 500,
                    isBundle = false,
                    bundleComponents = emptyList(),
                )
            assertTrue(service.updateProduct(updated))

            val result = service.getProductById(bundleId)
            assertFalse(result?.isBundle ?: true)
            assertTrue(result?.bundleComponents?.isEmpty() ?: false)
        }
    }

    @Test
    fun `deleteProduct returns true when deleting a bundle itself`() {
        runBlocking {
            val componentId = ExposedTestDb.seedProduct(name = "Part")
            val bundleId = ExposedTestDb.seedProduct(name = "Kit", isBundle = true)
            ExposedTestDb.seedBundleComponent(bundleId, componentId)

            assertTrue(service.deleteProduct(bundleId))
            assertNull(service.getProductById(bundleId))
            assertNotNull(service.getProductById(componentId))
        }
    }

    @Test
    fun `updateProduct returns false when bundle has no components`() {
        runBlocking {
            val bundleId = ExposedTestDb.seedProduct(name = "Bundle", isBundle = true)
            val updated =
                Product(
                    id = bundleId,
                    name = "Bundle",
                    costCents = 0,
                    quantity = 0,
                    minStockThreshold = 0,
                    maxStockThreshold = 0,
                    priceCents = 500,
                    isBundle = true,
                    bundleComponents = emptyList(),
                )
            assertFalse(service.updateProduct(updated))
        }
    }

    @Test
    fun `adjustStock returns true when all updates succeed`() {
        runBlocking {
            val productId1 = ExposedTestDb.seedProduct(name = "Prod1", quantity = 5)
            val productId2 = ExposedTestDb.seedProduct(name = "Prod2", quantity = 3)

            val adjustments =
                listOf(
                    ProductStockAdjustment(productId = productId1, quantity = 2),
                    ProductStockAdjustment(productId = productId2, quantity = 1),
                )
            val result = service.adjustStock(adjustments)
            assertTrue(result)

            assertEquals(3, service.getProductById(productId1)?.quantity)
            assertEquals(2, service.getProductById(productId2)?.quantity)
        }
    }

    @Test
    fun `adjustStock returns false when stock is insufficient`() {
        runBlocking {
            val productId = ExposedTestDb.seedProduct(name = "Prod1", quantity = 1)

            val adjustments = listOf(ProductStockAdjustment(productId = productId, quantity = 2))
            val result = service.adjustStock(adjustments)
            assertFalse(result)

            assertEquals(1, service.getProductById(productId)?.quantity)
        }
    }

    @Test
    fun `adjustStock returns false when product not found`() {
        runBlocking {
            val adjustments =
                listOf(
                    ProductStockAdjustment(
                        productId =
                            java.util.UUID
                                .randomUUID()
                                .toString(),
                        quantity = 1,
                    ),
                )
            val result = service.adjustStock(adjustments)
            assertFalse(result)
        }
    }
}
