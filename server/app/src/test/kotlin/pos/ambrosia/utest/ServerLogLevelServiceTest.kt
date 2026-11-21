package pos.ambrosia.utest

import kotlinx.io.files.Path
import org.junit.After
import pos.ambrosia.config.readConfValues
import pos.ambrosia.logging.LogLevels
import pos.ambrosia.logging.LoggingConfiguration
import pos.ambrosia.services.ServerLogLevelService
import pos.ambrosia.utils.InvalidLogRequestException
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ServerLogLevelServiceTest {
    private val ambrosiaConfigFile = File.createTempFile("serverLogLevelServiceTest", ".conf")

    @After
    fun tearDown() {
        LoggingConfiguration.applyLevel(LogLevels.DEFAULT_SERVER_LEVEL)
        ambrosiaConfigFile.delete()
    }

    @Test
    fun `changes the level at runtime and persists it in ambrosia conf`() {
        ambrosiaConfigFile.writeText("http-bind-port=9154\n")
        val serverLogLevelService = ServerLogLevelService(Path(ambrosiaConfigFile.absolutePath))

        val appliedLogLevel = serverLogLevelService.changeLevel("debug")

        assertEquals(LogLevels.DEBUG, appliedLogLevel)
        assertEquals(LogLevels.DEBUG, serverLogLevelService.currentLevel())
        val persistedConfigValues = readConfValues(Path(ambrosiaConfigFile.absolutePath))
        assertEquals(LogLevels.DEBUG, persistedConfigValues[LoggingConfiguration.LOG_LEVEL_CONFIG_KEY])
        assertEquals("9154", persistedConfigValues["http-bind-port"])
    }

    @Test
    fun `rejects levels that cannot be configured`() {
        val serverLogLevelService = ServerLogLevelService(Path(ambrosiaConfigFile.absolutePath))

        assertFailsWith<InvalidLogRequestException> { serverLogLevelService.changeLevel(LogLevels.TRACE) }
        assertFailsWith<InvalidLogRequestException> { serverLogLevelService.changeLevel("LOUD") }
    }
}
