package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.Space
import pos.ambrosia.services.SpaceService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class SpaceServiceTest {
    private lateinit var dbFile: File
    private val service = SpaceService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `getSpaces returns list of spaces when found`() =
        runBlocking {
            ExposedTestDb.seedSpace("Patio")
            ExposedTestDb.seedSpace("Main Hall")

            val result = service.getSpaces()

            assertEquals(2, result.size)
            assertEquals(setOf("Patio", "Main Hall"), result.map { it.name }.toSet())
        }

    @Test
    fun `getSpaces returns empty list when none found`() =
        runBlocking {
            assertTrue(service.getSpaces().isEmpty())
        }

    @Test
    fun `getSpaceById returns space when found`() =
        runBlocking {
            val id = ExposedTestDb.seedSpace("Patio")

            val result = service.getSpaceById(id)

            assertNotNull(result)
            assertEquals(Space(id = id, name = "Patio"), result)
        }

    @Test
    fun `getSpaceById returns null when not found`() =
        runBlocking {
            assertNull(
                service.getSpaceById(
                    java.util.UUID
                        .randomUUID()
                        .toString(),
                ),
            )
        }

    @Test
    fun `addSpace returns null if name already exists`() =
        runBlocking {
            ExposedTestDb.seedSpace("Existing Patio")

            val result = service.addSpace(Space(id = null, name = "Existing Patio"))

            assertNull(result)
        }

    @Test
    fun `addSpace returns new ID on success`() =
        runBlocking {
            val result = service.addSpace(Space(id = null, name = "New Balcony"))

            assertNotNull(result)
            assertTrue(result.isNotBlank())
            assertEquals("New Balcony", service.getSpaceById(result)?.name)
        }

    @Test
    fun `updateSpace returns false if ID is null`() =
        runBlocking {
            assertFalse(service.updateSpace(Space(id = null, name = "A Name")))
        }

    @Test
    fun `updateSpace returns false if name already exists`() =
        runBlocking {
            ExposedTestDb.seedSpace("Existing Name")
            val id = ExposedTestDb.seedSpace("Other Name")

            val result = service.updateSpace(Space(id = id, name = "Existing Name"))

            assertFalse(result)
        }

    @Test
    fun `updateSpace returns true on success`() =
        runBlocking {
            val id = ExposedTestDb.seedSpace("Old Name")

            val result = service.updateSpace(Space(id = id, name = "New Valid Name"))

            assertTrue(result)
            assertEquals("New Valid Name", service.getSpaceById(id)?.name)
        }

    @Test
    fun `updateSpace returns false when space not found`() =
        runBlocking {
            val result =
                service.updateSpace(
                    Space(
                        id =
                            java.util.UUID
                                .randomUUID()
                                .toString(),
                        name = "New Valid Name",
                    ),
                )
            assertFalse(result)
        }

    @Test
    fun `deleteSpace returns false if space is in use`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")
            ExposedTestDb.seedDiningTable(spaceId = spaceId)

            val result = service.deleteSpace(spaceId)

            assertFalse(result)
        }

    @Test
    fun `deleteSpace returns true on success`() =
        runBlocking {
            val spaceId = ExposedTestDb.seedSpace("Patio")

            val result = service.deleteSpace(spaceId)

            assertTrue(result)
            assertNull(service.getSpaceById(spaceId))
        }

    @Test
    fun `deleteSpace returns false when space not found`() =
        runBlocking {
            val result =
                service.deleteSpace(
                    java.util.UUID
                        .randomUUID()
                        .toString(),
                )
            assertFalse(result)
        }
}
