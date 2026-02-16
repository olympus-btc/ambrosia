package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.*
import pos.ambrosia.models.CategoryItem
import pos.ambrosia.services.CategoryService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.*

class CategoryServiceTest {
    private val mockConnection: Connection = mock()
    private val mockStatement: PreparedStatement = mock()
    private val mockResultSet: ResultSet = mock()

    @Test
    fun `getCategories returns list for product`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(any())).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(true).thenReturn(true).thenReturn(false)
            whenever(mockResultSet.getString("id")).thenReturn("cat-1").thenReturn("cat-2")
            whenever(mockResultSet.getString("name")).thenReturn("Bebidas").thenReturn("Postres")

            val service = CategoryService(mockConnection)
            val result = service.getCategories("product")
            assertEquals(2, result.size)
            assertEquals("Bebidas", result[0].name)
            assertEquals("Postres", result[1].name)
        }
    }

    @Test
    fun `addCategory validates and inserts product`() {
        runBlocking {
            val checkNameStatement: PreparedStatement = mock()
            val insertStatement: PreparedStatement = mock()
            val checkNameResultSet: ResultSet = mock()

            whenever(mockConnection.prepareStatement(contains("SELECT id FROM categories"))).thenReturn(checkNameStatement)
            whenever(mockConnection.prepareStatement(contains("INSERT INTO categories"))).thenReturn(insertStatement)

            whenever(checkNameResultSet.next()).thenReturn(false)
            whenever(checkNameStatement.executeQuery()).thenReturn(checkNameResultSet)
            whenever(insertStatement.executeUpdate()).thenReturn(1)

            val service = CategoryService(mockConnection)
            val id = service.addCategory("product", CategoryItem(name = "Lácteos"))
            assertNotNull(id)
        }
    }

    @Test
    fun `updateCategory rejects duplicate names`() {
        runBlocking {
            whenever(mockConnection.prepareStatement(contains("SELECT id FROM categories"))).thenReturn(mockStatement)
            whenever(mockStatement.executeQuery()).thenReturn(mockResultSet)
            whenever(mockResultSet.next()).thenReturn(true)

            val service = CategoryService(mockConnection)
            val ok = service.updateCategory("product", CategoryItem(id = "cat-1", name = "Duplicado"))
            assertFalse(ok)
        }
    }

    @Test
    fun `deleteCategory checks product usage`() {
        runBlocking {
            val usageStatement: PreparedStatement = mock()
            val deleteStatement: PreparedStatement = mock()
            val usageResultSet: ResultSet = mock()

            whenever(mockConnection.prepareStatement(contains("SELECT COUNT(*) as count FROM products"))).thenReturn(usageStatement)
            whenever(mockConnection.prepareStatement(contains("UPDATE categories SET is_deleted"))).thenReturn(deleteStatement)

            whenever(usageResultSet.next()).thenReturn(true)
            whenever(usageResultSet.getInt("count")).thenReturn(0)
            whenever(usageStatement.executeQuery()).thenReturn(usageResultSet)
            whenever(deleteStatement.executeUpdate()).thenReturn(1)

            val service = CategoryService(mockConnection)
            val ok = service.deleteCategory("cat-1", "product")
            assertTrue(ok)
        }
    }
}
