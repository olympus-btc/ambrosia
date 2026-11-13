package pos.ambrosia.services

import com.github.anastaciocintra.output.PrinterOutputStream
import pos.ambrosia.logger
import pos.ambrosia.utils.PrinterNotAcceptingJobsException
import pos.ambrosia.utils.PrinterNotFoundException
import pos.ambrosia.utils.PrinterNotRespondingException
import java.io.ByteArrayInputStream
import java.io.IOException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.locks.ReentrantLock
import javax.print.DocFlavor
import javax.print.PrintException
import javax.print.PrintService
import javax.print.SimpleDoc
import javax.print.attribute.HashPrintRequestAttributeSet
import javax.print.attribute.standard.JobName
import javax.print.attribute.standard.PrinterIsAcceptingJobs
import javax.print.attribute.standard.QueuedJobCount
import kotlin.concurrent.withLock

fun interface PrinterJobSender {
    fun sendRawJob(
        printerName: String,
        jobName: String,
        rawJobBytes: ByteArray,
    )
}

class SystemPrinterJobSender(
    private val printerQueueCanceller: PrinterQueueCanceller = PrinterQueueCanceller.forCurrentOperatingSystem(),
    private val completionTimeoutMilliseconds: Long = DEFAULT_COMPLETION_TIMEOUT_MILLISECONDS,
    private val queuePollIntervalMilliseconds: Long = DEFAULT_QUEUE_POLL_INTERVAL_MILLISECONDS,
    private val printServiceResolver: (String) -> PrintService? = ::findSystemPrintServiceByName,
) : PrinterJobSender {
    companion object {
        const val DEFAULT_COMPLETION_TIMEOUT_MILLISECONDS = 15_000L
        const val DEFAULT_QUEUE_POLL_INTERVAL_MILLISECONDS = 250L

        private val printerLocksByPrinterName = ConcurrentHashMap<String, ReentrantLock>()

        private fun findSystemPrintServiceByName(printerName: String): PrintService? =
            try {
                PrinterOutputStream.getPrintServiceByName(printerName)
            } catch (_: IllegalArgumentException) {
                null
            }
    }

    override fun sendRawJob(
        printerName: String,
        jobName: String,
        rawJobBytes: ByteArray,
    ) {
        val printerLock = printerLocksByPrinterName.computeIfAbsent(printerName) { ReentrantLock() }
        printerLock.withLock {
            val systemPrintService = printServiceResolver(printerName) ?: throw PrinterNotFoundException(printerName)
            discardStaleJobs(printerName, systemPrintService)
            if (!isAcceptingJobs(systemPrintService)) {
                throw PrinterNotAcceptingJobsException(printerName)
            }
            submitJob(printerName, systemPrintService, jobName, rawJobBytes)
            if (!awaitEmptyQueue(systemPrintService)) {
                logger.error("Printer '$printerName' did not finish '$jobName' in time, cancelling its queue")
                printerQueueCanceller.cancelAllJobs(systemPrintService)
                throw PrinterNotRespondingException(printerName, completionTimeoutMilliseconds)
            }
        }
    }

    private fun discardStaleJobs(
        printerName: String,
        systemPrintService: PrintService,
    ) {
        val staleJobCount = readQueuedJobCount(systemPrintService) ?: return
        if (staleJobCount == 0) return
        logger.warn("Printer '$printerName' has $staleJobCount stale job(s) in its queue, cancelling them before printing")
        printerQueueCanceller.cancelAllJobs(systemPrintService)
    }

    private fun submitJob(
        printerName: String,
        systemPrintService: PrintService,
        jobName: String,
        rawJobBytes: ByteArray,
    ) {
        val printRequestAttributes = HashPrintRequestAttributeSet()
        printRequestAttributes.add(JobName(jobName, null))
        val rawDocument = SimpleDoc(ByteArrayInputStream(rawJobBytes), DocFlavor.INPUT_STREAM.AUTOSENSE, null)
        try {
            systemPrintService.createPrintJob().print(rawDocument, printRequestAttributes)
        } catch (printException: PrintException) {
            throw IOException("Printer '$printerName' rejected the job: ${printException.message}", printException)
        }
    }

    private fun awaitEmptyQueue(systemPrintService: PrintService): Boolean {
        val deadlineNanoseconds = System.nanoTime() + completionTimeoutMilliseconds * 1_000_000
        while (true) {
            val queuedJobCount = readQueuedJobCount(systemPrintService) ?: return true
            if (queuedJobCount == 0) return true
            if (System.nanoTime() >= deadlineNanoseconds) return false
            Thread.sleep(queuePollIntervalMilliseconds)
        }
    }

    private fun isAcceptingJobs(systemPrintService: PrintService): Boolean {
        val acceptingJobsAttribute =
            runCatching { systemPrintService.attributes.get(PrinterIsAcceptingJobs::class.java) }.getOrNull()
        return acceptingJobsAttribute != PrinterIsAcceptingJobs.NOT_ACCEPTING_JOBS
    }

    private fun readQueuedJobCount(systemPrintService: PrintService): Int? {
        val queuedJobCountAttribute =
            runCatching { systemPrintService.attributes.get(QueuedJobCount::class.java) }.getOrNull()
        return (queuedJobCountAttribute as? QueuedJobCount)?.value
    }
}
