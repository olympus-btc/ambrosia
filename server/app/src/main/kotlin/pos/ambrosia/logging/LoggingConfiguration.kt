package pos.ambrosia.logging

import ch.qos.logback.classic.AsyncAppender
import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.LoggerContext
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.ConsoleAppender
import ch.qos.logback.core.encoder.LayoutWrappingEncoder
import ch.qos.logback.core.rolling.RollingFileAppender
import ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy
import ch.qos.logback.core.util.FileSize
import org.slf4j.LoggerFactory
import java.io.File

object LoggingConfiguration {
    const val LOGS_DIRECTORY_NAME = "logs"
    const val SERVER_LOG_FILE_NAME = "server.log"
    const val SERVER_LOG_FILE_PREFIX = "server"
    const val MAXIMUM_SINGLE_FILE_SIZE = "2MB"

    private const val CONSOLE_APPENDER_NAME = "AMBROSIA_CONSOLE"
    internal const val FILE_APPENDER_NAME = "AMBROSIA_FILE"
    internal const val ASYNC_FILE_APPENDER_NAME = "AMBROSIA_FILE_ASYNC"
    private const val MEMORY_BUFFER_APPENDER_NAME = "AMBROSIA_MEMORY_BUFFER"
    private const val XML_CONSOLE_APPENDER_NAME = "STDOUT"
    private const val ASYNC_QUEUE_SIZE = 1024
    private const val KEEP_ALL_LEVELS_UNTIL_QUEUE_IS_FULL = 0

    const val CONSOLE_PATTERN = "%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level %msg%n"
    const val FILE_PATTERN = "%d{${LogTimestamps.LOGBACK_PATTERN}} %-5level [%thread] %logger - %msg%n"

    private val libraryLoggerLevels =
        mapOf(
            "org.flywaydb.core" to Level.WARN,
            "io.netty" to Level.INFO,
            "io.ktor" to Level.INFO,
            "com.zaxxer.hikari" to Level.INFO,
            "Exposed" to Level.INFO,
            "ch.qos.logback" to Level.OFF,
        )

    private val fileAppenderReplacementLock = Any()

    @Volatile
    private var serverLogsDirectory: File? = null

    @Volatile
    private var appliedFileRetention: LogFileRetention = LogFileRetention.DEFAULT

    fun logsDirectory(dataDirectory: String): File = File(dataDirectory, LOGS_DIRECTORY_NAME)

    fun install(
        dataDirectory: String,
        fileRetention: LogFileRetention = LogFileRetention.DEFAULT,
    ) {
        val loggerContext = LoggerFactory.getILoggerFactory() as? LoggerContext ?: return
        val rootLogger = loggerContext.getLogger(Logger.ROOT_LOGGER_NAME)
        if (rootLogger.getAppender(MEMORY_BUFFER_APPENDER_NAME) != null) return

        libraryLoggerLevels.forEach { (loggerName, level) -> loggerContext.getLogger(loggerName).level = level }

        rootLogger.detachAppender(XML_CONSOLE_APPENDER_NAME)
        rootLogger.addAppender(createConsoleAppender(loggerContext))
        rootLogger.addAppender(createMemoryBufferAppender(loggerContext))

        appliedFileRetention = fileRetention
        val logsDirectory = logsDirectory(dataDirectory)
        if (logsDirectory.mkdirs() || logsDirectory.isDirectory) {
            serverLogsDirectory = logsDirectory
            replaceFileAppender(loggerContext, rootLogger, logsDirectory, fileRetention)
        } else {
            System.err.println("Unable to create logs directory ${logsDirectory.absolutePath}")
        }

        applyLevel(LogLevels.DEFAULT_SERVER_LEVEL)
        Runtime.getRuntime().addShutdownHook(Thread { loggerContext.stop() })
    }

    fun applyLevel(levelName: String) {
        val loggerContext = LoggerFactory.getILoggerFactory() as? LoggerContext ?: return
        val normalizedLevelName = LogLevels.normalizeOrNull(levelName) ?: LogLevels.DEFAULT_SERVER_LEVEL
        loggerContext.getLogger(Logger.ROOT_LOGGER_NAME).level = Level.toLevel(normalizedLevelName)
    }

    fun applyFileRetention(fileRetention: LogFileRetention) {
        val loggerContext = LoggerFactory.getILoggerFactory() as? LoggerContext ?: return
        synchronized(fileAppenderReplacementLock) {
            if (fileRetention == appliedFileRetention) return
            appliedFileRetention = fileRetention
            val logsDirectory = serverLogsDirectory ?: return
            replaceFileAppender(loggerContext, loggerContext.getLogger(Logger.ROOT_LOGGER_NAME), logsDirectory, fileRetention)
        }
    }

    fun currentFileRetention(): LogFileRetention = appliedFileRetention

    internal fun replaceFileAppender(
        loggerContext: LoggerContext,
        rootLogger: Logger,
        logsDirectory: File,
        fileRetention: LogFileRetention,
    ) {
        (rootLogger.getAppender(ASYNC_FILE_APPENDER_NAME) as? AsyncAppender)?.let { previousAsyncFileAppender ->
            val previousRollingFileAppender = previousAsyncFileAppender.getAppender(FILE_APPENDER_NAME)
            rootLogger.detachAppender(previousAsyncFileAppender)
            previousAsyncFileAppender.stop()
            previousRollingFileAppender?.stop()
        }
        runCatching { createAsyncFileAppender(loggerContext, logsDirectory, fileRetention) }
            .onSuccess { asyncFileAppender -> rootLogger.addAppender(asyncFileAppender) }
            .onFailure { fileAppenderError ->
                System.err.println("Unable to write log files to ${logsDirectory.absolutePath}: ${fileAppenderError.message}")
            }
    }

    fun currentLevel(): String {
        val loggerContext = LoggerFactory.getILoggerFactory() as? LoggerContext ?: return LogLevels.DEFAULT_SERVER_LEVEL
        return loggerContext.getLogger(Logger.ROOT_LOGGER_NAME).level?.toString() ?: LogLevels.DEFAULT_SERVER_LEVEL
    }

    private fun createRedactingEncoder(
        loggerContext: LoggerContext,
        pattern: String,
    ): LayoutWrappingEncoder<ILoggingEvent> {
        val redactingLayout =
            RedactingPatternLayout().apply {
                context = loggerContext
                this.pattern = pattern
                start()
            }
        return LayoutWrappingEncoder<ILoggingEvent>().apply {
            context = loggerContext
            layout = redactingLayout
            start()
        }
    }

    private fun createConsoleAppender(loggerContext: LoggerContext): ConsoleAppender<ILoggingEvent> =
        ConsoleAppender<ILoggingEvent>().apply {
            context = loggerContext
            name = CONSOLE_APPENDER_NAME
            encoder = createRedactingEncoder(loggerContext, CONSOLE_PATTERN)
            start()
        }

    private fun createMemoryBufferAppender(loggerContext: LoggerContext): InMemoryLogBufferAppender =
        InMemoryLogBufferAppender().apply {
            context = loggerContext
            name = MEMORY_BUFFER_APPENDER_NAME
            start()
        }

    private fun createAsyncFileAppender(
        loggerContext: LoggerContext,
        logsDirectory: File,
        fileRetention: LogFileRetention,
    ): AsyncAppender {
        val rollingFileAppender =
            RollingFileAppender<ILoggingEvent>().apply {
                context = loggerContext
                name = FILE_APPENDER_NAME
                file = File(logsDirectory, SERVER_LOG_FILE_NAME).absolutePath
                isAppend = true
            }
        val sizeAndTimeBasedRollingPolicy =
            SizeAndTimeBasedRollingPolicy<ILoggingEvent>().apply {
                context = loggerContext
                setParent(rollingFileAppender)
                fileNamePattern = File(logsDirectory, "$SERVER_LOG_FILE_PREFIX.%d{yyyy-MM-dd}.%i.log").absolutePath
                setMaxFileSize(FileSize.valueOf(MAXIMUM_SINGLE_FILE_SIZE))
                maxHistory = fileRetention.retentionDays
                setTotalSizeCap(FileSize.valueOf("${fileRetention.maximumTotalSizeMegabytes}MB"))
                isCleanHistoryOnStart = true
                start()
            }
        rollingFileAppender.rollingPolicy = sizeAndTimeBasedRollingPolicy
        rollingFileAppender.triggeringPolicy = sizeAndTimeBasedRollingPolicy
        rollingFileAppender.encoder = createRedactingEncoder(loggerContext, FILE_PATTERN)
        rollingFileAppender.start()
        check(rollingFileAppender.isStarted) { "Rolling file appender failed to start" }

        return AsyncAppender().apply {
            context = loggerContext
            name = ASYNC_FILE_APPENDER_NAME
            queueSize = ASYNC_QUEUE_SIZE
            discardingThreshold = KEEP_ALL_LEVELS_UNTIL_QUEUE_IS_FULL
            isNeverBlock = true
            addAppender(rollingFileAppender)
            start()
        }
    }
}
