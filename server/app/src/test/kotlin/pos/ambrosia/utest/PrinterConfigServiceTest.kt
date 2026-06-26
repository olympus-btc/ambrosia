package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.PrinterConfigCreateRequest
import pos.ambrosia.models.PrinterConfigUpdateRequest
import pos.ambrosia.models.PrinterType
import pos.ambrosia.services.PrinterConfigService
import pos.ambrosia.services.PrinterConfigUpdateStatus
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PrinterConfigServiceTest {
    private lateinit var dbFile: File
    private val service = PrinterConfigService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `createPrinterConfig returns id on success`() {
        runBlocking {
            val request = PrinterConfigCreateRequest(printerType = PrinterType.KITCHEN, printerName = "Printer 1")
            val result = service.createPrinterConfig(request)
            assertNotNull(result)

            val created = service.getPrinterConfigById(result)
            assertEquals("Printer 1", created?.printerName)
            assertNotNull(created?.createdAt)
        }
    }

    @Test
    fun `createPrinterConfig returns null if type and name already exist`() {
        runBlocking {
            ExposedTestDb.seedPrinterConfig(printerType = "KITCHEN", printerName = "Printer 1")
            val request = PrinterConfigCreateRequest(printerType = PrinterType.KITCHEN, printerName = "Printer 1")
            val result = service.createPrinterConfig(request)
            assertNull(result)
        }
    }

    @Test
    fun `createPrinterConfig clears previous default for type when marked default`() {
        runBlocking {
            val previousDefaultId = ExposedTestDb.seedPrinterConfig(printerType = "KITCHEN", printerName = "Old Default", isDefault = true)

            val request = PrinterConfigCreateRequest(printerType = PrinterType.KITCHEN, printerName = "New Default", isDefault = true)
            val result = service.createPrinterConfig(request)
            assertNotNull(result)

            assertFalse(service.getPrinterConfigById(previousDefaultId)?.isDefault ?: true)
            assertTrue(service.getPrinterConfigById(result)?.isDefault ?: false)
        }
    }

    @Test
    fun `upsertDefaultByTypeName creates new config when none exists`() {
        runBlocking {
            val result = service.upsertDefaultByTypeName(PrinterType.KITCHEN, "Printer 1")
            assertNotNull(result)

            val created = service.getPrinterConfigById(result)
            assertEquals("Printer 1", created?.printerName)
            assertTrue(created?.isDefault ?: false)
            assertTrue(created?.enabled ?: false)
        }
    }

    @Test
    fun `upsertDefaultByTypeName updates existing config to be default`() {
        runBlocking {
            val existingId =
                ExposedTestDb.seedPrinterConfig(
                    printerType = "KITCHEN",
                    printerName = "Printer 1",
                    isDefault = false,
                    enabled = false,
                )
            val otherDefaultId = ExposedTestDb.seedPrinterConfig(printerType = "KITCHEN", printerName = "Printer 2", isDefault = true)

            val result = service.upsertDefaultByTypeName(PrinterType.KITCHEN, "Printer 1")
            assertEquals(existingId, result)

            val updated = service.getPrinterConfigById(existingId)
            assertTrue(updated?.isDefault ?: false)
            assertTrue(updated?.enabled ?: false)
            assertFalse(service.getPrinterConfigById(otherDefaultId)?.isDefault ?: true)
        }
    }

    @Test
    fun `getPrinterConfigs returns all configs`() {
        runBlocking {
            ExposedTestDb.seedPrinterConfig(printerType = "KITCHEN", printerName = "Printer 1")
            ExposedTestDb.seedPrinterConfig(printerType = "BAR", printerName = "Printer 2")

            val result = service.getPrinterConfigs()
            assertEquals(2, result.size)
        }
    }

    @Test
    fun `getPrinterConfigById returns null for invalid uuid`() {
        runBlocking {
            val result = service.getPrinterConfigById("not-a-uuid")
            assertNull(result)
        }
    }

    @Test
    fun `getPrinterConfigById returns null when not found`() {
        runBlocking {
            val result = service.getPrinterConfigById(UUID.randomUUID().toString())
            assertNull(result)
        }
    }

    @Test
    fun `getDefaultByType returns default enabled config`() {
        runBlocking {
            ExposedTestDb.seedPrinterConfig(printerType = "KITCHEN", printerName = "Printer 1", isDefault = false, enabled = true)
            val defaultId =
                ExposedTestDb.seedPrinterConfig(
                    printerType = "KITCHEN",
                    printerName = "Printer 2",
                    isDefault = true,
                    enabled = true,
                )

            val result = service.getDefaultByType(PrinterType.KITCHEN)
            assertEquals(defaultId, result?.id)
        }
    }

    @Test
    fun `getDefaultByType returns null when no default configured`() {
        runBlocking {
            ExposedTestDb.seedPrinterConfig(printerType = "KITCHEN", printerName = "Printer 1", isDefault = false)
            val result = service.getDefaultByType(PrinterType.KITCHEN)
            assertNull(result)
        }
    }

    @Test
    fun `getEnabledByType returns only enabled configs of given type`() {
        runBlocking {
            ExposedTestDb.seedPrinterConfig(printerType = "KITCHEN", printerName = "Printer 1", enabled = true)
            ExposedTestDb.seedPrinterConfig(printerType = "KITCHEN", printerName = "Printer 2", enabled = false)
            ExposedTestDb.seedPrinterConfig(printerType = "BAR", printerName = "Printer 3", enabled = true)

            val result = service.getEnabledByType(PrinterType.KITCHEN)
            assertEquals(1, result.size)
            assertEquals("Printer 1", result[0].printerName)
        }
    }

    @Test
    fun `updatePrinterConfig returns NOT_FOUND for invalid uuid`() {
        runBlocking {
            val result = service.updatePrinterConfig("not-a-uuid", PrinterConfigUpdateRequest())
            assertEquals(PrinterConfigUpdateStatus.NOT_FOUND, result)
        }
    }

    @Test
    fun `updatePrinterConfig returns NOT_FOUND when config does not exist`() {
        runBlocking {
            val result = service.updatePrinterConfig(UUID.randomUUID().toString(), PrinterConfigUpdateRequest())
            assertEquals(PrinterConfigUpdateStatus.NOT_FOUND, result)
        }
    }

    @Test
    fun `updatePrinterConfig returns CONFLICT when type and name already used by another config`() {
        runBlocking {
            ExposedTestDb.seedPrinterConfig(printerType = "KITCHEN", printerName = "Printer 1")
            val id = ExposedTestDb.seedPrinterConfig(printerType = "KITCHEN", printerName = "Printer 2")

            val result = service.updatePrinterConfig(id, PrinterConfigUpdateRequest(printerName = "Printer 1"))
            assertEquals(PrinterConfigUpdateStatus.CONFLICT, result)
        }
    }

    @Test
    fun `updatePrinterConfig returns UPDATED on success and clears previous default`() {
        runBlocking {
            val previousDefaultId = ExposedTestDb.seedPrinterConfig(printerType = "KITCHEN", printerName = "Printer 1", isDefault = true)
            val id = ExposedTestDb.seedPrinterConfig(printerType = "KITCHEN", printerName = "Printer 2", isDefault = false)

            val result = service.updatePrinterConfig(id, PrinterConfigUpdateRequest(printerName = "Printer 2 Updated", isDefault = true))
            assertEquals(PrinterConfigUpdateStatus.UPDATED, result)

            val updated = service.getPrinterConfigById(id)
            assertEquals("Printer 2 Updated", updated?.printerName)
            assertTrue(updated?.isDefault ?: false)
            assertFalse(service.getPrinterConfigById(previousDefaultId)?.isDefault ?: true)
        }
    }

    @Test
    fun `deletePrinterConfig returns false for invalid uuid`() {
        runBlocking {
            val result = service.deletePrinterConfig("not-a-uuid")
            assertFalse(result)
        }
    }

    @Test
    fun `deletePrinterConfig returns true on success`() {
        runBlocking {
            val id = ExposedTestDb.seedPrinterConfig(printerType = "KITCHEN", printerName = "Printer 1")

            val result = service.deletePrinterConfig(id)
            assertTrue(result)
            assertNull(service.getPrinterConfigById(id))
        }
    }

    @Test
    fun `deletePrinterConfig returns false when not found`() {
        runBlocking {
            val result = service.deletePrinterConfig(UUID.randomUUID().toString())
            assertFalse(result)
        }
    }

    @Test
    fun `setDefault returns false when not found`() {
        runBlocking {
            val result = service.setDefault(UUID.randomUUID().toString())
            assertFalse(result)
        }
    }

    @Test
    fun `setDefault sets config as default and clears previous default`() {
        runBlocking {
            val previousDefaultId = ExposedTestDb.seedPrinterConfig(printerType = "KITCHEN", printerName = "Printer 1", isDefault = true)
            val id = ExposedTestDb.seedPrinterConfig(printerType = "KITCHEN", printerName = "Printer 2", isDefault = false)

            val result = service.setDefault(id)
            assertTrue(result)

            assertTrue(service.getPrinterConfigById(id)?.isDefault ?: false)
            assertFalse(service.getPrinterConfigById(previousDefaultId)?.isDefault ?: true)
        }
    }
}
