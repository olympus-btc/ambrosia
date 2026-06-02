package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.models.ProductStockAdjustment
import pos.ambrosia.models.UpsertOptionTypeRequest
import pos.ambrosia.models.UpsertOptionValueRequest
import pos.ambrosia.models.UpsertVariantRequest
import pos.ambrosia.services.ProductVariantService
import pos.ambrosia.utils.DuplicateVariantSkuException
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.SQLException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ProductVariantServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    private val mockNestedStatement: PreparedStatement = mock()
    private val mockNestedResultSet: ResultSet = mock()

    private fun service() = ProductVariantService(mockConnection)

    private fun stubOptionValues(returnValues: Boolean = false) {
        whenever(mockConnection.prepareStatement(contains("FROM product_option_values"))).thenReturn(mockNestedStatement)
        whenever(mockNestedStatement.executeQuery()).thenReturn(mockNestedResultSet)
        whenever(mockNestedResultSet.next()).thenReturn(returnValues)
    }

    private fun stubVariantOptionIds(returnValues: Boolean = false) {
        whenever(mockConnection.prepareStatement(contains("FROM variant_option_values"))).thenReturn(mockNestedStatement)
        whenever(mockNestedStatement.executeQuery()).thenReturn(mockNestedResultSet)
        whenever(mockNestedResultSet.next()).thenReturn(returnValues)
    }

    private fun stubVariantResultSet(rs: ResultSet, id: String = "v-1") {
        whenever(rs.getString("id")).thenReturn(id)
        whenever(rs.getString("product_id")).thenReturn("p-1")
        whenever(rs.getString("sku")).thenReturn("V-SKU-1")
        whenever(rs.getInt("price_cents")).thenReturn(1000)
        whenever(rs.getInt("cost_cents")).thenReturn(500)
        whenever(rs.wasNull()).thenReturn(false)
        whenever(rs.getInt("quantity")).thenReturn(10)
        whenever(rs.getInt("is_active")).thenReturn(1)
        whenever(rs.getString("image_url")).thenReturn(null)
    }

    // --- Option Types ---

    @Test
    fun `getOptionTypes returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(contains("FROM product_option_types"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val result = service().getOptionTypes("p-1") // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getOptionTypes returns list with nested values`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(contains("FROM product_option_types"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("ot-1") // Arrange
            whenever(mockResultSet.getString("product_id")).thenReturn("p-1") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("Color") // Arrange
            whenever(mockResultSet.getInt("display_order")).thenReturn(0) // Arrange
            stubOptionValues() // Arrange — no values
            val result = service().getOptionTypes("p-1") // Act
            assertEquals(1, result.size) // Assert
            assertEquals("Color", result[0].name) // Assert
            assertEquals("ot-1", result[0].id) // Assert
        }
    }

    @Test
    fun `addOptionType inserts type and values in transaction and returns id`() {
        runBlocking {
            val req = UpsertOptionTypeRequest(name = "Size", values = listOf(UpsertOptionValueRequest("S"), UpsertOptionValueRequest("M"))) // Arrange
            val insertTypeSt: PreparedStatement = mock() // Arrange
            val insertValueSt: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO product_option_types"))).thenReturn(insertTypeSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO product_option_values"))).thenReturn(insertValueSt) // Arrange
            val id = service().addOptionType("p-1", req) // Act
            assertNotNull(id) // Assert
            assertTrue(id.isNotBlank()) // Assert
            verify(insertTypeSt).executeUpdate() // Assert
            verify(insertValueSt).executeBatch() // Assert
            verify(mockConnection).commit() // Assert
        }
    }

    @Test
    fun `addOptionType rolls back on exception`() {
        runBlocking {
            val req = UpsertOptionTypeRequest(name = "Size") // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO product_option_types"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenThrow(RuntimeException("forced")) // Arrange
            assertFailsWith<RuntimeException> { service().addOptionType("p-1", req) } // Act
            verify(mockConnection).rollback() // Assert
            verify(mockConnection, never()).commit() // Assert
        }
    }

    @Test
    fun `updateOptionType returns false when option type not found`() {
        runBlocking {
            val req = UpsertOptionTypeRequest(name = "Color") // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE product_option_types"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(0) // Arrange
            val result = service().updateOptionType("ot-missing", req) // Act
            assertFalse(result) // Assert
            verify(mockConnection).rollback() // Assert
        }
    }

    @Test
    fun `updateOptionType replaces values in transaction`() {
        runBlocking {
            val req = UpsertOptionTypeRequest(name = "Color", values = listOf(UpsertOptionValueRequest("Red"))) // Arrange
            val updateTypeSt: PreparedStatement = mock() // Arrange
            val deleteValuesSt: PreparedStatement = mock() // Arrange
            val insertValueSt: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE product_option_types"))).thenReturn(updateTypeSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("DELETE FROM product_option_values"))).thenReturn(deleteValuesSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO product_option_values"))).thenReturn(insertValueSt) // Arrange
            whenever(updateTypeSt.executeUpdate()).thenReturn(1) // Arrange
            val result = service().updateOptionType("ot-1", req) // Act
            assertTrue(result) // Assert
            verify(deleteValuesSt).executeUpdate() // Assert
            verify(insertValueSt).executeBatch() // Assert
            verify(mockConnection).commit() // Assert
        }
    }

    @Test
    fun `deleteOptionType returns true on success`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(contains("DELETE FROM product_option_types"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(1) // Arrange
            val result = service().deleteOptionType("ot-1") // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `deleteOptionType returns false when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(contains("DELETE FROM product_option_types"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(0) // Arrange
            val result = service().deleteOptionType("ot-missing") // Act
            assertFalse(result) // Assert
        }
    }

    // --- Variants ---

    @Test
    fun `getVariants returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(contains("FROM product_variants WHERE product_id"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val result = service().getVariants("p-1") // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getVariants returns list of variants`() {
        runBlocking {
            stubVariantOptionIds() // Arrange — no option links
            whenever(mockConnection.prepareStatement(contains("FROM product_variants WHERE product_id"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            stubVariantResultSet(mockResultSet) // Arrange
            val result = service().getVariants("p-1") // Act
            assertEquals(1, result.size) // Assert
            assertEquals("v-1", result[0].id) // Assert
            assertEquals(1000, result[0].priceCents) // Assert
        }
    }

    @Test
    fun `getVariantById returns variant when found`() {
        runBlocking {
            stubVariantOptionIds() // Arrange
            whenever(mockConnection.prepareStatement(contains("FROM product_variants WHERE id"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            stubVariantResultSet(mockResultSet) // Arrange
            val result = service().getVariantById("v-1") // Act
            assertNotNull(result) // Assert
            assertEquals("v-1", result!!.id) // Assert
        }
    }

    @Test
    fun `getVariantById returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val result = service().getVariantById("missing") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `getDefaultVariant returns null when no variants exist`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(contains("WHERE product_id = ? LIMIT 1"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val result = service().getDefaultVariant("p-no-variants") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addVariant returns null when priceCents is negative`() {
        runBlocking {
            val req = UpsertVariantRequest(priceCents = -1) // Arrange
            val result = service().addVariant("p-1", req) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `addVariant returns null when quantity is negative`() {
        runBlocking {
            val req = UpsertVariantRequest(priceCents = 100, quantity = -1) // Arrange
            val result = service().addVariant("p-1", req) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `addVariant returns new ID on success`() {
        runBlocking {
            val req = UpsertVariantRequest(priceCents = 1000, quantity = 5) // Arrange
            val insertSt: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO product_variants"))).thenReturn(insertSt) // Arrange
            val id = service().addVariant("p-1", req) // Act
            assertNotNull(id) // Assert
            assertTrue(id!!.isNotBlank()) // Assert
            verify(mockConnection).commit() // Assert
        }
    }

    @Test
    fun `addVariant throws DuplicateVariantSkuException on SKU conflict`() {
        runBlocking {
            val req = UpsertVariantRequest(SKU = "DUP-SKU", priceCents = 500) // Arrange
            val insertSt: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO product_variants"))).thenReturn(insertSt) // Arrange
            whenever(insertSt.executeUpdate()).thenThrow(
                SQLException("UNIQUE constraint failed: product_variants.sku"),
            ) // Arrange
            assertFailsWith<DuplicateVariantSkuException> { service().addVariant("p-1", req) } // Act
            verify(mockConnection).rollback() // Assert
        }
    }

    @Test
    fun `updateVariant returns false when not found`() {
        runBlocking {
            val req = UpsertVariantRequest(priceCents = 500) // Arrange
            val updateSt: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE product_variants"))).thenReturn(updateSt) // Arrange
            whenever(updateSt.executeUpdate()).thenReturn(0) // Arrange
            val result = service().updateVariant("v-missing", req) // Act
            assertFalse(result) // Assert
            verify(mockConnection).rollback() // Assert
        }
    }

    @Test
    fun `updateVariant returns true on success`() {
        runBlocking {
            val req = UpsertVariantRequest(priceCents = 800, quantity = 3) // Arrange
            val updateSt: PreparedStatement = mock() // Arrange
            val deleteOptionsSt: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE product_variants"))).thenReturn(updateSt) // Arrange
            whenever(mockConnection.prepareStatement(contains("DELETE FROM variant_option_values"))).thenReturn(deleteOptionsSt) // Arrange
            whenever(updateSt.executeUpdate()).thenReturn(1) // Arrange
            val result = service().updateVariant("v-1", req) // Act
            assertTrue(result) // Assert
            verify(deleteOptionsSt).executeUpdate() // Assert
            verify(mockConnection).commit() // Assert
        }
    }

    @Test
    fun `deleteVariant returns true on success`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(contains("DELETE FROM product_variants"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(1) // Arrange
            val result = service().deleteVariant("v-1") // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `deleteVariant returns false when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(contains("DELETE FROM product_variants"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(0) // Arrange
            val result = service().deleteVariant("v-missing") // Act
            assertFalse(result) // Assert
        }
    }

    // --- Stock Adjustment ---

    @Test
    fun `adjustStock returns true for empty list`() {
        runBlocking {
            val result = service().adjustStock(emptyList()) // Act
            assertTrue(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `adjustStock returns false for negative quantity`() {
        runBlocking {
            val adjustments = listOf(ProductStockAdjustment(productId = "p-1", quantity = -1)) // Arrange
            val result = service().adjustStock(adjustments) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `adjustStock by variantId uses variant-specific query`() {
        runBlocking {
            val adjustments = listOf(ProductStockAdjustment(productId = "p-1", variantId = "v-1", quantity = 2)) // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE id = ? AND quantity >="))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(1) // Arrange
            val result = service().adjustStock(adjustments) // Act
            assertTrue(result) // Assert
            verify(mockStatement).setString(2, "v-1") // Assert — uses variantId
            verify(mockConnection).commit() // Assert
        }
    }

    @Test
    fun `adjustStock by productId auto-resolves when variantId is null`() {
        runBlocking {
            val adjustments = listOf(ProductStockAdjustment(productId = "p-1", variantId = null, quantity = 2)) // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE product_id = ? AND quantity >="))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(1) // Arrange
            val result = service().adjustStock(adjustments) // Act
            assertTrue(result) // Assert
            verify(mockStatement).setString(2, "p-1") // Assert — uses productId
            verify(mockConnection).commit() // Assert
        }
    }

    @Test
    fun `adjustStock returns false and rolls back when stock insufficient`() {
        runBlocking {
            val adjustments = listOf(ProductStockAdjustment(productId = "p-1", variantId = "v-1", quantity = 999)) // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE id = ? AND quantity >="))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(0) // Arrange — 0 rows = insufficient stock
            val result = service().adjustStock(adjustments) // Act
            assertFalse(result) // Assert
            verify(mockConnection).rollback() // Assert
            verify(mockConnection, never()).commit() // Assert
        }
    }

    @Test
    fun `adjustStock skips zero-quantity adjustments`() {
        runBlocking {
            val adjustments = listOf(ProductStockAdjustment(productId = "p-1", variantId = "v-1", quantity = 0)) // Arrange
            val result = service().adjustStock(adjustments) // Act
            assertTrue(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert — no DB calls for quantity=0
        }
    }
}
