package pos.ambrosia.config

import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.request.get
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.readRawBytes
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.runBlocking
import java.io.File

object InjectLogs {
    private fun downloadLogConfig(destination: File): Boolean {
        val client = HttpClient(CIO)
        return try {
            runBlocking {
                val response: HttpResponse =
                    client.get(
                        "https://github.com/olympus-btc/ambrosia/raw/main/server/app/src/main/resources/Ambrosia-Logs.xml",
                    )
                if (response.status == HttpStatusCode.OK) {
                    destination.writeBytes(response.readRawBytes())
                    true
                } else {
                    false
                }
            }
        } catch (e: Exception) {
            println("Error downloading log configuration: ${e.message}")
            false
        } finally {
            client.close()
        }
    }

    /**
     * Copies the log configuration file from the project directory if it doesn't exist in config
     */
    fun ensureLogConfig(datadir: String): Boolean {
        val logConfigFile = File(datadir, "Ambrosia-Logs.xml")

        if (logConfigFile.exists()) {
            return true
        }

        try {
            // Try to find the log config file in the project resources directory
            val projectRoot = File(System.getProperty("user.dir")).parentFile.parentFile
            val sourceLogFile = File(projectRoot, "server/app/src/main/resources/Ambrosia-Logs.xml")

            if (!sourceLogFile.exists()) {
                // Fallback to downloading from GitHub
                if (!downloadLogConfig(logConfigFile)) {
                    println("Failed to download log configuration from GitHub")
                    return false
                }
            } else {
                sourceLogFile.copyTo(logConfigFile)
            }

            println("Log configuration copied to ${logConfigFile.absolutePath}")
            return true
        } catch (e: Exception) {
            println("Error copying log configuration: ${e.message}")
            return false
        }
    }
}
