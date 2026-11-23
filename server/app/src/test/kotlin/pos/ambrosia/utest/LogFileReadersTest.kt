package pos.ambrosia.utest

import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import pos.ambrosia.logging.LogEntryFilter
import pos.ambrosia.logging.LogFileFollower
import pos.ambrosia.logging.LogFileTailReader
import pos.ambrosia.logging.LogLevels
import pos.ambrosia.logging.PhoenixdLogHeaderLineParser
import pos.ambrosia.logging.ServerLogHeaderLineParser
import pos.ambrosia.models.LogSourceIds
import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.time.Duration.Companion.milliseconds

class LogFileReadersTest {
    private fun serverLogLine(
        minute: Int,
        level: String,
        loggerName: String,
        message: String,
    ): String = "2026-11-19T10:%02d:00.000-06:00 %-5s [main] %s - %s".format(minute, level, loggerName, message)

    private fun createTemporaryLogFile(
        fileName: String,
        lines: List<String>,
    ): File {
        val temporaryDirectory = Files.createTempDirectory("logFileReadersTest").toFile()
        return File(temporaryDirectory, fileName).apply { writeText(lines.joinToString("\n", postfix = "\n")) }
    }

    @Test
    fun `returns the latest entries across files in chronological order`() {
        val rotatedLogFile =
            createTemporaryLogFile(
                "server.2026-11-18.0.log",
                listOf(serverLogLine(1, "INFO", "Server", "rotated first"), serverLogLine(2, "INFO", "Server", "rotated second")),
            )
        val activeLogFile =
            createTemporaryLogFile(
                "server.log",
                listOf(serverLogLine(3, "INFO", "Server", "active first"), serverLogLine(4, "INFO", "Server", "active second")),
            )

        val latestEntries =
            LogFileTailReader(ServerLogHeaderLineParser).readLatestEntries(
                listOf(activeLogFile, rotatedLogFile),
                maximumEntries = 3,
                filter = LogEntryFilter(),
            )

        assertEquals(listOf("rotated second", "active first", "active second"), latestEntries.map { latestEntry -> latestEntry.message })
    }

    @Test
    fun `filters entries by source minimum level and search text`() {
        val activeLogFile =
            createTemporaryLogFile(
                "server.log",
                listOf(
                    serverLogLine(1, "DEBUG", "Server", "debug payment detail"),
                    serverLogLine(2, "WARN", "Server", "payment retry"),
                    serverLogLine(3, "ERROR", "Client", "payment screen crashed"),
                    serverLogLine(4, "ERROR", "Server", "database locked"),
                ),
            )
        val tailReader = LogFileTailReader(ServerLogHeaderLineParser)

        val serverWarningsAboutPayments =
            tailReader.readLatestEntries(
                listOf(activeLogFile),
                maximumEntries = 10,
                filter = LogEntryFilter(sourceId = LogSourceIds.SERVER, minimumLevel = LogLevels.WARN, searchText = "PAYMENT"),
            )
        val clientEntries =
            tailReader.readLatestEntries(
                listOf(activeLogFile),
                maximumEntries = 10,
                filter = LogEntryFilter(sourceId = LogSourceIds.CLIENT),
            )

        assertEquals(listOf("payment retry"), serverWarningsAboutPayments.map { serverWarning -> serverWarning.message })
        assertEquals(listOf("payment screen crashed"), clientEntries.map { clientEntry -> clientEntry.message })
    }

    @Test
    fun `reads only the tail of large files within the byte budget`() {
        val manyLines = (0 until 50).map { lineIndex -> serverLogLine(lineIndex, "INFO", "Server", "line $lineIndex") }
        val activeLogFile = createTemporaryLogFile("server.log", manyLines)
        val bytesForAboutTenLines = manyLines.takeLast(10).sumOf { serverLogLine -> serverLogLine.length + 1 }.toLong()

        val latestEntries =
            LogFileTailReader(ServerLogHeaderLineParser, maximumBytesToRead = bytesForAboutTenLines).readLatestEntries(
                listOf(activeLogFile),
                maximumEntries = 100,
                filter = LogEntryFilter(),
            )

        assertEquals("line 49", latestEntries.last().message)
        assertEquals(true, latestEntries.size in 9..10)
    }

    @Test
    fun `follower emits appended lines and restarts after the file is truncated`() =
        runBlocking {
            val phoenixdLogFile =
                createTemporaryLogFile("phoenix.log", listOf("2026-11-10T19:28:58.000000Z Info: (Peer) existing line"))
            val logFileFollower = LogFileFollower(phoenixdLogFile, PhoenixdLogHeaderLineParser, pollInterval = 20.milliseconds)

            val followedEntries =
                async {
                    withTimeout(5_000) { logFileFollower.follow().take(2).toList() }
                }
            delay(100)
            phoenixdLogFile.appendText("2026-11-10T19:29:00.000000Z Warn: (Peer) appended line\n")
            delay(150)
            phoenixdLogFile.writeText("2026-11-10T19:30:00.000000Z Error: (Peer) after rotation\n")

            val followedMessages = followedEntries.await().map { followedLogEntry -> followedLogEntry.message }

            assertEquals(listOf("appended line", "after rotation"), followedMessages)
        }

    @Test
    fun `follower restarts from the beginning when the file is replaced by a larger one`() =
        runBlocking {
            val phoenixdLogFile =
                createTemporaryLogFile("phoenix.log", listOf("2026-11-10T19:28:58.000000Z Info: (Peer) short"))
            val logFileFollower = LogFileFollower(phoenixdLogFile, PhoenixdLogHeaderLineParser, pollInterval = 20.milliseconds)

            val followedEntries =
                async {
                    withTimeout(5_000) { logFileFollower.follow().take(1).toList() }
                }
            delay(100)
            val rotatedPhoenixdLogFile = File(phoenixdLogFile.parentFile, "phoenix-1.log")
            check(phoenixdLogFile.renameTo(rotatedPhoenixdLogFile))
            File(phoenixdLogFile.parentFile, "phoenix.log")
                .writeText("2026-11-10T19:30:00.000000Z Warn: (Peer) first line of a much longer replacement log file\n")

            assertEquals(
                listOf("first line of a much longer replacement log file"),
                followedEntries.await().map { followedLogEntry -> followedLogEntry.message },
            )
        }
}
