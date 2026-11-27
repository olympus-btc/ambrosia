package pos.ambrosia.services

import pos.ambrosia.datadir
import pos.ambrosia.logging.LoggingConfiguration
import pos.ambrosia.phoenixDatadir
import java.time.Instant
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

object LogsDiagnostics {
    private val archiveFileNameTimestampFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd-HHmmss")

    fun archiveFileName(generatedAt: LocalDateTime = LocalDateTime.now()): String =
        "ambrosia-logs-${archiveFileNameTimestampFormatter.format(generatedAt)}.zip"

    fun buildSummary(
        deploymentModeName: String,
        lightningBackendName: String,
    ): String =
        buildString {
            appendLine("Ambrosia version: ${LogsDiagnostics::class.java.`package`?.implementationVersion ?: "dev"}")
            appendLine("Generated at: ${Instant.now()}")
            appendLine("Deployment: $deploymentModeName")
            appendLine("Lightning backend: $lightningBackendName")
            appendLine("Server log level: ${LoggingConfiguration.currentLevel()}")
            appendLine(
                "Operating system: ${System.getProperty("os.name")} ${System.getProperty("os.version")} " +
                    "(${System.getProperty("os.arch")})",
            )
            appendLine("Java: ${System.getProperty("java.version")} (${System.getProperty("java.vendor")})")
            appendLine("Data directory: $datadir")
            appendLine("Phoenixd data directory: $phoenixDatadir")
        }
}
