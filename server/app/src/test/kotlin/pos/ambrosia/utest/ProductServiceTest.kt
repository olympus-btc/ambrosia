package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.models.Product
import pos.ambrosia.services.ProductService
import pos.ambrosia.services.ProductVariantService
import pos.ambrosia.utils.DuplicateProductSkuException
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ProductServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()
    private val mockVariantService: ProductVariantService = mock()

    private val mockCatStatement: PreparedStatement = mock()
    private val mockCatResultSet: ResultSet = mock()

    private fun stubCategoryIds() {
        whenever(mockConnection.prepareStatement(contains("SELECT category_id FROM product_categories"))).thenReturn(mockCatStatement)
        whenever(mockConnection.prepareStatement(contains("INSERT OR IGNORE INTO product_categories"))).thenReturn(mockCatStatement)
        whenever(mockConnection.prepareStatement(contains("DELETE FROM product_categories"))).thenReturn(mockCatStatement)
        whenever(mockCatStatement.executeQuery()).thenReturn(mockCatResultSet)
        whenever(mockCatResultSet.next()).thenReturn(false)
    }

    private fun stubVariantService() {
        runBlocking {
            whenever(mockVariantService.getOptionTypes(any())).thenReturn(emptyList())
            whenever(mockVariantService.getVariants(any())).thenReturn(emptyList())
        }
    }

    private fun stubProductResultSet(
        rs: ResultSet,
        id: String = "p-1",
        sku: String? = "SKU-1",
        name: String = "Prod1",
        hasVariants: Int = 0,
    ) {
        whenever(rs.getString("id")).thenReturn(id)
        whenever(rs.getString("SKU")).thenReturn(sku)
        whenever(rs.getString("name")).thenReturn(name)
        whenever(rs.getString("description")).thenReturn(null)
        whenever(rs.getString("image_url")).thenReturn(null)
        whenever(rs.getInt("min_stock_threshold")).thenReturn(1)
        whenever(rs.getInt("max_stock_threshold")).thenReturn(10)
        whenever(rs.getInt("has_variants")).thenReturn(hasVariants)
    }

    private fun service() = ProductService(mockConnection, mockVariantService)

    @Test
    fun `getProducts returns list when found`() {
        runBlocking {
            stubCategoryIds() // Arrange
            whenever(mockConnection.prepareStatement(contains("FROM products WHERE is_deleted"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("p-1").thenReturn("p-2") // Arrange
            whenever(mockResultSet.getString("SKU")).thenReturn("SKU-1").thenReturn("SKU-2") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("Prod1").thenReturn("Prod2") // Arrange
            whenever(mockResultSet.getString("description")).thenReturn(null) // Arrange
            whenever(mockResultSet.getString("image_url")).thenReturn(null) // Arrange
            whenever(mockResultSet.getInt("min_stock_threshold")).thenReturn(1).thenReturn(2) // Arrange
            whenever(mockResultSet.getInt("max_stock_threshold")).thenReturn(10).thenReturn(20) // Arrange
            whenever(mockResultSet.getInt("has_variants")).thenReturn(0).thenReturn(0) // Arrange
            val result = service().getProducts() // Act
            assertEquals(2, result.size) // Assert
            assertEquals("SKU-1", result[0].SKU) // Assert
            assertEquals("Prod2", result[1].name) // Assert
        }
    }

    @Test
    fun `getProducts returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val result = service().getProducts() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getProductById returns product when found`() {
        runBlocking {
            stubCategoryIds() // Arrange
            stubVariantService() // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE id = ?"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            stubProductResultSet(mockResultSet) // Arrange
            val result = service().getProductById("p-1") // Act
            assertNotNull(result) // Assert
            assertEquals("SKU-1", result!!.SKU) // Assert
            assertTrue(result.options.isEmpty()) // Assert
            assertTrue(result.variants.isEmpty()) // Assert
        }
    }

    @Test
    fun `getProductById returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val result = service().getProductById("missing") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `getProductBySKU returns product when found`() {
        runBlocking {
            stubCategoryIds() // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE SKU = ?"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            stubProductResultSet(mockResultSet) // Arrange
            val result = service().getProductBySKU("SKU-1") // Act
            assertNotNull(result) // Assert
            assertEquals("p-1", result!!.id) // Assert
        }
    }

    @Test
    fun `getProductBySKU returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val result = service().getProductBySKU("NOPE") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `getProductsByCategory returns list when found`() {
        runBlocking {
            stubCategoryIds() // Arrange
            whenever(mockConnection.prepareStatement(contains("INNER JOIN product_categories"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            stubProductResultSet(mockResultSet) // Arrange
            val result = service().getProductsByCategory("cat-1") // Act
            assertEquals(1, result.size) // Assert
            assertEquals("SKU-1", result[0].SKU) // Assert
        }
    }

    @Test
    fun `getProductsByCategory returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val result = service().getProductsByCategory("cat-404") // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `addProduct returns null if invalid data`() {
        runBlocking {
            val invalid = Product(name = " ", minStockThreshold = -1, maxStockThreshold = 0) // Arrange
            val result = service().addProduct(invalid) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `addProduct throws if SKU already exists`() {
        runBlocking {
            val newProduct = Product(SKU = "SKU-1", name = "Prod1", categoryIds = listOf("cat-1")) // Arrange
            val skuCheckStatement: PreparedStatement = mock() // Arrange
            val skuCheckResultSet: ResultSet = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE SKU = ?"))).thenReturn(skuCheckStatement) // Arrange
            whenever(skuCheckStatement.executeQuery()).thenReturn(skuCheckResultSet) // Arrange
            whenever(skuCheckResultSet.next()).thenReturn(true) // Arrange
            stubProductResultSet(skuCheckResultSet, id = "existing-id", sku = "SKU-1") // Arrange
            stubCategoryIds() // Arrange
            assertFailsWith<DuplicateProductSkuException> { service().addProduct(newProduct) } // Act
        }
    }

    @Test
    fun `addProduct returns new ID on success`() {
        runBlocking {
            val newProduct = Product(SKU = "SKU-NEW", name = "New Product", categoryIds = listOf("cat-1")) // Arrange
            val skuCheckStatement: PreparedStatement = mock() // Arrange
            val insertStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE SKU = ?"))).thenReturn(skuCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO products"))).thenReturn(insertStatement) // Arrange
            stubCategoryIds() // Arrange
            val skuCheckResultSet: ResultSet = mock() // Arrange
            whenever(skuCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(skuCheckStatement.executeQuery()).thenReturn(skuCheckResultSet) // Arrange
            whenever(insertStatement.executeUpdate()).thenReturn(1) // Arrange
            val result = service().addProduct(newProduct) // Act
            assertNotNull(result) // Assert
            assertTrue(result!!.isNotBlank()) // Assert
        }
    }

    @Test
    fun `addProduct succeeds with null SKU and description`() {
        runBlocking {
            val newProduct = Product(name = "No SKU Product") // Arrange
            val insertStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO products"))).thenReturn(insertStatement) // Arrange
            stubCategoryIds() // Arrange
            whenever(insertStatement.executeUpdate()).thenReturn(1) // Arrange
            val result = service().addProduct(newProduct) // Act
            assertNotNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(contains("WHERE SKU = ?")) // Assert
        }
    }

    @Test
    fun `addProduct succeeds with blank SKU and does not check uniqueness`() {
        runBlocking {
            val newProduct = Product(SKU = "   ", name = "Blank SKU Product") // Arrange
            val insertStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO products"))).thenReturn(insertStatement) // Arrange
            stubCategoryIds() // Arrange
            whenever(insertStatement.executeUpdate()).thenReturn(1) // Arrange
            val result = service().addProduct(newProduct) // Act
            assertNotNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(contains("WHERE SKU = ?")) // Assert
        }
    }

    @Test
    fun `addProduct returns new ID when categoryIds is empty`() {
        runBlocking {
            val newProduct = Product(SKU = "SKU-NO-CAT", name = "New Product") // Arrange
            val skuCheckStatement: PreparedStatement = mock() // Arrange
            val insertStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE SKU = ?"))).thenReturn(skuCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO products"))).thenReturn(insertStatement) // Arrange
            stubCategoryIds() // Arrange
            val skuCheckResultSet: ResultSet = mock() // Arrange
            whenever(skuCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(skuCheckStatement.executeQuery()).thenReturn(skuCheckResultSet) // Arrange
            whenever(insertStatement.executeUpdate()).thenReturn(1) // Arrange
            val result = service().addProduct(newProduct) // Act
            assertNotNull(result) // Assert
            assertTrue(result!!.isNotBlank()) // Assert
            verify(mockCatStatement, never()).addBatch() // Assert
        }
    }

    @Test
    fun `addProduct returns null when database insert fails`() {
        runBlocking {
            val newProduct = Product(SKU = "SKU-NEW", name = "New Product", categoryIds = listOf("cat-1")) // Arrange
            val skuCheckStatement: PreparedStatement = mock() // Arrange
            val insertStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE SKU = ?"))).thenReturn(skuCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO products"))).thenReturn(insertStatement) // Arrange
            val skuCheckResultSet: ResultSet = mock() // Arrange
            whenever(skuCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(skuCheckStatement.executeQuery()).thenReturn(skuCheckResultSet) // Arrange
            whenever(insertStatement.executeUpdate()).thenReturn(0) // Arrange
            val result = service().addProduct(newProduct) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addProduct sets hasVariants as integer in statement`() {
        runBlocking {
            val newProduct = Product(name = "Variant Product", hasVariants = true) // Arrange
            val insertStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO products"))).thenReturn(insertStatement) // Arrange
            stubCategoryIds() // Arrange
            whenever(insertStatement.executeUpdate()).thenReturn(1) // Arrange
            service().addProduct(newProduct) // Act
            verify(insertStatement).setInt(8, 1) // Assert — hasVariants = true → 1
        }
    }

    @Test
    fun `updateProduct returns false if ID is null`() {
        runBlocking {
            val productWithNullId = Product(id = null, name = "Name") // Arrange
            val result = service().updateProduct(productWithNullId) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `updateProduct returns false if invalid data`() {
        runBlocking {
            val invalid = Product(id = "p-1", name = " ", minStockThreshold = -1, maxStockThreshold = -1) // Arrange
            val result = service().updateProduct(invalid) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateProduct throws if SKU belongs to another product`() {
        runBlocking {
            val toUpdate = Product(id = "p-1", SKU = "SKU-TAKEN", name = "New Name", categoryIds = listOf("cat-1")) // Arrange
            val skuCheckStatement: PreparedStatement = mock() // Arrange
            val skuCheckResultSet: ResultSet = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE SKU = ?"))).thenReturn(skuCheckStatement) // Arrange
            whenever(skuCheckStatement.executeQuery()).thenReturn(skuCheckResultSet) // Arrange
            whenever(skuCheckResultSet.next()).thenReturn(true) // Arrange
            stubProductResultSet(skuCheckResultSet, id = "another-id", sku = "SKU-TAKEN", name = "Other") // Arrange
            stubCategoryIds() // Arrange
            assertFailsWith<DuplicateProductSkuException> { service().updateProduct(toUpdate) } // Act
            verify(mockConnection, never()).prepareStatement(contains("UPDATE products")) // Assert
        }
    }

    @Test
    fun `updateProduct returns true on success`() {
        runBlocking {
            val toUpdate = Product(id = "p-1", SKU = "SKU-OK", name = "Updated", categoryIds = listOf("cat-1")) // Arrange
            val skuCheckStatement: PreparedStatement = mock() // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE SKU = ?"))).thenReturn(skuCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(updateStatement) // Arrange
            stubCategoryIds() // Arrange
            val skuCheckResultSet: ResultSet = mock() // Arrange
            whenever(skuCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(skuCheckStatement.executeQuery()).thenReturn(skuCheckResultSet) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(1) // Arrange
            val result = service().updateProduct(toUpdate) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `updateProduct succeeds with null SKU`() {
        runBlocking {
            val toUpdate = Product(id = "p-1", SKU = null, name = "Updated No SKU", description = "Now no SKU") // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(updateStatement) // Arrange
            stubCategoryIds() // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(1) // Arrange
            val result = service().updateProduct(toUpdate) // Act
            assertTrue(result) // Assert
            verify(mockConnection, never()).prepareStatement(contains("WHERE SKU = ?")) // Assert
        }
    }

    @Test
    fun `updateProduct returns true when categoryIds is empty`() {
        runBlocking {
            val toUpdate = Product(id = "p-1", SKU = "SKU-1", name = "Updated Name") // Arrange
            val skuCheckStatement: PreparedStatement = mock() // Arrange
            val skuCheckResultSet: ResultSet = mock() // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE SKU = ?"))).thenReturn(skuCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(updateStatement) // Arrange
            stubCategoryIds() // Arrange
            whenever(skuCheckStatement.executeQuery()).thenReturn(skuCheckResultSet) // Arrange
            whenever(skuCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(1) // Arrange
            whenever(mockCatStatement.executeUpdate()).thenReturn(1) // Arrange
            val result = service().updateProduct(toUpdate) // Act
            assertTrue(result) // Assert
            verify(mockCatStatement, never()).addBatch() // Assert
        }
    }

    @Test
    fun `updateProduct returns false when database update fails`() {
        runBlocking {
            val toUpdate = Product(id = "p-1", SKU = "SKU-OK", name = "Updated", categoryIds = listOf("cat-1")) // Arrange
            val skuCheckStatement: PreparedStatement = mock() // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE SKU = ?"))).thenReturn(skuCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(updateStatement) // Arrange
            val skuCheckResultSet: ResultSet = mock() // Arrange
            whenever(skuCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(skuCheckStatement.executeQuery()).thenReturn(skuCheckResultSet) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(0) // Arrange
            val result = service().updateProduct(toUpdate) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `deleteProduct returns true on success`() {
        runBlocking {
            val deleteStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products SET is_deleted"))).thenReturn(deleteStatement) // Arrange
            whenever(deleteStatement.executeUpdate()).thenReturn(1) // Arrange
            val result = service().deleteProduct("p-1") // Act
            assertTrue(result) // Assert
            verify(deleteStatement).setString(1, "DELETED-p-1") // Assert
            verify(deleteStatement).setString(2, "p-1") // Assert
        }
    }

    @Test
    fun `deleteProduct returns false when not updated`() {
        runBlocking {
            val deleteStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products SET is_deleted"))).thenReturn(deleteStatement) // Arrange
            whenever(deleteStatement.executeUpdate()).thenReturn(0) // Arrange
            val result = service().deleteProduct("not-found") // Act
            assertFalse(result) // Assert
            verify(deleteStatement).setString(1, "DELETED-not-found") // Assert
            verify(deleteStatement).setString(2, "not-found") // Assert
        }
    }
}
