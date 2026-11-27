package pos.ambrosia.utest

import ch.qos.logback.classic.Level
import ch.qos.logback.classic.LoggerContext
import ch.qos.logback.classic.spi.LoggingEvent
import org.junit.After
import org.junit.Before
import pos.ambrosia.logging.InMemoryLogBufferAppender
import pos.ambrosia.logging.LoggerNames
import pos.ambrosia.logging.ServerLogBuffer
import pos.ambrosia.models.LogEntry
import pos.ambrosia.models.LogSourceIds
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ServerLogBufferTest {
    private val loggerContext = LoggerContext()

    @Before
    fun setUp() {
        ServerLogBuffer.clear()
    }

    @After
    fun tearDown() {
        ServerLogBuffer.clear()
    }

    private fun createLoggingEvent(
        loggerName: String,
        level: Level,
        message: String,
        throwable: Throwable? = null,
    ): LoggingEvent =
        LoggingEvent(
            LoggerNames::class.java.name,
            loggerContext.getLogger(loggerName),
            level,
            message,
            throwable,
            null,
        )

    @Test
    fun `keeps only the most recent entries`() {
        repeat(ServerLogBuffer.MAXIMUM_BUFFERED_ENTRIES + 5) { entryIndex ->
            ServerLogBuffer.append(
                LogEntry(
                    timestamp = "t$entryIndex",
                    level = "INFO",
                    source = LogSourceIds.SERVER,
                    logger = "Server",
                    message = "$entryIndex",
                ),
            )
        }

        val bufferedEntries = ServerLogBuffer.snapshot()

        assertEquals(ServerLogBuffer.MAXIMUM_BUFFERED_ENTRIES, bufferedEntries.size)
        assertEquals("5", bufferedEntries.first().message)
        assertEquals("${ServerLogBuffer.MAXIMUM_BUFFERED_ENTRIES + 4}", bufferedEntries.last().message)
    }

    @Test
    fun `appender stores redacted entries with source and exception details`() {
        val inMemoryLogBufferAppender = InMemoryLogBufferAppender().apply { context = loggerContext }
        inMemoryLogBufferAppender.start()

        inMemoryLogBufferAppender.doAppend(
            createLoggingEvent(LoggerNames.SERVER, Level.ERROR, "login failed password=hunter2", IllegalStateException("boom")),
        )
        inMemoryLogBufferAppender.doAppend(
            createLoggingEvent(LoggerNames.CLIENT, Level.WARN, "[browser] crash\nTypeError: x is undefined"),
        )

        val (serverEntry, clientEntry) = ServerLogBuffer.snapshot()
        assertEquals("ERROR", serverEntry.level)
        assertEquals(LogSourceIds.SERVER, serverEntry.source)
        assertEquals("login failed password=***", serverEntry.message)
        assertTrue(serverEntry.details.orEmpty().contains("IllegalStateException: boom"))
        assertEquals(LogSourceIds.CLIENT, clientEntry.source)
        assertEquals("[browser] crash", clientEntry.message)
        assertEquals("TypeError: x is undefined", clientEntry.details)
    }
}
