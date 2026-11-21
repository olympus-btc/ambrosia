package pos.ambrosia.services

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filter
import pos.ambrosia.datadir
import pos.ambrosia.logging.LogEntryFilter
import pos.ambrosia.logging.LogFileFollower
import pos.ambrosia.logging.LogFileTailReader
import pos.ambrosia.logging.LogLevels
import pos.ambrosia.logging.LoggingConfiguration
import pos.ambrosia.logging.PhoenixdLogHeaderLineParser
import pos.ambrosia.logging.ServerLogBuffer
import pos.ambrosia.logging.ServerLogHeaderLineParser
import pos.ambrosia.models.LogEntry
import pos.ambrosia.models.LogSourceAvailability
import pos.ambrosia.models.LogSourceIds
import pos.ambrosia.models.LogSourceUnavailableReasons
import pos.ambrosia.phoenixDatadir
import pos.ambrosia.utils.InvalidLogRequestException
import java.io.File
import java.io.OutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

data class LogHistoryQuery(
    val sourceId: String,
    val maximumEntries: Int,
    val minimumLevel: String?,
    val searchText: String?,
)

class LogsService(
    private val serverLogsDirectory: File = LoggingConfiguration.logsDirectory(datadir.toString()),
    private val phoenixdDataDirectory: File = File(phoenixDatadir.toString()),
) {
    private val serverLogTailReader = LogFileTailReader(ServerLogHeaderLineParser)
    private val phoenixdLogTailReader = LogFileTailReader(PhoenixdLogHeaderLineParser)

    fun parseLogHistoryQuery(
        sourceParameter: String?,
        levelParameter: String?,
        linesParameter: String?,
        searchParameter: String?,
    ): LogHistoryQuery {
        val sourceId = parseLogSourceId(sourceParameter)
        val minimumLevel = LogLevels.normalizeOrNull(levelParameter)
        if (levelParameter != null && minimumLevel == null) throw InvalidLogRequestException("Unknown log level: $levelParameter")
        val maximumEntries =
            (linesParameter?.toIntOrNull() ?: DEFAULT_ENTRIES_PER_REQUEST).coerceIn(1, MAXIMUM_ENTRIES_PER_REQUEST)
        return LogHistoryQuery(sourceId, maximumEntries, minimumLevel, searchParameter?.take(MAXIMUM_SEARCH_TEXT_LENGTH))
    }

    fun parseLogSourceId(sourceParameter: String?): String {
        val sourceId = sourceParameter ?: LogSourceIds.SERVER
        if (sourceId !in LogSourceIds.ALL) throw InvalidLogRequestException("Unknown log source: $sourceId")
        return sourceId
    }

    fun isLogSourceAvailable(
        sourceId: String,
        localPhoenixdConfigured: Boolean,
    ): Boolean = sourceId != LogSourceIds.PHOENIXD || phoenixdAvailability(localPhoenixdConfigured).available

    fun activePhoenixdLogFile(): File = File(phoenixdDataDirectory, PHOENIXD_LOG_FILE_NAME)

    fun serverLogFilesNewestFirst(): List<File> =
        listLogFilesNewestFirst(serverLogsDirectory, LoggingConfiguration.SERVER_LOG_FILE_NAME) { logFileName ->
            logFileName.startsWith(LoggingConfiguration.SERVER_LOG_FILE_PREFIX) && logFileName.endsWith(LOG_FILE_EXTENSION)
        }

    fun phoenixdLogFilesNewestFirst(): List<File> =
        listLogFilesNewestFirst(phoenixdDataDirectory, PHOENIXD_LOG_FILE_NAME) { logFileName ->
            phoenixdLogFileNamePattern.matches(logFileName)
        }

    fun phoenixdAvailability(localPhoenixdConfigured: Boolean): LogSourceAvailability {
        val activePhoenixdLogFile = activePhoenixdLogFile()
        val unavailableReason =
            when {
                !localPhoenixdConfigured -> LogSourceUnavailableReasons.REMOTE_LIGHTNING_BACKEND
                !activePhoenixdLogFile.isFile -> LogSourceUnavailableReasons.LOG_FILE_NOT_FOUND
                !activePhoenixdLogFile.canRead() -> LogSourceUnavailableReasons.LOG_FILE_NOT_READABLE
                else -> null
            }
        return LogSourceAvailability(
            id = LogSourceIds.PHOENIXD,
            available = unavailableReason == null,
            unavailableReason = unavailableReason,
        )
    }

    fun sources(localPhoenixdConfigured: Boolean): List<LogSourceAvailability> =
        listOf(
            LogSourceAvailability(id = LogSourceIds.SERVER, available = true),
            phoenixdAvailability(localPhoenixdConfigured),
            LogSourceAvailability(id = LogSourceIds.CLIENT, available = true),
        )

    fun readEntries(
        logHistoryQuery: LogHistoryQuery,
        localPhoenixdConfigured: Boolean,
    ): List<LogEntry> {
        if (!isLogSourceAvailable(logHistoryQuery.sourceId, localPhoenixdConfigured)) return emptyList()
        if (logHistoryQuery.sourceId == LogSourceIds.PHOENIXD) {
            return phoenixdLogTailReader.readLatestEntries(
                phoenixdLogFilesNewestFirst(),
                logHistoryQuery.maximumEntries,
                LogEntryFilter(minimumLevel = logHistoryQuery.minimumLevel, searchText = logHistoryQuery.searchText),
            )
        }

        val serverLogEntryFilter =
            LogEntryFilter(
                sourceId = logHistoryQuery.sourceId,
                minimumLevel = logHistoryQuery.minimumLevel,
                searchText = logHistoryQuery.searchText,
            )
        val serverLogFiles = serverLogFilesNewestFirst()
        if (serverLogFiles.isEmpty()) {
            return ServerLogBuffer.snapshot().filter(serverLogEntryFilter::matches).takeLast(logHistoryQuery.maximumEntries)
        }
        return serverLogTailReader.readLatestEntries(serverLogFiles, logHistoryQuery.maximumEntries, serverLogEntryFilter)
    }

    fun liveEntries(sourceId: String): Flow<LogEntry> =
        if (sourceId == LogSourceIds.PHOENIXD) {
            LogFileFollower(activePhoenixdLogFile(), PhoenixdLogHeaderLineParser).follow()
        } else {
            ServerLogBuffer.liveEntries.filter { liveLogEntry -> liveLogEntry.source == sourceId }
        }

    fun writeLogsArchive(
        archiveOutputStream: OutputStream,
        includePhoenixdLogs: Boolean,
        diagnosticsSummary: String,
    ) {
        ZipOutputStream(archiveOutputStream).use { logsZipOutputStream ->
            logsZipOutputStream.putNextEntry(ZipEntry(DIAGNOSTICS_FILE_NAME))
            logsZipOutputStream.write(diagnosticsSummary.toByteArray(Charsets.UTF_8))
            logsZipOutputStream.closeEntry()

            serverLogFilesNewestFirst().forEach { serverLogFile ->
                addLogFileToArchive(logsZipOutputStream, serverLogFile, SERVER_ARCHIVE_FOLDER)
            }
            if (includePhoenixdLogs) {
                phoenixdLogFilesNewestFirst().forEach { phoenixdLogFile ->
                    addLogFileToArchive(logsZipOutputStream, phoenixdLogFile, PHOENIXD_ARCHIVE_FOLDER)
                }
            }
        }
    }

    private fun listLogFilesNewestFirst(
        logsDirectory: File,
        activeLogFileName: String,
        isLogFileName: (String) -> Boolean,
    ): List<File> =
        logsDirectory
            .listFiles { candidateLogFile -> candidateLogFile.isFile && isLogFileName(candidateLogFile.name) }
            .orEmpty()
            .sortedWith(
                compareByDescending<File> { logFile -> logFile.name == activeLogFileName }
                    .thenByDescending { logFile -> logFile.lastModified() },
            )

    private fun addLogFileToArchive(
        logsZipOutputStream: ZipOutputStream,
        logFile: File,
        archiveFolder: String,
    ) {
        if (!logFile.canRead()) return
        runCatching {
            logsZipOutputStream.putNextEntry(ZipEntry("$archiveFolder/${logFile.name}"))
            logFile.inputStream().use { logFileInputStream -> logFileInputStream.copyTo(logsZipOutputStream) }
            logsZipOutputStream.closeEntry()
        }
    }

    companion object {
        const val PHOENIXD_LOG_FILE_NAME = "phoenix.log"
        const val MAXIMUM_ENTRIES_PER_REQUEST = 2000
        const val DEFAULT_ENTRIES_PER_REQUEST = 500
        const val MAXIMUM_SEARCH_TEXT_LENGTH = 200
        private const val LOG_FILE_EXTENSION = ".log"
        private const val DIAGNOSTICS_FILE_NAME = "diagnostics.txt"
        private const val SERVER_ARCHIVE_FOLDER = "server"
        private const val PHOENIXD_ARCHIVE_FOLDER = "phoenixd"
        private val phoenixdLogFileNamePattern = Regex("^phoenix(-\\d+)?\\.log$")
    }
}
