package pos.ambrosia.models

import kotlinx.serialization.Serializable

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
data class LogLevelSetting(
    val level: String,
)

@Serializable
data class LogStreamEvent(
    val type: String,
    val entry: LogEntry? = null,
)

@Serializable
data class ClientLogReport(
    val level: String = "ERROR",
    val message: String,
    val stack: String? = null,
    val url: String? = null,
    val userAgent: String? = null,
    val origin: String = ClientLogReportOrigins.BROWSER,
    val context: Map<String, String> = emptyMap(),
)
