package pos.ambrosia.utest

import org.jetbrains.exposed.v1.exceptions.ExposedSQLException
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.ProductStockAdjustment
import pos.ambrosia.models.UpsertOptionTypeRequest
import pos.ambrosia.models.UpsertOptionValueRequest
import pos.ambrosia.models.UpsertVariantRequest
import pos.ambrosia.services.ProductVariantService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ProductVariantServiceTest {
    private lateinit var dbFile: File
    private val service = ProductVariantService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    // --- Option Types ---

    @Test
    fun `getOptionTypes returns empty list when none found`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        val result = service.getOptionTypes(productId)
        assertTrue(result.isEmpty())
    }

    @Test
    fun `getOptionTypes returns list with nested values`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        service.addOptionType(
            productId,
            UpsertOptionTypeRequest(name = "Color", values = listOf(UpsertOptionValueRequest("Red"), UpsertOptionValueRequest("Blue"))),
        )

        val result = service.getOptionTypes(productId)
        assertEquals(1, result.size)
        assertEquals("Color", result[0].name)
        assertEquals(2, result[0].values.size)
    }

    @Test
    fun `addOptionType returns id and creates values`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        val optionTypeRequest =
            UpsertOptionTypeRequest(name = "Size", values = listOf(UpsertOptionValueRequest("S"), UpsertOptionValueRequest("M")))
        val optionTypeId = service.addOptionType(productId, optionTypeRequest)

        assertNotNull(optionTypeId)
        assertTrue(optionTypeId.isNotBlank())
        val options = service.getOptionTypes(productId)
        assertEquals(1, options.size)
        assertEquals(2, options[0].values.size)
    }

    @Test
    fun `updateOptionType returns false when not found`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        val optionTypeWasUpdated =
            service.updateOptionType(
                productId,
                UUID.randomUUID().toString(),
                UpsertOptionTypeRequest(name = "Color"),
            )
        assertFalse(optionTypeWasUpdated)
    }

    @Test
    fun `updateOptionType replaces values`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        val optionTypeId =
            service.addOptionType(
                productId,
                UpsertOptionTypeRequest(name = "Color", values = listOf(UpsertOptionValueRequest("Red"))),
            )

        val optionTypeWasUpdated =
            service.updateOptionType(
                productId,
                optionTypeId!!,
                UpsertOptionTypeRequest(
                    name = "Color",
                    values = listOf(UpsertOptionValueRequest("Blue"), UpsertOptionValueRequest("Green")),
                ),
            )
        assertTrue(optionTypeWasUpdated)

        val options = service.getOptionTypes(productId)
        assertEquals(2, options[0].values.size)
    }

    @Test
    fun `deleteOptionType returns true on success`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        val optionTypeId = service.addOptionType(productId, UpsertOptionTypeRequest(name = "Color"))
        val optionTypeWasDeleted = service.deleteOptionType(productId, optionTypeId!!)
        assertTrue(optionTypeWasDeleted)
        assertTrue(service.getOptionTypes(productId).isEmpty())
    }

    @Test
    fun `deleteOptionType returns false when not found`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        val optionTypeWasDeleted = service.deleteOptionType(productId, UUID.randomUUID().toString())
        assertFalse(optionTypeWasDeleted)
    }

    @Test
    fun `updateOptionType returns false when option type belongs to another product`() {
        val ownerProductId = ExposedTestDb.seedProduct(name = "Prod1")
        val unrelatedProductId = ExposedTestDb.seedProduct(name = "Prod2")
        val ownerOptionTypeId = service.addOptionType(ownerProductId, UpsertOptionTypeRequest(name = "Color"))

        val optionTypeWasUpdated =
            service.updateOptionType(
                unrelatedProductId,
                ownerOptionTypeId!!,
                UpsertOptionTypeRequest(name = "Size"),
            )

        assertFalse(optionTypeWasUpdated)
        assertEquals("Color", service.getOptionTypes(ownerProductId)[0].name)
    }

    @Test
    fun `deleteOptionType returns false when option type belongs to another product`() {
        val ownerProductId = ExposedTestDb.seedProduct(name = "Prod1")
        val unrelatedProductId = ExposedTestDb.seedProduct(name = "Prod2")
        val ownerOptionTypeId = service.addOptionType(ownerProductId, UpsertOptionTypeRequest(name = "Color"))

        val optionTypeWasDeleted = service.deleteOptionType(unrelatedProductId, ownerOptionTypeId!!)

        assertFalse(optionTypeWasDeleted)
        assertEquals(1, service.getOptionTypes(ownerProductId).size)
    }

    @Test
    fun `option type mutations return false for invalid UUID`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")

        assertFalse(service.updateOptionType(productId, "not-a-uuid", UpsertOptionTypeRequest(name = "Color")))
        assertFalse(service.deleteOptionType(productId, "not-a-uuid"))
    }

    // --- Variants ---

    @Test
    fun `getVariants returns list of variants`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1", priceCents = 1000)
        val result = service.getVariants(productId)
        assertEquals(1, result.size)
        assertEquals(1000, result[0].priceCents)
    }

    @Test
    fun `getVariants returns empty list for unknown product`() {
        val result = service.getVariants(UUID.randomUUID().toString())
        assertTrue(result.isEmpty())
    }

    @Test
    fun `getVariantById returns variant when found`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1", priceCents = 500)
        val variantId = service.getVariants(productId)[0].id!!

        val result = service.getVariantById(variantId)
        assertNotNull(result)
        assertEquals(500, result.priceCents)
    }

    @Test
    fun `getVariantById returns null when not found`() {
        val result = service.getVariantById(UUID.randomUUID().toString())
        assertNull(result)
    }

    @Test
    fun `getVariantById returns null for invalid UUID`() {
        val result = service.getVariantById("not-a-uuid")
        assertNull(result)
    }

    @Test
    fun `getDefaultVariant returns null when no variants`() {
        val result = service.getDefaultVariant(UUID.randomUUID().toString())
        assertNull(result)
    }

    @Test
    fun `getDefaultVariant returns first variant`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1", priceCents = 300)
        val result = service.getDefaultVariant(productId)
        assertNotNull(result)
        assertEquals(300, result.priceCents)
    }

    @Test
    fun `addVariant returns null when priceCents is negative`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        val result = service.addVariant(productId, UpsertVariantRequest(priceCents = -1))
        assertNull(result)
    }

    @Test
    fun `addVariant returns null when quantity is negative`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        val result = service.addVariant(productId, UpsertVariantRequest(priceCents = 100, quantity = -1))
        assertNull(result)
    }

    @Test
    fun `addVariant returns new ID on success`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        val id = service.addVariant(productId, UpsertVariantRequest(priceCents = 1000, quantity = 5))
        assertNotNull(id)
        assertTrue(id.isNotBlank())

        val variant = service.getVariantById(id)
        assertEquals(1000, variant?.priceCents)
        assertEquals(5, variant?.quantity)
    }

    @Test
    fun `addVariant throws on duplicate SKU`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        service.addVariant(productId, UpsertVariantRequest(SKU = "DUP-SKU", priceCents = 500))
        assertFailsWith<ExposedSQLException> {
            service.addVariant(productId, UpsertVariantRequest(SKU = "DUP-SKU", priceCents = 600))
        }
    }

    @Test
    fun `updateVariant returns false when not found`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        val variantWasUpdated = service.updateVariant(productId, UUID.randomUUID().toString(), UpsertVariantRequest(priceCents = 500))
        assertFalse(variantWasUpdated)
    }

    @Test
    fun `updateVariant returns false when priceCents is negative`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        val variantId = service.getVariants(productId)[0].id!!
        val variantWasUpdated = service.updateVariant(productId, variantId, UpsertVariantRequest(priceCents = -1))
        assertFalse(variantWasUpdated)
    }

    @Test
    fun `updateVariant returns true and updates data`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1", priceCents = 1000)
        val variantId = service.getVariants(productId)[0].id!!

        val variantWasUpdated = service.updateVariant(productId, variantId, UpsertVariantRequest(priceCents = 800, quantity = 3))
        assertTrue(variantWasUpdated)

        val updated = service.getVariantById(variantId)
        assertEquals(800, updated?.priceCents)
        assertEquals(3, updated?.quantity)
    }

    @Test
    fun `deleteVariant returns true on success`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        val variantId = service.getVariants(productId)[0].id!!
        val variantWasDeleted = service.deleteVariant(productId, variantId)
        assertTrue(variantWasDeleted)
        assertNull(service.getVariantById(variantId))
    }

    @Test
    fun `deleteVariant returns false when not found`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        val variantWasDeleted = service.deleteVariant(productId, UUID.randomUUID().toString())
        assertFalse(variantWasDeleted)
    }

    @Test
    fun `updateVariant returns false when variant belongs to another product`() {
        val ownerProductId = ExposedTestDb.seedProduct(name = "Prod1", priceCents = 1000)
        val unrelatedProductId = ExposedTestDb.seedProduct(name = "Prod2")
        val ownerVariantId = service.getVariants(ownerProductId)[0].id!!

        val variantWasUpdated = service.updateVariant(unrelatedProductId, ownerVariantId, UpsertVariantRequest(priceCents = 800))

        assertFalse(variantWasUpdated)
        assertEquals(1000, service.getVariantById(ownerVariantId)?.priceCents)
    }

    @Test
    fun `deleteVariant returns false when variant belongs to another product`() {
        val ownerProductId = ExposedTestDb.seedProduct(name = "Prod1")
        val unrelatedProductId = ExposedTestDb.seedProduct(name = "Prod2")
        val ownerVariantId = service.getVariants(ownerProductId)[0].id!!

        val variantWasDeleted = service.deleteVariant(unrelatedProductId, ownerVariantId)

        assertFalse(variantWasDeleted)
        assertNotNull(service.getVariantById(ownerVariantId))
    }

    @Test
    fun `variant mutations return false for invalid UUID`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")

        assertFalse(service.updateVariant(productId, "not-a-uuid", UpsertVariantRequest(priceCents = 500)))
        assertFalse(service.deleteVariant(productId, "not-a-uuid"))
    }

    @Test
    fun `addVariant returns null when option value belongs to another product`() {
        val targetProductId = ExposedTestDb.seedProduct(name = "Prod1")
        val optionOwnerProductId = ExposedTestDb.seedProduct(name = "Prod2")
        service.addOptionType(
            optionOwnerProductId,
            UpsertOptionTypeRequest(
                name = "Color",
                values = listOf(UpsertOptionValueRequest("Red")),
            ),
        )
        val foreignOptionValueId = service.getOptionTypes(optionOwnerProductId)[0].values[0].id!!

        val createdVariantId =
            service.addVariant(
                targetProductId,
                UpsertVariantRequest(priceCents = 500, optionValueIds = listOf(foreignOptionValueId)),
            )

        assertNull(createdVariantId)
    }

    @Test
    fun `updateVariant returns false when option value belongs to another product`() {
        val targetProductId = ExposedTestDb.seedProduct(name = "Prod1")
        val optionOwnerProductId = ExposedTestDb.seedProduct(name = "Prod2")
        val targetVariantId = service.getVariants(targetProductId)[0].id!!
        service.addOptionType(
            optionOwnerProductId,
            UpsertOptionTypeRequest(
                name = "Color",
                values = listOf(UpsertOptionValueRequest("Red")),
            ),
        )
        val foreignOptionValueId = service.getOptionTypes(optionOwnerProductId)[0].values[0].id!!

        val variantWasUpdated =
            service.updateVariant(
                targetProductId,
                targetVariantId,
                UpsertVariantRequest(priceCents = 500, optionValueIds = listOf(foreignOptionValueId)),
            )

        assertFalse(variantWasUpdated)
    }

    // --- Stock Adjustment ---

    @Test
    fun `adjustStock returns true for empty list`() {
        val result = service.adjustStock(emptyList())
        assertTrue(result)
    }

    @Test
    fun `adjustStock returns false for negative quantity`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1")
        val result = service.adjustStock(listOf(ProductStockAdjustment(productId = productId, quantity = -1)))
        assertFalse(result)
    }

    @Test
    fun `adjustStock by variantId decrements variant stock`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1", quantity = 10)
        val variantId = service.getVariants(productId)[0].id!!

        val result = service.adjustStock(listOf(ProductStockAdjustment(productId = productId, variantId = variantId, quantity = 3)))
        assertTrue(result)
        assertEquals(7, service.getVariantById(variantId)?.quantity)
    }

    @Test
    fun `adjustStock by productId auto-resolves default variant`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1", quantity = 10)
        val variantId = service.getVariants(productId)[0].id!!

        val result = service.adjustStock(listOf(ProductStockAdjustment(productId = productId, variantId = null, quantity = 4)))
        assertTrue(result)
        assertEquals(6, service.getVariantById(variantId)?.quantity)
    }

    @Test
    fun `adjustStock returns false when stock insufficient`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1", quantity = 5)
        val variantId = service.getVariants(productId)[0].id!!

        val result = service.adjustStock(listOf(ProductStockAdjustment(productId = productId, variantId = variantId, quantity = 999)))
        assertFalse(result)
        assertEquals(5, service.getVariantById(variantId)?.quantity)
    }

    @Test
    fun `adjustStock skips zero-quantity items`() {
        val productId = ExposedTestDb.seedProduct(name = "Prod1", quantity = 5)
        val variantId = service.getVariants(productId)[0].id!!

        val result = service.adjustStock(listOf(ProductStockAdjustment(productId = productId, variantId = variantId, quantity = 0)))
        assertTrue(result)
        assertEquals(5, service.getVariantById(variantId)?.quantity)
    }
}
