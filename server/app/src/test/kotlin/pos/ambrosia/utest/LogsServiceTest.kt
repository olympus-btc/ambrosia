package pos.ambrosia.utest

import pos.ambrosia.logging.LogLevels
import pos.ambrosia.models.LogSourceIds
import pos.ambrosia.models.LogSourceUnavailableReasons
import pos.ambrosia.services.LogsService
import pos.ambrosia.utils.InvalidLogRequestException
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.file.Files
import java.util.zip.ZipInputStream
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LogsServiceTest {
    private val serverLogsDirectory = Files.createTempDirectory("logsServiceServerLogs").toFile()
    private val phoenixdDataDirectory = Files.createTempDirectory("logsServicePhoenixd").toFile()
    private val logsService = LogsService(serverLogsDirectory, phoenixdDataDirectory)

    private fun writeServerLogFile(
        logFileName: String,
        logMessage: String,
    ): File =
        File(serverLogsDirectory, logFileName).apply {
            writeText("2026-11-19T10:00:00.000-06:00 INFO  [main] Server - $logMessage\n")
        }

    @Test
    fun `parses history query parameters with defaults and limits`() {
        val defaultLogHistoryQuery = logsService.parseLogHistoryQuery(null, null, null, null)
        val limitedLogHistoryQuery = logsService.parseLogHistoryQuery("client", "warn", "999999", "x".repeat(500))

        assertEquals(LogSourceIds.SERVER, defaultLogHistoryQuery.sourceId)
        assertEquals(LogsService.DEFAULT_ENTRIES_PER_REQUEST, defaultLogHistoryQuery.maximumEntries)
        assertNull(defaultLogHistoryQuery.minimumLevel)
        assertEquals(LogSourceIds.CLIENT, limitedLogHistoryQuery.sourceId)
        assertEquals(LogLevels.WARN, limitedLogHistoryQuery.minimumLevel)
        assertEquals(LogsService.MAXIMUM_ENTRIES_PER_REQUEST, limitedLogHistoryQuery.maximumEntries)
        assertEquals(LogsService.MAXIMUM_SEARCH_TEXT_LENGTH, limitedLogHistoryQuery.searchText?.length)
    }

    @Test
    fun `rejects unknown sources and levels`() {
        assertFailsWith<InvalidLogRequestException> { logsService.parseLogHistoryQuery("kernel", null, null, null) }
        assertFailsWith<InvalidLogRequestException> { logsService.parseLogHistoryQuery("server", "LOUD", null, null) }
    }

    @Test
    fun `explains why phoenixd logs are not available`() {
        val remoteBackendAvailability = logsService.phoenixdAvailability(localPhoenixdConfigured = false)
        val missingFileAvailability = logsService.phoenixdAvailability(localPhoenixdConfigured = true)
        File(phoenixdDataDirectory, LogsService.PHOENIXD_LOG_FILE_NAME).writeText("")
        val availableAvailability = logsService.phoenixdAvailability(localPhoenixdConfigured = true)

        assertEquals(LogSourceUnavailableReasons.REMOTE_LIGHTNING_BACKEND, remoteBackendAvailability.unavailableReason)
        assertEquals(LogSourceUnavailableReasons.LOG_FILE_NOT_FOUND, missingFileAvailability.unavailableReason)
        assertTrue(availableAvailability.available)
    }

    @Test
    fun `returns no phoenixd entries when phoenixd runs remotely`() {
        File(phoenixdDataDirectory, LogsService.PHOENIXD_LOG_FILE_NAME)
            .writeText("2026-11-10T19:28:58.000000Z Info: (Peer) local line\n")
        val phoenixdLogHistoryQuery = logsService.parseLogHistoryQuery("phoenixd", null, null, null)

        assertEquals(emptyList(), logsService.readEntries(phoenixdLogHistoryQuery, localPhoenixdConfigured = false))
        assertEquals(1, logsService.readEntries(phoenixdLogHistoryQuery, localPhoenixdConfigured = true).size)
    }

    @Test
    fun `lists the active server log first and ignores unrelated files`() {
        writeServerLogFile("server.2026-11-18.0.log", "rotated")
        writeServerLogFile("server.log", "active")
        File(serverLogsDirectory, "notes.txt").writeText("not a log")

        val serverLogFileNames = logsService.serverLogFilesNewestFirst().map { serverLogFile -> serverLogFile.name }

        assertEquals(listOf("server.log", "server.2026-11-18.0.log"), serverLogFileNames)
    }

    @Test
    fun `writes diagnostics and log files into the archive`() {
        writeServerLogFile("server.log", "active")
        File(phoenixdDataDirectory, LogsService.PHOENIXD_LOG_FILE_NAME).writeText("phoenixd line\n")
        val logsArchiveOutputStream = ByteArrayOutputStream()

        logsService.writeLogsArchive(logsArchiveOutputStream, includePhoenixdLogs = false, diagnosticsSummary = "summary")

        val archivedFileNames = mutableListOf<String>()
        ZipInputStream(ByteArrayInputStream(logsArchiveOutputStream.toByteArray())).use { logsZipInputStream ->
            generateSequence { logsZipInputStream.nextEntry }.forEach { archivedEntry -> archivedFileNames.add(archivedEntry.name) }
        }
        assertEquals(listOf("diagnostics.txt", "server/server.log"), archivedFileNames)
        assertFalse(archivedFileNames.any { archivedFileName -> archivedFileName.startsWith("phoenixd/") })
    }

    @Test
    fun `shares source validation and availability between history and live stream`() {
        assertEquals(LogSourceIds.SERVER, logsService.parseLogSourceId(null))
        assertEquals(LogSourceIds.CLIENT, logsService.parseLogSourceId("client"))
        assertFailsWith<InvalidLogRequestException> { logsService.parseLogSourceId("kernel") }
        assertTrue(logsService.isLogSourceAvailable(LogSourceIds.SERVER, localPhoenixdConfigured = false))
        assertFalse(logsService.isLogSourceAvailable(LogSourceIds.PHOENIXD, localPhoenixdConfigured = false))
    }
}
