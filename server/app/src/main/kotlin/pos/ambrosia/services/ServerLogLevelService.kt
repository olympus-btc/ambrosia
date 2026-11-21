package pos.ambrosia.services

import kotlinx.io.files.Path
import pos.ambrosia.config.writeConfValues
import pos.ambrosia.datadir
import pos.ambrosia.logger
import pos.ambrosia.logging.LogLevels
import pos.ambrosia.logging.LoggingConfiguration
import pos.ambrosia.utils.InvalidLogRequestException

class ServerLogLevelService(
    private val ambrosiaConfigFile: Path = Path(datadir, "ambrosia.conf"),
) {
    fun currentLevel(): String = LoggingConfiguration.currentLevel()

    fun changeLevel(requestedLevel: String): String {
        val configurableLevel =
            LogLevels
                .normalizeOrNull(requestedLevel)
                ?.takeIf { normalizedLevel -> normalizedLevel in LogLevels.CONFIGURABLE_SERVER_LEVELS }
                ?: throw InvalidLogRequestException("Unsupported log level: $requestedLevel")
        LoggingConfiguration.applyLevel(configurableLevel)
        writeConfValues(ambrosiaConfigFile, mapOf(LoggingConfiguration.LOG_LEVEL_CONFIG_KEY to configurableLevel))
        logger.info("Server log level changed to {}", configurableLevel)
        return configurableLevel
    }
}
