package pos.ambrosia.services

import pos.ambrosia.logger
import java.util.concurrent.TimeUnit
import javax.print.PrintService
import javax.print.attribute.standard.PrinterURI

fun interface PrinterQueueCanceller {
    fun cancelAllJobs(systemPrintService: PrintService)

    companion object {
        fun forCurrentOperatingSystem(): PrinterQueueCanceller {
            val operatingSystemName = System.getProperty("os.name").orEmpty().lowercase()
            return if (operatingSystemName.contains("windows")) {
                WindowsSpoolerQueueCanceller()
            } else {
                CupsQueueCanceller()
            }
        }
    }
}

class CupsQueueCanceller(
    private val commandRunner: SystemCommandRunner = SystemCommandRunner(),
) : PrinterQueueCanceller {
    override fun cancelAllJobs(systemPrintService: PrintService) {
        val cupsQueueName = resolveCupsQueueName(systemPrintService)
        commandRunner.run(listOf("cancel", "-a", cupsQueueName), emptyMap())
    }

    private fun resolveCupsQueueName(systemPrintService: PrintService): String {
        val printerUriPath =
            runCatching { systemPrintService.getAttribute(PrinterURI::class.java)?.uri?.path }.getOrNull()
        val queueNameFromUri = printerUriPath?.substringAfterLast('/')?.takeIf { queueName -> queueName.isNotBlank() }
        return queueNameFromUri ?: systemPrintService.name
    }
}

class WindowsSpoolerQueueCanceller(
    private val commandRunner: SystemCommandRunner = SystemCommandRunner(),
) : PrinterQueueCanceller {
    companion object {
        private const val PRINTER_NAME_ENVIRONMENT_VARIABLE = "AMBROSIA_PRINTER_NAME"
    }

    override fun cancelAllJobs(systemPrintService: PrintService) {
        commandRunner.run(
            listOf(
                "powershell.exe",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Get-PrintJob -PrinterName \$env:$PRINTER_NAME_ENVIRONMENT_VARIABLE | Remove-PrintJob",
            ),
            mapOf(PRINTER_NAME_ENVIRONMENT_VARIABLE to systemPrintService.name),
        )
    }
}

open class SystemCommandRunner(
    private val commandTimeoutSeconds: Long = 15,
) {
    open fun run(
        command: List<String>,
        environmentVariables: Map<String, String>,
    ) {
        val processBuilder = ProcessBuilder(command).redirectErrorStream(true)
        processBuilder.environment().putAll(environmentVariables)
        processBuilder.environment()["LC_ALL"] = "C"
        val process =
            try {
                processBuilder.start()
            } catch (processStartException: Exception) {
                logger.error("Could not run '${command.first()}': ${processStartException.message}", processStartException)
                return
            }
        if (!process.waitFor(commandTimeoutSeconds, TimeUnit.SECONDS)) {
            process.destroyForcibly()
            logger.error("'${command.first()}' did not finish in $commandTimeoutSeconds seconds")
            return
        }
        val commandOutput = process.inputStream.bufferedReader().use { outputReader -> outputReader.readText() }
        if (process.exitValue() != 0) {
            logger.error("'${command.first()}' exited with code ${process.exitValue()}: ${commandOutput.trim()}")
        }
    }
}
