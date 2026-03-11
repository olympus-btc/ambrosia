package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.mockito.ArgumentMatchers.contains
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import pos.ambrosia.models.CategoryItem
import pos.ambrosia.services.CategoryService
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.ResultSet
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

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
            assertNotNull(result)
            assertEquals(2, result.size)
            assertEquals("Bebidas", result[0].name)
            assertEquals("Postres", result[1].name)
        }
    }

    @Test
    fun `getCategories returns null for invalid type`() {
        runBlocking {
            val service = CategoryService(mockConnection)
            val result = service.getCategories("invalid-type")
            assertTrue(result == null)
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
    fun `deleteCategory soft deletes category and clears product_categories`() {
        runBlocking {
            val clearStatement: PreparedStatement = mock()
            val deleteStatement: PreparedStatement = mock()

            whenever(mockConnection.prepareStatement(contains("DELETE FROM product_categories"))).thenReturn(clearStatement)
            whenever(mockConnection.prepareStatement(contains("UPDATE categories SET name"))).thenReturn(deleteStatement)

            whenever(clearStatement.executeUpdate()).thenReturn(0)
            whenever(deleteStatement.executeUpdate()).thenReturn(1)

            val service = CategoryService(mockConnection)
            val ok = service.deleteCategory("cat-1", "product")
            assertTrue(ok)
        }
    }
}
