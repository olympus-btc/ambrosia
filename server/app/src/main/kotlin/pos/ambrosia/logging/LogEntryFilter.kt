package pos.ambrosia.logging

import pos.ambrosia.models.LogEntry

data class LogEntryFilter(
    val sourceId: String? = null,
    val minimumLevel: String? = null,
    val searchText: String? = null,
) {
    fun matches(logEntry: LogEntry): Boolean {
        if (sourceId != null && logEntry.source != sourceId) return false
        if (!LogLevels.isAtLeast(logEntry.level, minimumLevel)) return false
        val normalizedSearchText = searchText?.trim()?.takeIf { trimmedSearchText -> trimmedSearchText.isNotEmpty() } ?: return true
        return listOfNotNull(logEntry.message, logEntry.logger, logEntry.details)
            .any { searchableLogText -> searchableLogText.contains(normalizedSearchText, ignoreCase = true) }
    }
}
