package pos.ambrosia.utest

import pos.ambrosia.logging.LogLevels
import pos.ambrosia.logging.PhoenixdLogHeaderLineParser
import pos.ambrosia.logging.ServerLogHeaderLineParser
import pos.ambrosia.logging.parseLogLines
import pos.ambrosia.models.LogSourceIds
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class LogLineParsersTest {
    @Test
    fun `parses server header lines and groups stack trace lines as details`() {
        val serverLogLines =
            listOf(
                "2026-11-19T10:21:03.123-06:00 INFO  [main] Server - Starting Ambrosia",
                "2026-11-19T10:21:04.456-06:00 ERROR [eventLoop-1] Server - Unhandled exception: boom",
                "java.lang.IllegalStateException: boom",
                "\tat pos.ambrosia.Api.module(Api.kt:10)",
                "2026-11-19T10:21:05.000Z WARN  [eventLoop-2] Client - [browser] TypeError url=/store",
            )

        val parsedEntries = parseLogLines(serverLogLines, ServerLogHeaderLineParser)

        assertEquals(3, parsedEntries.size)
        assertEquals(LogLevels.INFO, parsedEntries[0].level)
        assertEquals("Starting Ambrosia", parsedEntries[0].message)
        assertEquals("main", parsedEntries[0].thread)
        assertNull(parsedEntries[0].details)
        assertEquals(LogLevels.ERROR, parsedEntries[1].level)
        assertEquals(
            "java.lang.IllegalStateException: boom\n\tat pos.ambrosia.Api.module(Api.kt:10)",
            parsedEntries[1].details,
        )
        assertEquals(LogSourceIds.SERVER, parsedEntries[1].source)
        assertEquals(LogSourceIds.CLIENT, parsedEntries[2].source)
        assertEquals("Client", parsedEntries[2].logger)
    }

    @Test
    fun `ignores continuation lines that appear before the first header`() {
        val serverLogLines =
            listOf(
                "\tat orphan.Frame(Orphan.kt:1)",
                "2026-11-19T10:21:03.123-06:00 INFO  [main] Server - first complete entry",
            )

        val parsedEntries = parseLogLines(serverLogLines, ServerLogHeaderLineParser)

        assertEquals(1, parsedEntries.size)
        assertEquals("first complete entry", parsedEntries.single().message)
    }

    @Test
    fun `parses phoenixd lines and maps its severities to log levels`() {
        val phoenixdLogLines =
            listOf(
                "2026-11-10T19:28:58.876243Z Info: (fr.acinq.lightning.io.Peer) connection state changed: CLOSED",
                "    remoteNodeId: 03933884aaf1",
                "2026-11-10T19:29:00.000001Z Warn: (fr.acinq.lightning.blockchain) electrum timeout",
                "2026-11-10T19:29:01.000001Z Verbose: no logger name here",
            )

        val parsedEntries = parseLogLines(phoenixdLogLines, PhoenixdLogHeaderLineParser)

        assertEquals(3, parsedEntries.size)
        assertEquals(LogLevels.INFO, parsedEntries[0].level)
        assertEquals("fr.acinq.lightning.io.Peer", parsedEntries[0].logger)
        assertEquals("connection state changed: CLOSED", parsedEntries[0].message)
        assertEquals("    remoteNodeId: 03933884aaf1", parsedEntries[0].details)
        assertEquals(LogLevels.WARN, parsedEntries[1].level)
        assertEquals(LogLevels.TRACE, parsedEntries[2].level)
        assertEquals("phoenixd", parsedEntries[2].logger)
        assertEquals(LogSourceIds.PHOENIXD, parsedEntries[2].source)
    }
}
