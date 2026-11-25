package pos.ambrosia.services

import kotlinx.io.files.Path
import pos.ambrosia.config.readConfValues
import pos.ambrosia.config.writeConfValues
import pos.ambrosia.datadir
import pos.ambrosia.logger
import pos.ambrosia.logging.LogFileRetention
import pos.ambrosia.logging.LogLevels
import pos.ambrosia.logging.LogSettingsConfigKeys
import pos.ambrosia.logging.LoggingConfiguration
import pos.ambrosia.models.LogSettings
import pos.ambrosia.utils.InvalidLogRequestException

class LogSettingsService(
    private val ambrosiaConfigFile: Path = Path(datadir, "ambrosia.conf"),
) {
    fun readPersistedFileRetention(): LogFileRetention = LogFileRetention.fromConfigValues(readConfValues(ambrosiaConfigFile))

    fun readPersistedClientErrorReportingEnabled(): Boolean =
        readConfValues(ambrosiaConfigFile)[LogSettingsConfigKeys.CLIENT_ERROR_REPORTING_ENABLED]
            ?.trim()
            ?.toBooleanStrictOrNull()
            ?: DEFAULT_CLIENT_ERROR_REPORTING_ENABLED

    fun currentSettings(): LogSettings {
        val currentFileRetention = LoggingConfiguration.currentFileRetention()
        return LogSettings(
            level = LoggingConfiguration.currentLevel(),
            retentionDays = currentFileRetention.retentionDays,
            maximumTotalSizeMegabytes = currentFileRetention.maximumTotalSizeMegabytes,
            clientErrorReportingEnabled = ClientLogReportService.clientErrorReportingEnabled,
        )
    }

    fun updateSettings(requestedLogSettings: LogSettings): LogSettings {
        val configurableLevel =
            LogLevels
                .normalizeOrNull(requestedLogSettings.level)
                ?.takeIf { normalizedLevel -> normalizedLevel in LogLevels.CONFIGURABLE_SERVER_LEVELS }
                ?: throw InvalidLogRequestException("Unsupported log level: ${requestedLogSettings.level}")
        if (!LogFileRetention.isConfigurable(requestedLogSettings.retentionDays, requestedLogSettings.maximumTotalSizeMegabytes)) {
            throw InvalidLogRequestException(
                "Unsupported log retention: ${requestedLogSettings.retentionDays} days, " +
                    "${requestedLogSettings.maximumTotalSizeMegabytes} MB",
            )
        }
        val requestedFileRetention =
            LogFileRetention(requestedLogSettings.retentionDays, requestedLogSettings.maximumTotalSizeMegabytes)

        LoggingConfiguration.applyLevel(configurableLevel)
        LoggingConfiguration.applyFileRetention(requestedFileRetention)
        ClientLogReportService.clientErrorReportingEnabled = requestedLogSettings.clientErrorReportingEnabled
        writeConfValues(
            ambrosiaConfigFile,
            mapOf(
                LogSettingsConfigKeys.LEVEL to configurableLevel,
                LogSettingsConfigKeys.RETENTION_DAYS to requestedFileRetention.retentionDays.toString(),
                LogSettingsConfigKeys.MAXIMUM_TOTAL_SIZE_MEGABYTES to requestedFileRetention.maximumTotalSizeMegabytes.toString(),
                LogSettingsConfigKeys.CLIENT_ERROR_REPORTING_ENABLED to requestedLogSettings.clientErrorReportingEnabled.toString(),
            ),
        )
        logger.info(
            "Log settings changed: level={}, retentionDays={}, maximumTotalSizeMegabytes={}, clientErrorReportingEnabled={}",
            configurableLevel,
            requestedFileRetention.retentionDays,
            requestedFileRetention.maximumTotalSizeMegabytes,
            requestedLogSettings.clientErrorReportingEnabled,
        )
        return currentSettings()
    }

    companion object {
        const val DEFAULT_CLIENT_ERROR_REPORTING_ENABLED = true
    }
}
