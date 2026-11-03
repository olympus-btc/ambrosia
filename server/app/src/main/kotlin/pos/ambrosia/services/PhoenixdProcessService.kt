package pos.ambrosia.services

import pos.ambrosia.phoenixDatadir
import java.io.File

sealed interface PhoenixdRestartResult {
    data object Requested : PhoenixdRestartResult

    data object NotRunning : PhoenixdRestartResult

    data object NoPidFile : PhoenixdRestartResult
}

class PhoenixdProcessService(
    private val pidFile: File = File(phoenixDatadir.toString(), "phoenixd.pid"),
) {
    fun isRunning(): Boolean = findAlivePhoenixdProcess() != null

    fun requestRestart(): PhoenixdRestartResult {
        val alivePhoenixdProcess = findAlivePhoenixdProcess()
        if (alivePhoenixdProcess == null) {
            return if (pidFile.exists()) PhoenixdRestartResult.NotRunning else PhoenixdRestartResult.NoPidFile
        }
        alivePhoenixdProcess.destroy()
        return PhoenixdRestartResult.Requested
    }

    private fun findAlivePhoenixdProcess(): ProcessHandle? {
        val phoenixdPid =
            pidFile
                .takeIf { it.exists() }
                ?.readText()
                ?.trim()
                ?.toLongOrNull() ?: return null
        return ProcessHandle.of(phoenixdPid).orElse(null)?.takeIf { it.isAlive }
    }
}
