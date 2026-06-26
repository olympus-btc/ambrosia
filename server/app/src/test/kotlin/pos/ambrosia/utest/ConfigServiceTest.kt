package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.Config
import pos.ambrosia.services.ConfigService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ConfigServiceTest {
    private lateinit var dbFile: File
    private val service = ConfigService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `getConfig returns null when not found`() =
        runBlocking {
            assertNull(service.getConfig())
        }

    @Test
    fun `updateConfig creates config when none exists`() =
        runBlocking {
            val config =
                Config(
                    businessType = "restaurant",
                    businessName = "Test Cafe",
                    businessAddress = "123 Lane",
                    businessPhone = "555",
                    businessEmail = "a@b.com",
                    businessTaxId = "T123",
                    businessLogoUrl = null,
                    businessTypeConfirmed = true,
                )

            val updated = service.updateConfig(config)

            assertTrue(updated)
            assertEquals(config, service.getConfig())
        }

    @Test
    fun `updateConfig replaces existing config`() =
        runBlocking {
            service.updateConfig(
                Config(
                    businessType = "restaurant",
                    businessName = "Old Name",
                    businessAddress = null,
                    businessPhone = null,
                    businessEmail = null,
                    businessTaxId = null,
                    businessLogoUrl = null,
                ),
            )

            val newConfig =
                Config(
                    businessType = "store",
                    businessName = "New Name",
                    businessAddress = "456 Ave",
                    businessPhone = "123",
                    businessEmail = "c@d.com",
                    businessTaxId = "T456",
                    businessLogoUrl = "logo.png",
                    businessTypeConfirmed = true,
                )
            val updated = service.updateConfig(newConfig)

            assertTrue(updated)
            assertEquals(newConfig, service.getConfig())
        }
}
