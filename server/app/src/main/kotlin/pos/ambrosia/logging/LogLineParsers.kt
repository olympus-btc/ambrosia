package pos.ambrosia.logging

import pos.ambrosia.models.LogEntry
import pos.ambrosia.models.LogSourceIds

fun interface LogHeaderLineParser {
    fun parseHeaderLineOrNull(logLine: String): LogEntry?
}

object ServerLogHeaderLineParser : LogHeaderLineParser {
    private val serverHeaderLinePattern =
        Regex(
            "^(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(?:Z|[+-]\\d{2}:\\d{2})) " +
                "(TRACE|DEBUG|INFO|WARN|ERROR)\\s+\\[([^\\]]*)] (\\S+) - (.*)$",
        )

    override fun parseHeaderLineOrNull(logLine: String): LogEntry? {
        val serverHeaderLineMatch = serverHeaderLinePattern.matchEntire(logLine) ?: return null
        val (timestamp, level, thread, loggerName, message) = serverHeaderLineMatch.destructured
        return LogEntry(
            timestamp = timestamp,
            level = level,
            source = sourceIdForLoggerName(loggerName),
            logger = loggerName,
            message = message,
            thread = thread,
        )
    }
}

object PhoenixdLogHeaderLineParser : LogHeaderLineParser {
    private val phoenixdHeaderLinePattern =
        Regex("^(\\d{4}-\\d{2}-\\d{2}T[\\d:.]+Z) (Verbose|Debug|Info|Warn|Error|Assert): (?:\\(([^)]*)\\) )?(.*)$")

    private val logLevelByPhoenixdSeverity =
        mapOf(
            "Verbose" to LogLevels.TRACE,
            "Debug" to LogLevels.DEBUG,
            "Info" to LogLevels.INFO,
            "Warn" to LogLevels.WARN,
            "Error" to LogLevels.ERROR,
            "Assert" to LogLevels.ERROR,
        )

    override fun parseHeaderLineOrNull(logLine: String): LogEntry? {
        val phoenixdHeaderLineMatch = phoenixdHeaderLinePattern.matchEntire(logLine) ?: return null
        val (timestamp, phoenixdSeverity, loggerName, message) = phoenixdHeaderLineMatch.destructured
        return LogEntry(
            timestamp = timestamp,
            level = logLevelByPhoenixdSeverity.getValue(phoenixdSeverity),
            source = LogSourceIds.PHOENIXD,
            logger = loggerName.ifBlank { "phoenixd" },
            message = message,
        )
    }
}

class LogEntryGrouper(
    private val headerLineParser: LogHeaderLineParser,
) {
    private var pendingEntry: LogEntry? = null
    private val pendingDetailLines = mutableListOf<String>()

    fun acceptLine(logLine: String): LogEntry? {
        val parsedHeaderEntry = headerLineParser.parseHeaderLineOrNull(logLine)
        if (parsedHeaderEntry == null) {
            if (pendingEntry != null && logLine.isNotBlank()) pendingDetailLines.add(logLine)
            return null
        }
        val completedEntry = flush()
        pendingEntry = parsedHeaderEntry
        return completedEntry
    }

    fun flush(): LogEntry? {
        val completedEntry = pendingEntry ?: return null
        val details = pendingDetailLines.joinToString("\n").ifBlank { null }
        pendingEntry = null
        pendingDetailLines.clear()
        return if (details == null) completedEntry else completedEntry.copy(details = details)
    }
}

fun parseLogLines(
    logLines: List<String>,
    headerLineParser: LogHeaderLineParser,
): List<LogEntry> {
    val logEntryGrouper = LogEntryGrouper(headerLineParser)
    val parsedEntries = mutableListOf<LogEntry>()
    logLines.forEach { logLine -> logEntryGrouper.acceptLine(logLine)?.let(parsedEntries::add) }
    logEntryGrouper.flush()?.let(parsedEntries::add)
    return parsedEntries
}
