package pos.ambrosia.utest

import pos.ambrosia.services.PhoenixdProcessService
import pos.ambrosia.services.PhoenixdRestartResult
import java.io.File
import java.nio.file.Files
import java.util.concurrent.TimeUnit
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PhoenixdProcessServiceTest {
    private fun newPidFile(): File = Files.createTempDirectory("phoenixdProcessServiceTest").resolve("phoenixd.pid").toFile()

    @Test
    fun `requestRestart returns NoPidFile when the pidfile does not exist`() {
        val phoenixdProcessService = PhoenixdProcessService(pidFile = newPidFile())

        assertEquals(PhoenixdRestartResult.NoPidFile, phoenixdProcessService.requestRestart())
        assertFalse(phoenixdProcessService.isRunning())
    }

    @Test
    fun `requestRestart returns NotRunning when the pidfile references a dead process`() {
        val deadProcess = ProcessBuilder("true").start()
        deadProcess.waitFor()
        val pidFile = newPidFile().apply { writeText(deadProcess.pid().toString()) }
        val phoenixdProcessService = PhoenixdProcessService(pidFile = pidFile)

        assertEquals(PhoenixdRestartResult.NotRunning, phoenixdProcessService.requestRestart())
        assertFalse(phoenixdProcessService.isRunning())
    }

    @Test
    fun `requestRestart signals the live process referenced by the pidfile`() {
        val longRunningProcess = ProcessBuilder("sleep", "30").start()
        val pidFile = newPidFile().apply { writeText(longRunningProcess.pid().toString()) }
        val phoenixdProcessService = PhoenixdProcessService(pidFile = pidFile)

        assertTrue(phoenixdProcessService.isRunning())
        assertEquals(PhoenixdRestartResult.Requested, phoenixdProcessService.requestRestart())
        assertTrue(longRunningProcess.waitFor(5, TimeUnit.SECONDS))
    }
}
