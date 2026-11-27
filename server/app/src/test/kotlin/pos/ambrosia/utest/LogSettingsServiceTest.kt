package pos.ambrosia.utest

import kotlinx.io.files.Path
import org.junit.After
import pos.ambrosia.config.readConfValues
import pos.ambrosia.logging.LogFileRetention
import pos.ambrosia.logging.LogLevels
import pos.ambrosia.logging.LogSettingsConfigKeys
import pos.ambrosia.logging.LoggingConfiguration
import pos.ambrosia.models.LogSettings
import pos.ambrosia.services.ClientLogReportService
import pos.ambrosia.services.LogSettingsService
import pos.ambrosia.utils.InvalidLogRequestException
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class LogSettingsServiceTest {
    private val ambrosiaConfigFile = File.createTempFile("logSettingsServiceTest", ".conf")
    private val logSettingsService = LogSettingsService(Path(ambrosiaConfigFile.absolutePath))

    @After
    fun tearDown() {
        LoggingConfiguration.applyLevel(LogLevels.DEFAULT_SERVER_LEVEL)
        LoggingConfiguration.applyFileRetention(LogFileRetention.DEFAULT)
        ClientLogReportService.clientErrorReportingEnabled = true
        ambrosiaConfigFile.delete()
    }

    @Test
    fun `applies every setting at runtime and persists them in ambrosia conf`() {
        ambrosiaConfigFile.writeText("http-bind-port=9154\n")

        val appliedLogSettings =
            logSettingsService.updateSettings(
                LogSettings(
                    level = "debug",
                    retentionDays = 14,
                    maximumTotalSizeMegabytes = 50,
                    clientErrorReportingEnabled = false,
                ),
            )

        val expectedLogSettings =
            LogSettings(
                level = LogLevels.DEBUG,
                retentionDays = 14,
                maximumTotalSizeMegabytes = 50,
                clientErrorReportingEnabled = false,
            )
        assertEquals(expectedLogSettings, appliedLogSettings)
        assertEquals(expectedLogSettings, logSettingsService.currentSettings())
        assertEquals(LogFileRetention(14, 50), LoggingConfiguration.currentFileRetention())
        assertFalse(ClientLogReportService.clientErrorReportingEnabled)
        val persistedConfigValues = readConfValues(Path(ambrosiaConfigFile.absolutePath))
        assertEquals(LogLevels.DEBUG, persistedConfigValues[LogSettingsConfigKeys.LEVEL])
        assertEquals("14", persistedConfigValues[LogSettingsConfigKeys.RETENTION_DAYS])
        assertEquals("50", persistedConfigValues[LogSettingsConfigKeys.MAXIMUM_TOTAL_SIZE_MEGABYTES])
        assertEquals("false", persistedConfigValues[LogSettingsConfigKeys.CLIENT_ERROR_REPORTING_ENABLED])
        assertEquals("9154", persistedConfigValues["http-bind-port"])
    }

    @Test
    fun `rejects levels that cannot be configured`() {
        val defaultLogSettings = logSettingsService.currentSettings()

        assertFailsWith<InvalidLogRequestException> {
            logSettingsService.updateSettings(defaultLogSettings.copy(level = LogLevels.TRACE))
        }
        assertFailsWith<InvalidLogRequestException> { logSettingsService.updateSettings(defaultLogSettings.copy(level = "LOUD")) }
    }

    @Test
    fun `rejects retention days and disk space that are not offered`() {
        val defaultLogSettings = logSettingsService.currentSettings()

        assertFailsWith<InvalidLogRequestException> { logSettingsService.updateSettings(defaultLogSettings.copy(retentionDays = 0)) }
        assertFailsWith<InvalidLogRequestException> {
            logSettingsService.updateSettings(defaultLogSettings.copy(maximumTotalSizeMegabytes = 1000))
        }
        assertEquals(LogFileRetention.DEFAULT, LoggingConfiguration.currentFileRetention())
    }

    @Test
    fun `reads the persisted retention and app error reporting`() {
        ambrosiaConfigFile.writeText(
            "${LogSettingsConfigKeys.RETENTION_DAYS}=30\n" +
                "${LogSettingsConfigKeys.MAXIMUM_TOTAL_SIZE_MEGABYTES}=100\n" +
                "${LogSettingsConfigKeys.CLIENT_ERROR_REPORTING_ENABLED}=false\n",
        )

        assertEquals(LogFileRetention(30, 100), logSettingsService.readPersistedFileRetention())
        assertFalse(logSettingsService.readPersistedClientErrorReportingEnabled())
    }

    @Test
    fun `falls back to the defaults when the persisted values are missing or invalid`() {
        ambrosiaConfigFile.writeText(
            "${LogSettingsConfigKeys.RETENTION_DAYS}=2\n" +
                "${LogSettingsConfigKeys.MAXIMUM_TOTAL_SIZE_MEGABYTES}=lots\n" +
                "${LogSettingsConfigKeys.CLIENT_ERROR_REPORTING_ENABLED}=maybe\n",
        )

        assertEquals(LogFileRetention.DEFAULT, logSettingsService.readPersistedFileRetention())
        assertTrue(logSettingsService.readPersistedClientErrorReportingEnabled())
    }
}
