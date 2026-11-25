package pos.ambrosia.utest

import org.junit.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.doAnswer
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import pos.ambrosia.services.PrinterQueueCanceller
import pos.ambrosia.services.SystemPrinterJobSender
import pos.ambrosia.utils.PrinterNotAcceptingJobsException
import pos.ambrosia.utils.PrinterNotFoundException
import pos.ambrosia.utils.PrinterNotRespondingException
import javax.print.DocPrintJob
import javax.print.PrintService
import javax.print.attribute.HashPrintServiceAttributeSet
import javax.print.attribute.PrintServiceAttributeSet
import javax.print.attribute.standard.PrinterIsAcceptingJobs
import javax.print.attribute.standard.QueuedJobCount
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class SystemPrinterJobSenderTest {
    private val receiptPrinterName = "Receipt Printer"
    private val ticketBytes = byteArrayOf(0x1B, 0x40, 0x41)

    private val cancelledPrintServices = mutableListOf<PrintService>()
    private val recordingQueueCanceller =
        PrinterQueueCanceller { systemPrintService ->
            cancelledPrintServices += systemPrintService
            remainingQueuedJobCounts.clear()
            remainingQueuedJobCounts += 0
        }
    private val remainingQueuedJobCounts = ArrayDeque<Int>()
    private var acceptingJobs = PrinterIsAcceptingJobs.ACCEPTING_JOBS
    private val submittedPrintJob: DocPrintJob = mock()
    private val systemPrintService: PrintService = mock()

    init {
        doReturn(receiptPrinterName).whenever(systemPrintService).name
        doReturn(submittedPrintJob).whenever(systemPrintService).createPrintJob()
        doAnswer { buildPrinterAttributes() }.whenever(systemPrintService).attributes
    }

    private fun buildPrinterAttributes(): PrintServiceAttributeSet {
        val printerAttributes = HashPrintServiceAttributeSet()
        val queuedJobCount =
            if (remainingQueuedJobCounts.size > 1) {
                remainingQueuedJobCounts.removeFirst()
            } else {
                remainingQueuedJobCounts.first()
            }
        printerAttributes.add(QueuedJobCount(queuedJobCount))
        printerAttributes.add(acceptingJobs)
        return printerAttributes
    }

    private fun buildSender(resolvedPrintService: PrintService? = systemPrintService) =
        SystemPrinterJobSender(
            printerQueueCanceller = recordingQueueCanceller,
            completionTimeoutMilliseconds = 200,
            queuePollIntervalMilliseconds = 10,
            printServiceResolver = { resolvedPrintService },
        )

    @Test
    fun `sends the job and returns once the printer queue is empty`() {
        remainingQueuedJobCounts += listOf(0, 1, 1, 0)

        buildSender().sendRawJob(receiptPrinterName, "Ambrosia RECEIPT", ticketBytes)

        verify(submittedPrintJob).print(any(), any())
        assertTrue(cancelledPrintServices.isEmpty())
    }

    @Test
    fun `cancels stale jobs left in the queue before sending a new one`() {
        remainingQueuedJobCounts += listOf(3)

        buildSender().sendRawJob(receiptPrinterName, "Ambrosia RECEIPT", ticketBytes)

        assertEquals(listOf(systemPrintService), cancelledPrintServices)
        verify(submittedPrintJob).print(any(), any())
    }

    @Test
    fun `cancels the job and fails when the printer does not finish it in time`() {
        remainingQueuedJobCounts += listOf(0, 1)
        val sender =
            SystemPrinterJobSender(
                printerQueueCanceller = { cancelledPrintService -> cancelledPrintServices += cancelledPrintService },
                completionTimeoutMilliseconds = 100,
                queuePollIntervalMilliseconds = 10,
                printServiceResolver = { systemPrintService },
            )

        assertFailsWith<PrinterNotRespondingException> {
            sender.sendRawJob(receiptPrinterName, "Ambrosia RECEIPT", ticketBytes)
        }

        assertEquals(listOf(systemPrintService), cancelledPrintServices)
    }

    @Test
    fun `does not send the job when the printer is not accepting jobs`() {
        remainingQueuedJobCounts += listOf(0)
        acceptingJobs = PrinterIsAcceptingJobs.NOT_ACCEPTING_JOBS

        assertFailsWith<PrinterNotAcceptingJobsException> {
            buildSender().sendRawJob(receiptPrinterName, "Ambrosia RECEIPT", ticketBytes)
        }

        verify(submittedPrintJob, never()).print(any(), any())
    }

    @Test
    fun `fails when the printer is not installed on the system`() {
        assertFailsWith<PrinterNotFoundException> {
            buildSender(resolvedPrintService = null).sendRawJob(receiptPrinterName, "Ambrosia RECEIPT", ticketBytes)
        }
    }
}
