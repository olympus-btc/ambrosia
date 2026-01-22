package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.*
import pos.ambrosia.models.Product
import pos.ambrosia.models.ProductStockAdjustment
import pos.ambrosia.services.ProductService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.*

class ProductServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    @Test
    fun `getProducts returns list when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("p-1").thenReturn("p-2") // Arrange
            whenever(mockResultSet.getString("SKU")).thenReturn("SKU-1").thenReturn("SKU-2") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("Prod1").thenReturn("Prod2") // Arrange
            whenever(mockResultSet.getInt("cost_cents")).thenReturn(100).thenReturn(250) // Arrange
            whenever(mockResultSet.getString("category_id")).thenReturn("cat-1").thenReturn("cat-2") // Arrange
            whenever(mockResultSet.getInt("quantity")).thenReturn(5).thenReturn(10) // Arrange
            whenever(mockResultSet.getInt("min_stock_threshold")).thenReturn(1).thenReturn(2) // Arrange
            whenever(mockResultSet.getInt("max_stock_threshold")).thenReturn(10).thenReturn(20) // Arrange
            whenever(mockResultSet.getInt("price_cents")).thenReturn(199).thenReturn(499) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.getProducts() // Act
            assertEquals(2, result.size) // Assert
            assertEquals("SKU-1", result[0].SKU) // Assert
            assertEquals(499, result[1].price_cents) // Assert
        }
    }

    @Test
    fun `getProducts returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.getProducts() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getProductById returns product when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("p-1") // Arrange
            whenever(mockResultSet.getString("SKU")).thenReturn("SKU-1") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("Prod1") // Arrange
            whenever(mockResultSet.getInt("cost_cents")).thenReturn(100) // Arrange
            whenever(mockResultSet.getString("category_id")).thenReturn("cat-1") // Arrange
            whenever(mockResultSet.getInt("quantity")).thenReturn(5) // Arrange
            whenever(mockResultSet.getInt("min_stock_threshold")).thenReturn(1) // Arrange
            whenever(mockResultSet.getInt("max_stock_threshold")).thenReturn(10) // Arrange
            whenever(mockResultSet.getInt("price_cents")).thenReturn(199) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.getProductById("p-1") // Act
            assertNotNull(result) // Assert
            assertEquals("SKU-1", result!!.SKU) // Assert
        }
    }

    @Test
    fun `getProductById returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.getProductById("missing") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `getProductBySKU returns product when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("p-1") // Arrange
            whenever(mockResultSet.getString("SKU")).thenReturn("SKU-1") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("Prod1") // Arrange
            whenever(mockResultSet.getInt("cost_cents")).thenReturn(100) // Arrange
            whenever(mockResultSet.getString("category_id")).thenReturn("cat-1") // Arrange
            whenever(mockResultSet.getInt("quantity")).thenReturn(5) // Arrange
            whenever(mockResultSet.getInt("min_stock_threshold")).thenReturn(1) // Arrange
            whenever(mockResultSet.getInt("max_stock_threshold")).thenReturn(10) // Arrange
            whenever(mockResultSet.getInt("price_cents")).thenReturn(199) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.getProductBySKU("SKU-1") // Act
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
            val service = ProductService(mockConnection) // Arrange
            val result = service.getProductBySKU("NOPE") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `getProductsByCategory returns list when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("p-1") // Arrange
            whenever(mockResultSet.getString("SKU")).thenReturn("SKU-1") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("Prod1") // Arrange
            whenever(mockResultSet.getInt("cost_cents")).thenReturn(100) // Arrange
            whenever(mockResultSet.getString("category_id")).thenReturn("cat-1") // Arrange
            whenever(mockResultSet.getInt("quantity")).thenReturn(5) // Arrange
            whenever(mockResultSet.getInt("min_stock_threshold")).thenReturn(1) // Arrange
            whenever(mockResultSet.getInt("max_stock_threshold")).thenReturn(10) // Arrange
            whenever(mockResultSet.getInt("price_cents")).thenReturn(199) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.getProductsByCategory("cat-1") // Act
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
            val service = ProductService(mockConnection) // Arrange
            val result = service.getProductsByCategory("cat-404") // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `addProduct returns null if invalid data`() {
        runBlocking {
            val invalid = Product(
                id = null,
                SKU = " ",
                name = "",
                description = null,
                image_url = null,
                cost_cents = -1,
                category_id = "",
                quantity = -5,
                min_stock_threshold = -1,
                max_stock_threshold = -1,
                price_cents = -10
            ) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.addProduct(invalid) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addProduct returns null if SKU already exists`() {
        runBlocking {
            val newProduct = Product(null, "SKU-1", "Prod1", null, null, 100, "cat-1", 5, 1, 10, 199) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            // Return a complete existing product row for mapping
            whenever(mockResultSet.getString("id")).thenReturn("existing-id") // Arrange
            whenever(mockResultSet.getString("SKU")).thenReturn("SKU-1") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("Existing Product") // Arrange
            whenever(mockResultSet.getInt("cost_cents")).thenReturn(100) // Arrange
            whenever(mockResultSet.getString("category_id")).thenReturn("cat-1") // Arrange
            whenever(mockResultSet.getInt("quantity")).thenReturn(10) // Arrange
            whenever(mockResultSet.getInt("min_stock_threshold")).thenReturn(1) // Arrange
            whenever(mockResultSet.getInt("max_stock_threshold")).thenReturn(10) // Arrange
            whenever(mockResultSet.getInt("price_cents")).thenReturn(199) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.addProduct(newProduct) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addProduct returns new ID on success`() {
        runBlocking {
            val newProduct = Product(null, "SKU-NEW", "New Product", null, null, 100, "cat-1", 5, 1, 10, 199) // Arrange
            val skuCheckStatement: PreparedStatement = mock() // Arrange
            val insertStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE SKU = ?"))).thenReturn(skuCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO products"))).thenReturn(insertStatement) // Arrange
            val skuCheckResultSet: ResultSet = mock() // Arrange
            whenever(skuCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(skuCheckStatement.executeQuery()).thenReturn(skuCheckResultSet) // Arrange
            whenever(insertStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.addProduct(newProduct) // Act
            assertNotNull(result) // Assert
            assertTrue(result!!.isNotBlank()) // Assert
        }
    }

    @Test
    fun `addProduct returns null when database insert fails`() {
        runBlocking {
            val newProduct = Product(null, "SKU-NEW", "New Product", null, null, 100, "cat-1", 5, 1, 10, 199) // Arrange
            val skuCheckStatement: PreparedStatement = mock() // Arrange
            val insertStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE SKU = ?"))).thenReturn(skuCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO products"))).thenReturn(insertStatement) // Arrange
            val skuCheckResultSet: ResultSet = mock() // Arrange
            whenever(skuCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(skuCheckStatement.executeQuery()).thenReturn(skuCheckResultSet) // Arrange
            whenever(insertStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.addProduct(newProduct) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `updateProduct returns false if ID is null`() {
        runBlocking {
            val productWithNullId = Product(id = null, SKU = "SKU-1", name = "Name", description = null, image_url = null, cost_cents = 100, category_id = "cat-1", quantity = 1, min_stock_threshold = 0, max_stock_threshold = 0, price_cents = 100) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.updateProduct(productWithNullId) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `updateProduct returns false if invalid data`() {
        runBlocking {
            val invalid = Product(id = "p-1", SKU = "", name = " ", description = null, image_url = null, cost_cents = -1, category_id = "", quantity = -1, min_stock_threshold = -1, max_stock_threshold = -1, price_cents = -1) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.updateProduct(invalid) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateProduct returns false if SKU belongs to another product`() {
        runBlocking {
            val toUpdate = Product(id = "p-1", SKU = "SKU-TAKEN", name = "New Name", description = null, image_url = null, cost_cents = 100, category_id = "cat-1", quantity = 5, min_stock_threshold = 1, max_stock_threshold = 10, price_cents = 250) // Arrange
            val skuCheckStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE SKU = ?"))).thenReturn(skuCheckStatement) // Arrange
            val skuCheckResultSet: ResultSet = mock() // Arrange
            whenever(skuCheckResultSet.next()).thenReturn(true) // Arrange
            whenever(skuCheckResultSet.getString("id")).thenReturn("another-id") // Arrange
            whenever(skuCheckResultSet.getString("SKU")).thenReturn("SKU-TAKEN") // Arrange
            whenever(skuCheckResultSet.getString("name")).thenReturn("Other") // Arrange
            whenever(skuCheckResultSet.getInt("cost_cents")).thenReturn(50) // Arrange
            whenever(skuCheckResultSet.getString("category_id")).thenReturn("cat-9") // Arrange
            whenever(skuCheckResultSet.getInt("quantity")).thenReturn(1) // Arrange
            whenever(skuCheckResultSet.getInt("min_stock_threshold")).thenReturn(1) // Arrange
            whenever(skuCheckResultSet.getInt("max_stock_threshold")).thenReturn(5) // Arrange
            whenever(skuCheckResultSet.getInt("price_cents")).thenReturn(99) // Arrange
            whenever(skuCheckStatement.executeQuery()).thenReturn(skuCheckResultSet) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.updateProduct(toUpdate) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(contains("UPDATE products")) // Assert
        }
    }

    @Test
    fun `updateProduct returns true on success`() {
        runBlocking {
            val toUpdate = Product(id = "p-1", SKU = "SKU-OK", name = "Updated", description = null, image_url = null, cost_cents = 100, category_id = "cat-1", quantity = 5, min_stock_threshold = 1, max_stock_threshold = 10, price_cents = 250) // Arrange
            val skuCheckStatement: PreparedStatement = mock() // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE SKU = ?"))).thenReturn(skuCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(updateStatement) // Arrange
            val skuCheckResultSet: ResultSet = mock() // Arrange
            whenever(skuCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(skuCheckStatement.executeQuery()).thenReturn(skuCheckResultSet) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.updateProduct(toUpdate) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `updateProduct returns false when database update fails`() {
        runBlocking {
            val toUpdate = Product(id = "p-1", SKU = "SKU-OK", name = "Updated", description = null, image_url = null, cost_cents = 100, category_id = "cat-1", quantity = 5, min_stock_threshold = 1, max_stock_threshold = 10, price_cents = 250) // Arrange
            val skuCheckStatement: PreparedStatement = mock() // Arrange
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("WHERE SKU = ?"))).thenReturn(skuCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products"))).thenReturn(updateStatement) // Arrange
            val skuCheckResultSet: ResultSet = mock() // Arrange
            whenever(skuCheckResultSet.next()).thenReturn(false) // Arrange
            whenever(skuCheckStatement.executeQuery()).thenReturn(skuCheckResultSet) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.updateProduct(toUpdate) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `deleteProduct returns true on success`() {
        runBlocking {
            val deleteStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products SET is_deleted"))).thenReturn(deleteStatement) // Arrange
            whenever(deleteStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.deleteProduct("p-1") // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `deleteProduct returns false when not updated`() {
        runBlocking {
            val deleteStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products SET is_deleted"))).thenReturn(deleteStatement) // Arrange
            whenever(deleteStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val result = service.deleteProduct("not-found") // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `adjustStock returns true when all updates succeed`() {
        runBlocking {
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products SET quantity = quantity -"))).thenReturn(updateStatement) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val adjustments = listOf(
                ProductStockAdjustment(product_id = "p-1", quantity = 2),
                ProductStockAdjustment(product_id = "p-2", quantity = 1),
            )
            val result = service.adjustStock(adjustments) // Act
            assertTrue(result) // Assert
            verify(mockConnection).commit() // Assert
        }
    }

    @Test
    fun `adjustStock returns false when update fails`() {
        runBlocking {
            val updateStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE products SET quantity = quantity -"))).thenReturn(updateStatement) // Arrange
            whenever(updateStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = ProductService(mockConnection) // Arrange
            val adjustments = listOf(ProductStockAdjustment(product_id = "p-1", quantity = 2))
            val result = service.adjustStock(adjustments) // Act
            assertFalse(result) // Assert
            verify(mockConnection).rollback() // Assert
        }
    }
}
