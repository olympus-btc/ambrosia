package pos.ambrosia.models

import kotlinx.serialization.Serializable
import pos.ambrosia.utils.requireMaxLength
import pos.ambrosia.utils.requireValid

object LogSourceIds {
    const val SERVER = "server"
    const val PHOENIXD = "phoenixd"
    const val CLIENT = "client"

    val ALL = listOf(SERVER, PHOENIXD, CLIENT)
}

object LogSourceUnavailableReasons {
    const val REMOTE_LIGHTNING_BACKEND = "remote_lightning_backend"
    const val LOG_FILE_NOT_FOUND = "log_file_not_found"
    const val LOG_FILE_NOT_READABLE = "log_file_not_readable"
}

object LogStreamEventTypes {
    const val CONNECTED = "connected"
    const val ENTRY = "entry"
}

object ClientLogReportOrigins {
    const val BROWSER = "browser"
    const val NEXT_SERVER = "next-server"

    val ALL = setOf(BROWSER, NEXT_SERVER)
}

object ClientLogReportLimits {
    const val MAXIMUM_LEVEL_LENGTH = 10
    const val MAXIMUM_ERROR_MESSAGE_LENGTH = 2000
    const val MAXIMUM_STACK_TRACE_LENGTH = 8000
    const val MAXIMUM_URL_LENGTH = 500
    const val MAXIMUM_USER_AGENT_LENGTH = 300
    const val MAXIMUM_ORIGIN_LENGTH = 20
    const val MAXIMUM_CONTEXT_ENTRIES = 10
    const val MAXIMUM_CONTEXT_KEY_LENGTH = 50
    const val MAXIMUM_CONTEXT_VALUE_LENGTH = 200
}

@Serializable
data class LogEntry(
    val timestamp: String,
    val level: String,
    val source: String,
    val logger: String,
    val message: String,
    val thread: String? = null,
    val details: String? = null,
)

@Serializable
data class LogEntriesResponse(
    val entries: List<LogEntry>,
)

@Serializable
data class LogSourceAvailability(
    val id: String,
    val available: Boolean,
    val unavailableReason: String? = null,
)

@Serializable
data class LogSourcesResponse(
    val sources: List<LogSourceAvailability>,
)

@Serializable
data class LogSettings(
    val level: String,
    val retentionDays: Int,
    val maximumTotalSizeMegabytes: Int,
    val clientErrorReportingEnabled: Boolean,
)

@Serializable
data class LogStreamEvent(
    val type: String,
    val entry: LogEntry? = null,
)

@Serializable
data class ClientLogReport(
    val level: String = "ERROR",
    val errorMessage: String,
    val stackTrace: String? = null,
    val url: String? = null,
    val userAgent: String? = null,
    val origin: String = ClientLogReportOrigins.BROWSER,
    val context: Map<String, String> = emptyMap(),
) {
    init {
        requireMaxLength(level, ClientLogReportLimits.MAXIMUM_LEVEL_LENGTH, "level")
        requireMaxLength(errorMessage, ClientLogReportLimits.MAXIMUM_ERROR_MESSAGE_LENGTH, "errorMessage")
        requireMaxLength(stackTrace, ClientLogReportLimits.MAXIMUM_STACK_TRACE_LENGTH, "stackTrace")
        requireMaxLength(url, ClientLogReportLimits.MAXIMUM_URL_LENGTH, "url")
        requireMaxLength(userAgent, ClientLogReportLimits.MAXIMUM_USER_AGENT_LENGTH, "userAgent")
        requireMaxLength(origin, ClientLogReportLimits.MAXIMUM_ORIGIN_LENGTH, "origin")
        requireValid(context.size <= ClientLogReportLimits.MAXIMUM_CONTEXT_ENTRIES) {
            "context must have at most ${ClientLogReportLimits.MAXIMUM_CONTEXT_ENTRIES} entries"
        }
        context.forEach { (contextKey, contextValue) ->
            requireMaxLength(contextKey, ClientLogReportLimits.MAXIMUM_CONTEXT_KEY_LENGTH, "context key")
            requireMaxLength(contextValue, ClientLogReportLimits.MAXIMUM_CONTEXT_VALUE_LENGTH, "context value")
        }
    }
}
