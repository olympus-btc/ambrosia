package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.v1.exceptions.ExposedSQLException
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.BundleComponent
import pos.ambrosia.models.Product
import pos.ambrosia.models.ProductStockAdjustment
import pos.ambrosia.models.UpsertVariantRequest
import pos.ambrosia.services.ProductService
import pos.ambrosia.services.ProductVariantService
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
    private val variantService = ProductVariantService()

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
        quantity: Int = 0,
        trackStock: Boolean = true,
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
            quantity = quantity,
            trackStock = trackStock,
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
    fun `addProduct defaults trackStock to true`() {
        runBlocking {
            val id = service.addProduct(newProduct(sku = "SKU-TRACKED", name = "Tracked"))
            assertNotNull(id)
            assertTrue(service.getProductById(id)!!.trackStock)
        }
    }

    @Test
    fun `addProduct persists trackStock false and zeroes stock fields`() {
        runBlocking {
            val untracked =
                newProduct(
                    sku = "SKU-SERVICE",
                    name = "Consulting service",
                    minStockThreshold = 5,
                    maxStockThreshold = 50,
                    quantity = 7,
                    trackStock = false,
                )
            val id = service.addProduct(untracked)
            assertNotNull(id)

            val created = service.getProductById(id)!!
            assertFalse(created.trackStock)
            assertEquals(0, created.minStockThreshold)
            assertEquals(0, created.maxStockThreshold)
            assertEquals(0, created.quantity)
        }
    }

    @Test
    fun `updateProduct toggles trackStock off and back on`() {
        runBlocking {
            val id = ExposedTestDb.seedProduct(name = "Prod1", sku = "SKU-1", minStockThreshold = 3)

            val turnedOff =
                service.updateProduct(
                    newProduct(id = id, sku = "SKU-1", name = "Prod1", minStockThreshold = 3, trackStock = false),
                )
            assertTrue(turnedOff)
            val untracked = service.getProductById(id)!!
            assertFalse(untracked.trackStock)
            assertEquals(0, untracked.minStockThreshold)

            val turnedOn =
                service.updateProduct(
                    newProduct(id = id, sku = "SKU-1", name = "Prod1", minStockThreshold = 3, trackStock = true),
                )
            assertTrue(turnedOn)
            val tracked = service.getProductById(id)!!
            assertTrue(tracked.trackStock)
            assertEquals(3, tracked.minStockThreshold)
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
            val invalidProduct = newProduct(id = "p-1", name = " ", minStockThreshold = -1, maxStockThreshold = -1)
            val result = service.updateProduct(invalidProduct)
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

            val updatedProduct = service.getProductById(id)
            assertEquals("Updated", updatedProduct?.name)
            assertEquals("SKU-OK", updatedProduct?.SKU)
            assertEquals(listOf(categoryId), updatedProduct?.categoryIds)
        }
    }

    @Test
    fun `updateProduct succeeds with null SKU`() {
        runBlocking {
            val id = ExposedTestDb.seedProduct(name = "Old Name", sku = "SKU-OLD")

            val toUpdate = newProduct(id = id, sku = null, name = "Updated No SKU", categoryIds = emptyList())
            val result = service.updateProduct(toUpdate)
            assertTrue(result)

            val updatedProduct = service.getProductById(id)
            assertNull(updatedProduct?.SKU)
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

            val updatedProduct = service.getProductById(id)
            assertTrue(updatedProduct?.categoryIds?.isEmpty() == true)
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
            val componentVariantId = variantService.getVariants(componentId)[0].id!!
            val bundle =
                Product(
                    name = "Kit",
                    costCents = 0,
                    quantity = 0,
                    minStockThreshold = 0,
                    maxStockThreshold = 0,
                    priceCents = 500,
                    isBundle = true,
                    bundleComponents = listOf(BundleComponent(componentId, variantId = componentVariantId, quantity = 2)),
                )
            val bundleId = service.addProduct(bundle)
            assertNotNull(bundleId)

            val created = service.getProductById(bundleId)
            assertNotNull(created)
            assertTrue(created.isBundle)
            assertEquals(1, created.bundleComponents.size)
            assertEquals(componentId, created.bundleComponents[0].componentId)
            assertEquals(componentVariantId, created.bundleComponents[0].variantId)
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
    fun `getProductById ignores untracked components when computing bundle quantity`() {
        runBlocking {
            val trackedComponent = ExposedTestDb.seedProduct(name = "Mug", quantity = 10)
            val untrackedComponent = ExposedTestDb.seedProduct(name = "Coffee", quantity = 0, trackStock = false)
            val bundleId = ExposedTestDb.seedProduct(name = "Kit", isBundle = true)
            ExposedTestDb.seedBundleComponent(bundleId, trackedComponent, quantity = 1)
            ExposedTestDb.seedBundleComponent(bundleId, untrackedComponent, quantity = 1)

            val result = service.getProductById(bundleId)
            assertEquals(10, result?.quantity)
            assertTrue(result?.trackStock == true)
        }
    }

    @Test
    fun `getProductById reports a bundle as untracked when every component is untracked`() {
        runBlocking {
            val componentA = ExposedTestDb.seedProduct(name = "Coffee", quantity = 0, trackStock = false)
            val componentB = ExposedTestDb.seedProduct(name = "Water", quantity = 0, trackStock = false)
            val bundleId = ExposedTestDb.seedProduct(name = "Kit", isBundle = true)
            ExposedTestDb.seedBundleComponent(bundleId, componentA, quantity = 1)
            ExposedTestDb.seedBundleComponent(bundleId, componentB, quantity = 1)

            val result = service.getProductById(bundleId)
            assertEquals(false, result?.trackStock)
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
    fun `getProductById returns bundle stock and cost from selected component variant`() {
        runBlocking {
            val componentId = ExposedTestDb.seedProduct(name = "Shirt", costCents = 300, quantity = 2)
            val selectedVariantId =
                variantService.addVariant(
                    componentId,
                    UpsertVariantRequest(priceCents = 1500, costCents = 600, quantity = 9),
                )
            val bundleId = ExposedTestDb.seedProduct(name = "Bundle", isBundle = true)
            ExposedTestDb.seedBundleComponent(bundleId, componentId, componentVariantId = selectedVariantId, quantity = 3)

            val result = service.getProductById(bundleId)

            assertEquals(3, result?.quantity)
            assertEquals(1800, result?.bundleCostCents)
            assertEquals(selectedVariantId, result?.bundleComponents?.first()?.variantId)
        }
    }

    @Test
    fun `updateProduct returns false when bundle component variant belongs to another product`() {
        runBlocking {
            val componentId = ExposedTestDb.seedProduct(name = "Component")
            val otherProductId = ExposedTestDb.seedProduct(name = "Other")
            val foreignVariantId = variantService.getVariants(otherProductId)[0].id!!
            val bundleId = ExposedTestDb.seedProduct(name = "Bundle", isBundle = true)

            val bundleUpdateRequest =
                Product(
                    id = bundleId,
                    name = "Bundle",
                    costCents = 0,
                    quantity = 0,
                    minStockThreshold = 0,
                    maxStockThreshold = 0,
                    priceCents = 500,
                    isBundle = true,
                    bundleComponents = listOf(BundleComponent(componentId, variantId = foreignVariantId, quantity = 1)),
                )

            assertFalse(service.updateProduct(bundleUpdateRequest))
        }
    }

    @Test
    fun `updateProduct replaces bundle components`() {
        runBlocking {
            val componentA = ExposedTestDb.seedProduct(name = "A", quantity = 10)
            val componentB = ExposedTestDb.seedProduct(name = "B", quantity = 10)
            val bundleId = ExposedTestDb.seedProduct(name = "Bundle", isBundle = true)
            ExposedTestDb.seedBundleComponent(bundleId, componentA, quantity = 1)

            val bundleUpdateRequest =
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
            assertTrue(service.updateProduct(bundleUpdateRequest))

            val result = service.getProductById(bundleId)
            assertEquals(1, result?.bundleComponents?.size)
            assertEquals(componentB, result?.bundleComponents?.get(0)?.componentId)
            assertEquals(3, result?.bundleComponents?.get(0)?.quantity)
        }
    }

    @Test
    fun `updateProduct converts variant product to bundle and disables previous sellable variants`() {
        runBlocking {
            val productId = ExposedTestDb.seedProduct(name = "Variant Product", hasVariants = true, priceCents = 1200)
            val extraVariantId =
                variantService.addVariant(
                    productId,
                    UpsertVariantRequest(priceCents = 1800, costCents = 900, quantity = 4),
                )
            val componentId = ExposedTestDb.seedProduct(name = "Part", quantity = 10)
            val bundleUpdateRequest =
                Product(
                    id = productId,
                    name = "Bundle",
                    costCents = 700,
                    quantity = 0,
                    minStockThreshold = 0,
                    maxStockThreshold = 0,
                    priceCents = 2500,
                    hasVariants = true,
                    isBundle = true,
                    bundleComponents = listOf(BundleComponent(componentId, quantity = 2)),
                )

            assertTrue(service.updateProduct(bundleUpdateRequest))

            val updatedProduct = service.getProductById(productId)
            assertNotNull(updatedProduct)
            assertTrue(updatedProduct.isBundle)
            assertFalse(updatedProduct.hasVariants)
            assertEquals(2500, updatedProduct.priceCents)
            assertEquals(1, updatedProduct.variants.size)
            assertEquals(0, updatedProduct.variants[0].quantity)
            assertFalse(updatedProduct.variants.any { variant -> variant.id == extraVariantId })
        }
    }

    @Test
    fun `updateProduct clears bundle components when switching to non-bundle`() {
        runBlocking {
            val componentId = ExposedTestDb.seedProduct(name = "Part", quantity = 10)
            val bundleId = ExposedTestDb.seedProduct(name = "Bundle", isBundle = true)
            ExposedTestDb.seedBundleComponent(bundleId, componentId, quantity = 1)

            val nonBundleUpdateRequest =
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
            assertTrue(service.updateProduct(nonBundleUpdateRequest))

            val updatedProduct = service.getProductById(bundleId)
            assertNotNull(updatedProduct)
            assertFalse(updatedProduct.isBundle)
            assertTrue(updatedProduct.bundleComponents.isEmpty())
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
            val emptyBundleUpdateRequest =
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
            assertFalse(service.updateProduct(emptyBundleUpdateRequest))
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
    fun `adjustStock skips products that do not track stock`() {
        runBlocking {
            val untrackedId = ExposedTestDb.seedProduct(name = "Service", quantity = 0, trackStock = false)

            val adjustments = listOf(ProductStockAdjustment(productId = untrackedId, quantity = 4))
            assertTrue(service.adjustStock(adjustments))

            assertEquals(0, service.getProductById(untrackedId)?.quantity)
        }
    }

    @Test
    fun `adjustStock skips untracked products addressed by variant id`() {
        runBlocking {
            val untrackedId = ExposedTestDb.seedProduct(name = "Service", quantity = 0, trackStock = false)
            val variantId = variantService.getVariants(untrackedId).first().id

            val adjustments =
                listOf(ProductStockAdjustment(productId = untrackedId, variantId = variantId, quantity = 4))
            assertTrue(service.adjustStock(adjustments))

            assertEquals(0, service.getProductById(untrackedId)?.quantity)
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
