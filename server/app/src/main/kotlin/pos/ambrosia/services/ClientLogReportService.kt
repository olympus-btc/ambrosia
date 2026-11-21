package pos.ambrosia.services

import org.slf4j.LoggerFactory
import pos.ambrosia.logging.LogLevels
import pos.ambrosia.logging.LoggerNames
import pos.ambrosia.models.ClientLogReport
import pos.ambrosia.models.ClientLogReportOrigins

object ClientLogReportService {
    private val lineBreaksPattern = Regex("[\\r\\n]+")
    private val acceptedClientLevels = setOf(LogLevels.ERROR, LogLevels.WARN, LogLevels.INFO)
    private val clientLogger = LoggerFactory.getLogger(LoggerNames.CLIENT)

    fun record(
        report: ClientLogReport,
        reportingUserId: String?,
    ) {
        val clientLevel =
            LogLevels.normalizeOrNull(report.level)?.takeIf { normalizedLevel -> normalizedLevel in acceptedClientLevels }
                ?: LogLevels.ERROR
        val formattedReport = formatReport(report, reportingUserId)
        when (clientLevel) {
            LogLevels.ERROR -> clientLogger.error("{}", formattedReport)
            LogLevels.WARN -> clientLogger.warn("{}", formattedReport)
            else -> clientLogger.info("{}", formattedReport)
        }
    }

    fun formatReport(
        report: ClientLogReport,
        reportingUserId: String?,
    ): String {
        val reportOrigin =
            report.origin.takeIf { reportedOrigin -> reportedOrigin in ClientLogReportOrigins.ALL } ?: ClientLogReportOrigins.BROWSER
        val summaryLine =
            buildString {
                append("[$reportOrigin] ")
                append(report.message.toSingleLine())
                report.url?.takeIf { reportedUrl -> reportedUrl.isNotBlank() }?.let { reportedUrl ->
                    append(" url=${reportedUrl.toSingleLine()}")
                }
                reportingUserId?.let { userId -> append(" user=$userId") }
                report.context.forEach { (contextKey, contextValue) ->
                    append(" ${contextKey.toSingleLine()}=${contextValue.toSingleLine()}")
                }
            }
        val detailLines =
            listOfNotNull(
                report.userAgent?.takeIf { reportedUserAgent -> reportedUserAgent.isNotBlank() }?.let { reportedUserAgent ->
                    "userAgent: ${reportedUserAgent.toSingleLine()}"
                },
                report.stack?.takeIf { reportedStack -> reportedStack.isNotBlank() },
            )
        return (listOf(summaryLine) + detailLines).joinToString("\n")
    }

    private fun String.toSingleLine(): String = replace(lineBreaksPattern, " ").trim()
}
