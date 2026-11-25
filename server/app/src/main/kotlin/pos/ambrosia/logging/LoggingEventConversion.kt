package pos.ambrosia.logging

import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.classic.spi.ThrowableProxyUtil
import pos.ambrosia.models.LogEntry
import pos.ambrosia.models.LogSourceIds
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

object LoggerNames {
    const val SERVER = "Server"
    const val CLIENT = "Client"
    const val HTTP_REQUESTS = "HttpRequests"
}

object LogTimestamps {
    const val LOGBACK_PATTERN = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"

    private val formatter = DateTimeFormatter.ofPattern(LOGBACK_PATTERN).withZone(ZoneId.systemDefault())

    fun format(instant: Instant): String = formatter.format(instant)
}

fun sourceIdForLoggerName(loggerName: String): String = if (loggerName == LoggerNames.CLIENT) LogSourceIds.CLIENT else LogSourceIds.SERVER

fun ILoggingEvent.toLogEntry(): LogEntry {
    val redactedMessage = LogRedaction.redact(formattedMessage.orEmpty())
    val firstMessageLine = redactedMessage.substringBefore('\n')
    val remainingMessageLines = redactedMessage.substringAfter('\n', missingDelimiterValue = "")
    val throwableText =
        throwableProxy?.let { loggedThrowableProxy ->
            LogRedaction.redact(ThrowableProxyUtil.asString(loggedThrowableProxy))
        }
    val details =
        listOfNotNull(remainingMessageLines.ifBlank { null }, throwableText?.ifBlank { null })
            .joinToString("\n")
            .ifBlank { null }

    return LogEntry(
        timestamp = LogTimestamps.format(Instant.ofEpochMilli(timeStamp)),
        level = level.toString(),
        source = sourceIdForLoggerName(loggerName),
        logger = loggerName,
        message = firstMessageLine,
        thread = threadName,
        details = details,
    )
}
