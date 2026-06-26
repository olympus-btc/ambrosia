package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.ElementStyle
import pos.ambrosia.models.ElementType
import pos.ambrosia.models.FontSize
import pos.ambrosia.models.Justification
import pos.ambrosia.models.TicketElementCreateRequest
import pos.ambrosia.models.TicketTemplateRequest
import pos.ambrosia.services.TicketTemplateService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TicketTemplateServiceTest {
    private lateinit var dbFile: File
    private val service = TicketTemplateService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `addTemplate returns id on success`() {
        runBlocking {
            val request =
                TicketTemplateRequest(
                    name = "New Template",
                    elements =
                        listOf(
                            TicketElementCreateRequest(ElementType.TEXT, "Hello", ElementStyle()),
                        ),
                )

            val resultId = service.addTemplate(request)
            assertNotNull(resultId)

            val created = service.getTemplateById(resultId)
            assertEquals("New Template", created?.name)
            assertEquals(1, created?.elements?.size)
            assertEquals("Hello", created?.elements?.get(0)?.value)
        }
    }

    @Test
    fun `addTemplate returns null if name exists`() {
        runBlocking {
            ExposedTestDb.seedTicketTemplate("Existing Template")
            val request = TicketTemplateRequest(name = "Existing Template", elements = emptyList())

            val resultId = service.addTemplate(request)
            assertNull(resultId)
        }
    }

    @Test
    fun `getTemplates returns list of templates`() {
        runBlocking {
            ExposedTestDb.seedTicketTemplate("My Template")

            val templates = service.getTemplates()
            assertEquals(1, templates.size)
            assertEquals("My Template", templates[0].name)
        }
    }

    @Test
    fun `getTemplates returns empty list when none found`() {
        runBlocking {
            val templates = service.getTemplates()
            assertTrue(templates.isEmpty())
        }
    }

    @Test
    fun `getTemplateById returns template with ordered elements`() {
        runBlocking {
            val templateId = ExposedTestDb.seedTicketTemplate("My Template")
            ExposedTestDb.seedTicketTemplateElement(templateId, order = 1, type = "FOOTER", value = "Bye")
            ExposedTestDb.seedTicketTemplateElement(templateId, order = 0, type = "HEADER", value = "Hi")

            val result = service.getTemplateById(templateId)
            assertNotNull(result)
            assertEquals(2, result.elements.size)
            assertEquals("Hi", result.elements[0].value)
            assertEquals("Bye", result.elements[1].value)
        }
    }

    @Test
    fun `getTemplateById returns null for invalid uuid`() {
        runBlocking {
            val result = service.getTemplateById("not-a-uuid")
            assertNull(result)
        }
    }

    @Test
    fun `getTemplateById returns null when not found`() {
        runBlocking {
            val result = service.getTemplateById(UUID.randomUUID().toString())
            assertNull(result)
        }
    }

    @Test
    fun `getTemplateByName returns template when found`() {
        runBlocking {
            ExposedTestDb.seedTicketTemplate("My Template")

            val result = service.getTemplateByName("My Template")
            assertNotNull(result)
            assertEquals("My Template", result.name)
        }
    }

    @Test
    fun `getTemplateByName returns null when not found`() {
        runBlocking {
            val result = service.getTemplateByName("NonExistent")
            assertNull(result)
        }
    }

    @Test
    fun `updateTemplate returns true on success and replaces elements`() {
        runBlocking {
            val templateId = ExposedTestDb.seedTicketTemplate("Old Name")
            ExposedTestDb.seedTicketTemplateElement(templateId, order = 0, type = "TEXT", value = "Old")

            val request =
                TicketTemplateRequest(
                    name = "Updated Name",
                    elements =
                        listOf(
                            TicketElementCreateRequest(
                                ElementType.HEADER,
                                "New Header",
                                ElementStyle(bold = true, justification = Justification.CENTER, fontSize = FontSize.LARGE),
                            ),
                        ),
                )

            val success = service.updateTemplate(templateId, request)
            assertTrue(success)

            val updated = service.getTemplateById(templateId)
            assertEquals("Updated Name", updated?.name)
            assertEquals(1, updated?.elements?.size)
            assertEquals("New Header", updated?.elements?.get(0)?.value)
            assertEquals(ElementType.HEADER, updated?.elements?.get(0)?.type)
            assertTrue(
                updated
                    ?.elements
                    ?.get(0)
                    ?.style
                    ?.bold ?: false,
            )
        }
    }

    @Test
    fun `updateTemplate returns false for invalid uuid`() {
        runBlocking {
            val request = TicketTemplateRequest(name = "Updated Name", elements = emptyList())
            val success = service.updateTemplate("not-a-uuid", request)
            assertFalse(success)
        }
    }

    @Test
    fun `updateTemplate returns false when name already exists for another template`() {
        runBlocking {
            ExposedTestDb.seedTicketTemplate("Taken Name")
            val templateId = ExposedTestDb.seedTicketTemplate("My Template")

            val request = TicketTemplateRequest(name = "Taken Name", elements = emptyList())
            val success = service.updateTemplate(templateId, request)
            assertFalse(success)
        }
    }

    @Test
    fun `updateTemplate returns false when not found`() {
        runBlocking {
            val request = TicketTemplateRequest(name = "Updated Name", elements = emptyList())
            val success = service.updateTemplate(UUID.randomUUID().toString(), request)
            assertFalse(success)
        }
    }

    @Test
    fun `deleteTemplate returns true if deleted`() {
        runBlocking {
            val templateId = ExposedTestDb.seedTicketTemplate("My Template")
            ExposedTestDb.seedTicketTemplateElement(templateId)

            val success = service.deleteTemplate(templateId)
            assertTrue(success)
            assertNull(service.getTemplateById(templateId))
        }
    }

    @Test
    fun `deleteTemplate returns false for invalid uuid`() {
        runBlocking {
            val success = service.deleteTemplate("not-a-uuid")
            assertFalse(success)
        }
    }

    @Test
    fun `deleteTemplate returns false if not found`() {
        runBlocking {
            val success = service.deleteTemplate(UUID.randomUUID().toString())
            assertFalse(success)
        }
    }
}
