package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.models.Dish
import pos.ambrosia.services.DishService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DishServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    @Test
    fun `getDishes returns list of dishes when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("dish-1").thenReturn("dish-2") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("Pizza").thenReturn("Pasta") // Arrange
            whenever(mockResultSet.getDouble("price")).thenReturn(12.99).thenReturn(10.50) // Arrange
            whenever(mockResultSet.getString("category_id")).thenReturn("cat-1").thenReturn("cat-1") // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.getDishes() // Act
            assertEquals(2, result.size) // Assert
            assertEquals("Pizza", result[0].name) // Assert
            assertEquals(10.50, result[1].price) // Assert
        }
    }

    @Test
    fun `getDishes returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.getDishes() // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `getDishById returns dish when found`() {
        runBlocking {
            val expectedDish = Dish(id = "dish-1", name = "Pizza", price = 12.99, category_id = "cat-1") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn(expectedDish.id) // Arrange
            whenever(mockResultSet.getString("name")).thenReturn(expectedDish.name) // Arrange
            whenever(mockResultSet.getDouble("price")).thenReturn(expectedDish.price) // Arrange
            whenever(mockResultSet.getString("category_id")).thenReturn(expectedDish.category_id) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.getDishById("dish-1") // Act
            assertNotNull(result) // Assert
            assertEquals(expectedDish, result) // Assert
        }
    }

    @Test
    fun `getDishById returns null when not found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.getDishById("not-found-id") // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `getDishesByCategory returns dishes when found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(false) // Arrange
            whenever(mockResultSet.getString("id")).thenReturn("dish-1") // Arrange
            whenever(mockResultSet.getString("name")).thenReturn("Pizza") // Arrange
            whenever(mockResultSet.getDouble("price")).thenReturn(12.99) // Arrange
            whenever(mockResultSet.getString("category_id")).thenReturn("cat-1") // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.getDishesByCategory("cat-1") // Act
            assertEquals(1, result.size) // Assert
            assertEquals("Pizza", result[0].name) // Assert
        }
    }

    @Test
    fun `getDishesByCategory returns empty list when none found`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.getDishesByCategory("cat-2") // Act
            assertTrue(result.isEmpty()) // Assert
        }
    }

    @Test
    fun `addDish returns null if category does not exist`() {
        runBlocking {
            val newDish = Dish(id = null, name = "New Dish", price = 10.0, category_id = "non-existent-cat") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.addDish(newDish) // Act
            assertNull(result) // Assert
            verify(mockConnection, never()).prepareStatement(contains("INSERT INTO")) // Assert
        }
    }

    @Test
    fun `addDish returns null if name is blank`() {
        runBlocking {
            val dishWithBlankName = Dish(id = null, name = "  ", price = 10.0, category_id = "cat-1") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.addDish(dishWithBlankName) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addDish returns null if price is invalid`() {
        runBlocking {
            val dishWithInvalidPrice = Dish(id = null, name = "Fries", price = 0.0, category_id = "cat-1") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.addDish(dishWithInvalidPrice) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `addDish returns new ID on success`() {
        runBlocking {
            val newDish = Dish(id = null, name = "New Dish", price = 15.0, category_id = "cat-1") // Arrange
            val categoryCheckStatement: PreparedStatement = mock() // Arrange
            val addDishStatement: PreparedStatement = mock() // Arrange
            whenever(
                mockConnection.prepareStatement(contains("SELECT id FROM categories WHERE id = ? AND type = 'dish'")),
            ).thenReturn(categoryCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO dishes"))).thenReturn(addDishStatement) // Arrange
            val categoryCheckResultSet: ResultSet = mock() // Arrange
            whenever(categoryCheckResultSet.next()).thenReturn(true) // Arrange
            whenever(categoryCheckStatement.executeQuery()).thenReturn(categoryCheckResultSet) // Arrange
            whenever(addDishStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.addDish(newDish) // Act
            assertNotNull(result) // Assert
            assertTrue(result.isNotBlank()) // Assert
        }
    }

    @Test
    fun `addDish returns null when database insert fails`() {
        runBlocking {
            val newDish = Dish(id = null, name = "New Dish", price = 15.0, category_id = "cat-1") // Arrange
            val categoryCheckStatement: PreparedStatement = mock() // Arrange
            val addDishStatement: PreparedStatement = mock() // Arrange
            whenever(
                mockConnection.prepareStatement(contains("SELECT id FROM categories WHERE id = ? AND type = 'dish'")),
            ).thenReturn(categoryCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("INSERT INTO dishes"))).thenReturn(addDishStatement) // Arrange
            val categoryCheckResultSet: ResultSet = mock() // Arrange
            whenever(categoryCheckResultSet.next()).thenReturn(true) // Arrange
            whenever(categoryCheckStatement.executeQuery()).thenReturn(categoryCheckResultSet) // Arrange
            whenever(addDishStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.addDish(newDish) // Act
            assertNull(result) // Assert
        }
    }

    @Test
    fun `updateDish returns false if ID is null`() {
        runBlocking {
            val dishWithNullId = Dish(id = null, name = "A Name", price = 10.0, category_id = "cat-1") // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.updateDish(dishWithNullId) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(any()) // Assert
        }
    }

    @Test
    fun `updateDish returns false if category does not exist`() {
        runBlocking {
            val dishToUpdate = Dish(id = "dish-1", name = "A Name", price = 10.0, category_id = "non-existent-cat") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(false) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.updateDish(dishToUpdate) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateDish returns false if name is blank`() {
        runBlocking {
            val dishWithBlankName = Dish(id = "dish-1", name = "  ", price = 10.0, category_id = "cat-1") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.updateDish(dishWithBlankName) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateDish returns false if price is invalid`() {
        runBlocking {
            val dishWithInvalidPrice = Dish(id = "dish-1", name = "Fries", price = -5.0, category_id = "cat-1") // Arrange
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement) // Arrange
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet) // Arrange
            whenever(mockResultSet.next()).thenReturn(true) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.updateDish(dishWithInvalidPrice) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `updateDish returns true on success`() {
        runBlocking {
            val dishToUpdate = Dish(id = "dish-1", name = "Updated Dish", price = 20.0, category_id = "cat-1") // Arrange
            val categoryCheckStatement: PreparedStatement = mock() // Arrange
            val updateDishStatement: PreparedStatement = mock() // Arrange
            whenever(
                mockConnection.prepareStatement(contains("SELECT id FROM categories WHERE id = ? AND type = 'dish'")),
            ).thenReturn(categoryCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE dishes"))).thenReturn(updateDishStatement) // Arrange
            val categoryCheckResultSet: ResultSet = mock() // Arrange
            whenever(categoryCheckResultSet.next()).thenReturn(true) // Arrange
            whenever(categoryCheckStatement.executeQuery()).thenReturn(categoryCheckResultSet) // Arrange
            whenever(updateDishStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.updateDish(dishToUpdate) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `updateDish returns false when database update fails`() {
        runBlocking {
            val dishToUpdate = Dish(id = "dish-1", name = "Updated Dish", price = 20.0, category_id = "cat-1") // Arrange
            val categoryCheckStatement: PreparedStatement = mock() // Arrange
            val updateDishStatement: PreparedStatement = mock() // Arrange
            whenever(
                mockConnection.prepareStatement(contains("SELECT id FROM categories WHERE id = ? AND type = 'dish'")),
            ).thenReturn(categoryCheckStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE dishes"))).thenReturn(updateDishStatement) // Arrange
            val categoryCheckResultSet: ResultSet = mock() // Arrange
            whenever(categoryCheckResultSet.next()).thenReturn(true) // Arrange
            whenever(categoryCheckStatement.executeQuery()).thenReturn(categoryCheckResultSet) // Arrange
            whenever(updateDishStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.updateDish(dishToUpdate) // Act
            assertFalse(result) // Assert
        }
    }

    @Test
    fun `deleteDish returns false if dish is in use`() {
        runBlocking {
            val dishId = "dish-1" // Arrange
            val checkInUseStatement: PreparedStatement = mock() // Arrange
            val deleteStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT COUNT(*)"))).thenReturn(checkInUseStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE dishes SET is_deleted"))).thenReturn(deleteStatement) // Arrange
            val checkInUseResultSet: ResultSet = mock() // Arrange
            whenever(checkInUseResultSet.next()).thenReturn(true) // Arrange
            whenever(checkInUseResultSet.getInt("count")).thenReturn(1) // Arrange
            whenever(checkInUseStatement.executeQuery()).thenReturn(checkInUseResultSet) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.deleteDish(dishId) // Act
            assertFalse(result) // Assert
            verify(mockConnection, never()).prepareStatement(contains("UPDATE dishes SET is_deleted")) // Assert
        }
    }

    @Test
    fun `deleteDish returns true on success`() {
        runBlocking {
            val dishId = "dish-1" // Arrange
            val checkInUseStatement: PreparedStatement = mock() // Arrange
            val deleteStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT COUNT(*)"))).thenReturn(checkInUseStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE dishes SET is_deleted"))).thenReturn(deleteStatement) // Arrange
            val checkInUseResultSet: ResultSet = mock() // Arrange
            whenever(checkInUseResultSet.next()).thenReturn(true) // Arrange
            whenever(checkInUseResultSet.getInt("count")).thenReturn(0) // Arrange
            whenever(checkInUseStatement.executeQuery()).thenReturn(checkInUseResultSet) // Arrange
            whenever(deleteStatement.executeUpdate()).thenReturn(1) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.deleteDish(dishId) // Act
            assertTrue(result) // Assert
        }
    }

    @Test
    fun `deleteDish returns false if dish id does not exist`() {
        runBlocking {
            val dishId = "non-existent-id" // Arrange
            val checkInUseStatement: PreparedStatement = mock() // Arrange
            val deleteStatement: PreparedStatement = mock() // Arrange
            whenever(mockConnection.prepareStatement(contains("SELECT COUNT(*)"))).thenReturn(checkInUseStatement) // Arrange
            whenever(mockConnection.prepareStatement(contains("UPDATE dishes SET is_deleted"))).thenReturn(deleteStatement) // Arrange
            val checkInUseResultSet: ResultSet = mock() // Arrange
            whenever(checkInUseResultSet.next()).thenReturn(true) // Arrange
            whenever(checkInUseResultSet.getInt("count")).thenReturn(0) // Arrange
            whenever(checkInUseStatement.executeQuery()).thenReturn(checkInUseResultSet) // Arrange
            whenever(deleteStatement.executeUpdate()).thenReturn(0) // Arrange
            val service = DishService(mockConnection) // Arrange
            val result = service.deleteDish(dishId) // Act
            assertFalse(result) // Assert
        }
    }
}
