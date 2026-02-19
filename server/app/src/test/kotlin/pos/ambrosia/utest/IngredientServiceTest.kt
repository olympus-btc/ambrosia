package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.models.Ingredient
import pos.ambrosia.services.IngredientService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class IngredientServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    @Test
    fun `getIngredients returns list of ingredients when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("ing-1").thenReturn("ing-2") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("Tomatoes").thenReturn("Cheese") // Arrange
            whenever(mockResultSet.getString("category_id")).thenReturn("cat-veg").thenReturn("cat-dairy") // Arrange
            whenever(mockResultSet.getDouble("quantity")).thenReturn(10.5).thenReturn(5.0) // Arrange
            whenever(mockResultSet.getString("unit")).thenReturn("kg").thenReturn("kg") // Arrange
            whenever(mockResultSet.getDouble("low_stock_threshold")).thenReturn(2.0).thenReturn(1.0) // Arrange
            whenever(mockResultSet.getDouble("cost_per_unit")).thenReturn(3.50).thenReturn(8.0) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.getIngredients() // Act
            assertEquals(2, result.size) // Assert
            assertEquals("Tomatoes", result[0].name) // Assert
            assertEquals(5.0, result[1].quantity) // Assert
        }
    }

    @Test
    fun `getIngredients returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.getIngredients() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getIngredientById returns ingredient when found`() {
        runBlocking {
            val expectedIngredient = Ingredient("ing-1", "Tomatoes", "cat-veg", 10.5, "kg", 2.0, 3.50) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn(expectedIngredient.id) // Arrange
            whenever(mockResultSet.getString("name")).thenReturn(expectedIngredient.name) // Arrange
            whenever(mockResultSet.getString("category_id")).thenReturn(expectedIngredient.category_id) // Arrange
            whenever(mockResultSet.getDouble("quantity")).thenReturn(expectedIngredient.quantity) // Arrange
            whenever(mockResultSet.getString("unit")).thenReturn(expectedIngredient.unit) // Arrange
            whenever(mockResultSet.getDouble("low_stock_threshold")).thenReturn(expectedIngredient.low_stock_threshold) // Arrange
            whenever(mockResultSet.getDouble("cost_per_unit")).thenReturn(expectedIngredient.cost_per_unit) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.getIngredientById("ing-1") // Act
            assertNotNull(result) // Assert
            assertEquals(expectedIngredient, result) // Assert
        }
    }

    @Test
    fun `getIngredientById returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.getIngredientById("not-found") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `getIngredientsByCategory returns ingredients when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("ing-1") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("Tomatoes") // Arrange
            whenever(mockResultSet.getString("category_id")).thenReturn("cat-veg") // Arrange
            whenever(mockResultSet.getDouble("quantity")).thenReturn(10.5) // Arrange
            whenever(mockResultSet.getString("unit")).thenReturn("kg") // Arrange
            whenever(mockResultSet.getDouble("low_stock_threshold")).thenReturn(2.0) // Arrange
            whenever(mockResultSet.getDouble("cost_per_unit")).thenReturn(3.50) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.getIngredientsByCategory("cat-veg") // Act
            assertEquals(1, result.size) // Assert
            assertEquals("Tomatoes", result[0].name) // Assert
        }
    }

    @Test
    fun `getIngredientsByCategory returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.getIngredientsByCategory("cat-dairy") // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `addIngredient returns null if category does not exist`() {
        runBlocking {
            val newIngredient = Ingredient(null, "Tomatoes", "non-existent-cat", 10.0, "kg", 1.0, 1.0) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.addIngredient(newIngredient) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(contains("INSERT INTO")) // Assert
        }
    }

    @Test
    fun `addIngredient returns null if name is blank`() {
        runBlocking {
            val ingredientWithBlankName = Ingredient(null, "  ", "cat-veg", 10.0, "kg", 1.0, 1.0) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.addIngredient(ingredientWithBlankName) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addIngredient returns null if quantity is invalid`() {
        runBlocking {
            val ingredientWithInvalidQuantity = Ingredient(null, "Tomatoes", "cat-veg", -5.0, "kg", 1.0, 1.0) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.addIngredient(ingredientWithInvalidQuantity) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addIngredient returns null if low stock threshold is invalid`() {
        runBlocking {
            val ingredientWithInvalidThreshold = Ingredient(null, "Tomatoes", "cat-veg", 10.0, "kg", -1.0, 1.0) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.addIngredient(ingredientWithInvalidThreshold) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addIngredient returns null if cost per unit is invalid`() {
        runBlocking {
            val ingredientWithInvalidCost = Ingredient(null, "Tomatoes", "cat-veg", 10.0, "kg", 1.0, -1.0) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.addIngredient(ingredientWithInvalidCost) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addIngredient returns new ID on success`() {
        runBlocking {
            val newIngredient = Ingredient(null, "New Ingredient", "cat-1", 15.0, "kg", 1.0, 1.0) // Arrange
            val categoryCheckStatement: PreparedStatement = mock() // Arrange
            val addIngredientStatement: PreparedStatement = mock() // Arrange
            whenever(
                mockConnection.prepareStatement(contains("SELECT id FROM categories WHERE id = ? AND type = 'ingredient'")),
            ).thenReturn(categoryCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO ingredients"))).thenReturn(addIngredientStatement) // Arrange
            val categoryCheckResultSet: ResultSet = mock() // Arrange
            whenever(categoryCheckResultSet.next()).thenReturn(true) // Arrange
            whenever(categoryCheckStatement.executeQuery()).thenReturn(categoryCheckResultSet) // Arrange
            whenever(addIngredientStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.addIngredient(newIngredient) // Act
            assertNotNull(result) // Assert
            assertTrue(result.isNotBlank()) // Assert
        }
    }

    @Test
    fun `addIngredient returns null when database insert fails`() {
        runBlocking {
            val newIngredient = Ingredient(null, "New Ingredient", "cat-1", 15.0, "kg", 1.0, 1.0) // Arrange
            val categoryCheckStatement: PreparedStatement = mock() // Arrange
            val addIngredientStatement: PreparedStatement = mock() // Arrange
            whenever(
                mockConnection.prepareStatement(contains("SELECT id FROM categories WHERE id = ? AND type = 'ingredient'")),
            ).thenReturn(categoryCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO ingredients"))).thenReturn(addIngredientStatement) // Arrange
            val categoryCheckResultSet: ResultSet = mock() // Arrange
            whenever(categoryCheckResultSet.next()).thenReturn(true) // Arrange
            whenever(categoryCheckStatement.executeQuery()).thenReturn(categoryCheckResultSet) // Arrange
            whenever(addIngredientStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.addIngredient(newIngredient) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `updateIngredient returns false if ID is null`() {
        runBlocking {
            val ingredientWithNullId = Ingredient(null, "A Name", "cat-1", 10.0, "kg", 1.0, 1.0) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.updateIngredient(ingredientWithNullId) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `updateIngredient returns false if category does not exist`() {
        runBlocking {
            val ingredientToUpdate = Ingredient("ing-1", "A Name", "non-existent-cat", 10.0, "kg", 1.0, 1.0) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.updateIngredient(ingredientToUpdate) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateIngredient returns false if name is blank`() {
        runBlocking {
            val ingredientWithBlankName = Ingredient("ing-1", "  ", "cat-1", 10.0, "kg", 1.0, 1.0) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.updateIngredient(ingredientWithBlankName) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateIngredient returns false if quantity is invalid`() {
        runBlocking {
            val ingredientWithInvalidQuantity = Ingredient("ing-1", "Tomatoes", "cat-veg", -5.0, "kg", 1.0, 1.0) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.updateIngredient(ingredientWithInvalidQuantity) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateIngredient returns false if low stock threshold is invalid`() {
        runBlocking {
            val ingredientWithInvalidThreshold = Ingredient("ing-1", "Tomatoes", "cat-veg", 10.0, "kg", -1.0, 1.0) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.updateIngredient(ingredientWithInvalidThreshold) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateIngredient returns false if cost per unit is invalid`() {
        runBlocking {
            val ingredientWithInvalidCost = Ingredient("ing-1", "Tomatoes", "cat-veg", 10.0, "kg", 1.0, -1.0) // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.updateIngredient(ingredientWithInvalidCost) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateIngredient returns true on success`() {
        runBlocking {
            val ingredientToUpdate = Ingredient("ing-1", "Updated Ingredient", "cat-1", 25.0, "g", 5.0, 0.5) // Arrange
            val categoryCheckStatement: PreparedStatement = mock() // Arrange
            val updateIngredientStatement: PreparedStatement = mock() // Arrange
            whenever(
                mockConnection.prepareStatement(contains("SELECT id FROM categories WHERE id = ? AND type = 'ingredient'")),
            ).thenReturn(categoryCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE ingredients"))).thenReturn(updateIngredientStatement) // Arrange
            val categoryCheckResultSet: ResultSet = mock() // Arrange
            whenever(categoryCheckResultSet.next()).thenReturn(true) // Arrange
            whenever(categoryCheckStatement.executeQuery()).thenReturn(categoryCheckResultSet) // Arrange
            whenever(updateIngredientStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.updateIngredient(ingredientToUpdate) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `updateIngredient returns false when database update fails`() {
        runBlocking {
            val ingredientToUpdate = Ingredient("ing-1", "Updated Ingredient", "cat-1", 25.0, "g", 5.0, 0.5) // Arrange
            val categoryCheckStatement: PreparedStatement = mock() // Arrange
            val updateIngredientStatement: PreparedStatement = mock() // Arrange
            whenever(
                mockConnection.prepareStatement(contains("SELECT id FROM categories WHERE id = ? AND type = 'ingredient'")),
            ).thenReturn(categoryCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE ingredients"))).thenReturn(updateIngredientStatement) // Arrange
            val categoryCheckResultSet: ResultSet = mock() // Arrange
            whenever(categoryCheckResultSet.next()).thenReturn(true) // Arrange
            whenever(categoryCheckStatement.executeQuery()).thenReturn(categoryCheckResultSet) // Arrange
            whenever(updateIngredientStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.updateIngredient(ingredientToUpdate) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `deleteIngredient returns false if ingredient is in use`() {
        runBlocking {
            val ingredientId = "ing-1" // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT COUNT(*)"))).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getInt("count")).thenReturn(1) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.deleteIngredient(ingredientId) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(contains("UPDATE ingredients SET is_deleted")) // Assert
        }
    }

    @Test
    fun `deleteIngredient returns true on success`() {
        runBlocking {
            val ingredientId = "ing-1" // Arrange
            val checkInUseStatement: PreparedStatement = mock() // Arrange
            val deleteStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT COUNT(*)"))).thenReturn(checkInUseStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE ingredients SET is_deleted"))).thenReturn(deleteStatement) // Arrange
            val checkInUseResultSet: ResultSet = mock() // Arrange
            whenever(checkInUseResultSet.next()).thenReturn(true) // Arrange
            whenever(checkInUseResultSet.getInt("count")).thenReturn(0) // Arrange
            whenever(checkInUseStatement.executeQuery()).thenReturn(checkInUseResultSet) // Arrange
            whenever(deleteStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.deleteIngredient(ingredientId) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `deleteIngredient returns false if ingredient id does not exist`() {
        runBlocking {
            val ingredientId = "non-existent-id" // Arrange
            val checkInUseStatement: PreparedStatement = mock() // Arrange
            val deleteStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT COUNT(*)"))).thenReturn(checkInUseStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE ingredients SET is_deleted"))).thenReturn(deleteStatement) // Arrange
            val checkInUseResultSet: ResultSet = mock() // Arrange
            whenever(checkInUseResultSet.next()).thenReturn(true) // Arrange
            whenever(checkInUseResultSet.getInt("count")).thenReturn(0) // Arrange
            whenever(checkInUseStatement.executeQuery()).thenReturn(checkInUseResultSet) // Arrange
            whenever(deleteStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.deleteIngredient(ingredientId) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `getLowStockIngredients returns list when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("ing-1") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("Flour") // Arrange
            whenever(mockResultSet.getString("category_id")).thenReturn("cat-dry") // Arrange
            whenever(mockResultSet.getDouble("quantity")).thenReturn(1.5) // Arrange
            whenever(mockResultSet.getString("unit")).thenReturn("kg") // Arrange
            whenever(mockResultSet.getDouble("low_stock_threshold")).thenReturn(2.0) // Arrange
            whenever(mockResultSet.getDouble("cost_per_unit")).thenReturn(1.0) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.getLowStockIngredients() // Act
            assertEquals(1, result.size) // Assert
            assertEquals("Flour", result[0].name) // Assert
        }
    }

    @Test
    fun `getLowStockIngredients returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.getLowStockIngredients() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `updateIngredientQuantity returns false if quantity is negative`() {
        runBlocking {
            val service = IngredientService(mockConnection) // Arrange
            val result = service.updateIngredientQuantity("ing-1", -1.0) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `updateIngredientQuantity returns true on success`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.updateIngredientQuantity("ing-1", 50.0) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `updateIngredientQuantity returns false when ingredient not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = IngredientService(mockConnection) // Arrange
            val result = service.updateIngredientQuantity("not-found-id", 50.0) // Act
            assertFalse(result) // Assert
        }
    }
}
