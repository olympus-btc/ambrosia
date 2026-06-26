package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.Supplier
import pos.ambrosia.services.SupplierService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class SupplierServiceTest {
    private lateinit var dbFile: File
    private val service = SupplierService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `getSuppliers returns list of suppliers when found`() =
        runBlocking {
            ExposedTestDb.seedSupplier("Sysco", "John Doe", "555-1111", "john@sysco.com", "123 Supply St")
            ExposedTestDb.seedSupplier("US Foods", "Jane Smith", "555-2222", "jane@usfoods.com", "456 Food Ave")

            val result = service.getSuppliers()

            assertEquals(2, result.size)
            assertEquals(setOf("Sysco", "US Foods"), result.map { it.name }.toSet())
        }

    @Test
    fun `getSuppliers returns empty list when none found`() =
        runBlocking {
            assertTrue(service.getSuppliers().isEmpty())
        }

    @Test
    fun `getSupplierById returns supplier when found`() =
        runBlocking {
            val id = ExposedTestDb.seedSupplier("Sysco", "John Doe", "555-1111", "john@sysco.com", "123 Supply St")

            val result = service.getSupplierById(id)

            assertNotNull(result)
            assertEquals(Supplier(id, "Sysco", "John Doe", "555-1111", "john@sysco.com", "123 Supply St"), result)
        }

    @Test
    fun `getSupplierById returns null when not found`() =
        runBlocking {
            assertNull(service.getSupplierById(UUID.randomUUID().toString()))
        }

    @Test
    fun `addSupplier returns null if name already exists`() =
        runBlocking {
            ExposedTestDb.seedSupplier("Existing Supplier")

            val result = service.addSupplier(Supplier(null, "Existing Supplier", "", "", "", ""))

            assertNull(result)
        }

    @Test
    fun `addSupplier returns new ID on success`() =
        runBlocking {
            val result = service.addSupplier(Supplier(null, "New Supplier", "c", "p", "e", "a"))

            assertNotNull(result)
            assertTrue(result.isNotBlank())
            assertEquals("New Supplier", service.getSupplierById(result)?.name)
        }

    @Test
    fun `updateSupplier returns false if ID is null`() =
        runBlocking {
            assertFalse(service.updateSupplier(Supplier(id = null, name = "A Name", "", "", "", "")))
        }

    @Test
    fun `updateSupplier returns false if name already exists`() =
        runBlocking {
            ExposedTestDb.seedSupplier("Existing Name")
            val id = ExposedTestDb.seedSupplier("Other Name")

            val result = service.updateSupplier(Supplier(id = id, name = "Existing Name", "", "", "", ""))

            assertFalse(result)
        }

    @Test
    fun `updateSupplier returns true on success`() =
        runBlocking {
            val id = ExposedTestDb.seedSupplier("Old Name")

            val result = service.updateSupplier(Supplier(id = id, name = "New Valid Name", "c", "p", "e", "a"))

            assertTrue(result)
            assertEquals("New Valid Name", service.getSupplierById(id)?.name)
        }

    @Test
    fun `updateSupplier returns false when supplier not found`() =
        runBlocking {
            val result = service.updateSupplier(Supplier(id = UUID.randomUUID().toString(), name = "New Valid Name", "", "", "", ""))
            assertFalse(result)
        }

    @Test
    fun `deleteSupplier returns false if supplier is in use`() =
        runBlocking {
            val supplierId = ExposedTestDb.seedSupplier("Sysco")
            val ingredientId = ExposedTestDb.seedIngredient()
            ExposedTestDb.seedIngredientSupplier(supplierId, ingredientId)

            val result = service.deleteSupplier(supplierId)

            assertFalse(result)
        }

    @Test
    fun `deleteSupplier returns true on success`() =
        runBlocking {
            val supplierId = ExposedTestDb.seedSupplier("Sysco")

            val result = service.deleteSupplier(supplierId)

            assertTrue(result)
            assertNull(service.getSupplierById(supplierId))
        }

    @Test
    fun `deleteSupplier returns false when supplier not found`() =
        runBlocking {
            assertFalse(service.deleteSupplier(UUID.randomUUID().toString()))
        }
}
