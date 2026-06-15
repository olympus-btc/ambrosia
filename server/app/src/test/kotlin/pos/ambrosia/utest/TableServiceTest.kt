package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.Table
import pos.ambrosia.services.TableService
import pos.ambrosia.util.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TableServiceTest {
    private lateinit var dbFile: File
    private val service = TableService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `getTables returns list of tables when found`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")
            ExposedTestDb.seedDiningTable("T1", spaceId)
            ExposedTestDb.seedDiningTable("T2", spaceId)

            val result = service.getTables()

            assertEquals(2, result.size)
            assertEquals(setOf("T1", "T2"), result.map { it.name }.toSet())
        }

    @Test
    fun `getTables returns empty list when none found`() =
        runBlocking {
            assertTrue(service.getTables().isEmpty())
        }

    @Test
    fun `getTableById returns table when found`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")
            val tableId = ExposedTestDb.seedDiningTable("T1", spaceId, "occupied")

            val result = service.getTableById(tableId)

            assertNotNull(result)
            assertEquals(Table(id = tableId, name = "T1", status = "occupied", spaceId = spaceId, orderId = null), result)
        }

    @Test
    fun `getTableById returns null when not found`() =
        runBlocking {
            assertNull(service.getTableById(UUID.randomUUID().toString()))
        }

    @Test
    fun `getTablesBySpace returns tables when found`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")
            ExposedTestDb.seedDiningTable("T1", spaceId, "occupied")

            val result = service.getTablesBySpace(spaceId)

            assertNotNull(result)
            assertEquals(1, result.size)
            assertEquals("T1", result[0].name)
        }

    @Test
    fun `getTablesBySpace returns empty list when none found`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")

            val result = service.getTablesBySpace(spaceId)

            assertNotNull(result)
            assertTrue(result.isEmpty())
        }

    @Test
    fun `getTablesBySpace returns null when space not found`() =
        runBlocking {
            assertNull(service.getTablesBySpace(UUID.randomUUID().toString()))
        }

    @Test
    fun `addTable returns null if space does not exist`() =
        runBlocking {
            val newTable = Table(null, "T3", "available", UUID.randomUUID().toString(), null)
            assertNull(service.addTable(newTable))
        }

    @Test
    fun `addTable returns null if table name already exists in space`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")
            ExposedTestDb.seedDiningTable("T1", spaceId)

            val result = service.addTable(Table(null, "T1", "available", spaceId, null))

            assertNull(result)
        }

    @Test
    fun `addTable returns null if status is invalid`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")

            val result = service.addTable(Table(null, "T3", "invalid-status", spaceId, null))

            assertNull(result)
        }

    @Test
    fun `addTable returns new ID on success`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")

            val result = service.addTable(Table(null, "T4", "available", spaceId, null))

            assertNotNull(result)
            assertEquals("T4", service.getTableById(result)?.name)
        }

    @Test
    fun `updateTable returns false if ID is null`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")
            val tableWithNullId = Table(id = null, name = "A Name", status = "available", spaceId = spaceId, orderId = null)
            assertFalse(service.updateTable(tableWithNullId))
        }

    @Test
    fun `updateTable returns false if space does not exist`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")
            val tableId = ExposedTestDb.seedDiningTable("T1", spaceId)

            val tableToUpdate =
                Table(id = tableId, name = "A Name", status = "available", spaceId = UUID.randomUUID().toString(), orderId = null)

            assertFalse(service.updateTable(tableToUpdate))
        }

    @Test
    fun `updateTable returns false if name already exists in space`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")
            ExposedTestDb.seedDiningTable("Existing Name", spaceId)
            val tableId = ExposedTestDb.seedDiningTable("T1", spaceId)

            val tableToUpdate = Table(id = tableId, name = "Existing Name", status = "available", spaceId = spaceId, orderId = null)

            assertFalse(service.updateTable(tableToUpdate))
        }

    @Test
    fun `updateTable returns false if status is invalid`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")
            val tableId = ExposedTestDb.seedDiningTable("T1", spaceId)

            val tableToUpdate = Table(id = tableId, name = "T1", status = "invalid-status", spaceId = spaceId, orderId = null)

            assertFalse(service.updateTable(tableToUpdate))
        }

    @Test
    fun `updateTable returns true on success`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")
            val tableId = ExposedTestDb.seedDiningTable("T1", spaceId)

            val tableToUpdate = Table(id = tableId, name = "Updated Name", status = "occupied", spaceId = spaceId, orderId = "order-1")
            val result = service.updateTable(tableToUpdate)

            assertTrue(result)
            assertEquals(tableToUpdate, service.getTableById(tableId))
        }

    @Test
    fun `updateTable returns false when table not found`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")
            val tableToUpdate =
                Table(id = UUID.randomUUID().toString(), name = "Updated Name", status = "occupied", spaceId = spaceId, orderId = null)

            assertFalse(service.updateTable(tableToUpdate))
        }

    @Test
    fun `deleteTable returns true on success`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")
            val tableId = ExposedTestDb.seedDiningTable("T1", spaceId)

            assertTrue(service.deleteTable(tableId))
            assertNull(service.getTableById(tableId))
        }

    @Test
    fun `deleteTable returns false when table not found`() =
        runBlocking {
            assertFalse(service.deleteTable(UUID.randomUUID().toString()))
        }
}
