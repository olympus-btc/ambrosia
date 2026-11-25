package pos.ambrosia.utest

import ch.qos.logback.classic.AsyncAppender
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.LoggerContext
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.classic.util.LogbackMDCAdapter
import ch.qos.logback.core.rolling.RollingFileAppender
import ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy
import org.junit.After
import pos.ambrosia.logging.LogFileRetention
import pos.ambrosia.logging.LoggingConfiguration
import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class LoggingConfigurationFileRetentionTest {
    private val logsDirectory: File = Files.createTempDirectory("loggingConfigurationFileRetentionTest").toFile()
    private val isolatedLoggerContext = LoggerContext().apply { setMDCAdapter(LogbackMDCAdapter()) }
    private val isolatedRootLogger: Logger = isolatedLoggerContext.getLogger(Logger.ROOT_LOGGER_NAME)

    @After
    fun tearDown() {
        isolatedLoggerContext.stop()
        logsDirectory.deleteRecursively()
    }

    private fun currentAsyncFileAppender(): AsyncAppender? =
        isolatedRootLogger.getAppender(LoggingConfiguration.ASYNC_FILE_APPENDER_NAME) as? AsyncAppender

    @Suppress("UNCHECKED_CAST")
    private fun rollingPolicyOf(asyncFileAppender: AsyncAppender): SizeAndTimeBasedRollingPolicy<ILoggingEvent> {
        val rollingFileAppender =
            asyncFileAppender.getAppender(LoggingConfiguration.FILE_APPENDER_NAME) as RollingFileAppender<ILoggingEvent>
        return rollingFileAppender.rollingPolicy as SizeAndTimeBasedRollingPolicy<ILoggingEvent>
    }

    @Test
    fun `replaces the file appender with the new retention and keeps writing to the same file`() {
        LoggingConfiguration.replaceFileAppender(isolatedLoggerContext, isolatedRootLogger, logsDirectory, LogFileRetention.DEFAULT)
        val firstAsyncFileAppender = assertNotNull(currentAsyncFileAppender())
        assertEquals(LogFileRetention.DEFAULT_RETENTION_DAYS, rollingPolicyOf(firstAsyncFileAppender).maxHistory)

        LoggingConfiguration.replaceFileAppender(isolatedLoggerContext, isolatedRootLogger, logsDirectory, LogFileRetention(30, 100))

        val replacedAsyncFileAppender = assertNotNull(currentAsyncFileAppender())
        assertFalse(firstAsyncFileAppender.isStarted)
        assertTrue(replacedAsyncFileAppender.isStarted)
        assertEquals(30, rollingPolicyOf(replacedAsyncFileAppender).maxHistory)
        assertEquals(1, isolatedRootLogger.iteratorForAppenders().asSequence().count())

        isolatedRootLogger.info("written after the retention changed")
        isolatedLoggerContext.stop()
        val serverLogFile = File(logsDirectory, LoggingConfiguration.SERVER_LOG_FILE_NAME)
        assertTrue(serverLogFile.readText().contains("written after the retention changed"))
    }
}
