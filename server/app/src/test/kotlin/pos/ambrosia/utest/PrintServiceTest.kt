package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.verifyNoInteractions
import org.mockito.kotlin.whenever
import pos.ambrosia.models.PrintRequest
import pos.ambrosia.models.PrintableTicketType
import pos.ambrosia.models.PrinterConfig
import pos.ambrosia.models.PrinterType
import pos.ambrosia.models.ShiftBreakdown
import pos.ambrosia.models.ShiftReportPrintData
import pos.ambrosia.models.TicketData
import pos.ambrosia.models.TicketLabels
import pos.ambrosia.models.TicketTemplate
import pos.ambrosia.services.PrintService
import pos.ambrosia.services.PrinterConfigService
import pos.ambrosia.services.PrinterJobSender
import pos.ambrosia.services.TicketTemplateService
import pos.ambrosia.utils.shiftReportLabels
import java.io.IOException
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class PrintServiceTest {
    private val ticketTemplateService: TicketTemplateService = mock()
    private val printerConfigService: PrinterConfigService = mock()
    private val printService = PrintService(ticketTemplateService, printerConfigService)

    @Test
    fun `getAvailablePrinters should return array without crashing`() {
        val availablePrinterNames = printService.getAvailablePrinters()
        assertNotNull(availablePrinterNames)
    }

    @Test
    fun `printTicket should throw exception if printer is not configured`() {
        val sampleTicketData =
            TicketData(
                ticketId = "1",
                tableName = "Table 1",
                roomName = "Main Room",
                date = "2023-10-27",
                items = emptyList(),
                total = 100.00,
                labels = englishTicketLabels,
            )

        runBlocking {
            doReturn(receiptTemplate).whenever(ticketTemplateService).getDefaultTemplate(PrintableTicketType.RECEIPT)
            doReturn(null).whenever(printerConfigService).getDefaultByType(PrinterType.KITCHEN)
            assertFailsWith<IOException> {
                val kitchenPrintRequest =
                    PrintRequest(
                        templateName = "Default",
                        ticketData = sampleTicketData,
                        printerType = PrinterType.KITCHEN,
                        printerId = null,
                        broadcast = false,
                        forceTemplateName = false,
                    )
                printService.printTicket(kitchenPrintRequest, null)
            }
        }
    }

    @Test
    fun `printTicket skips the print job when the ticket type has no default template`() {
        doReturn(null).whenever(ticketTemplateService).getDefaultTemplate(PrintableTicketType.RECEIPT)

        printService.printTicket(PrintRequest(ticketData = aliceTicketData, printerType = PrinterType.CUSTOMER), null)

        verifyNoInteractions(printerConfigService)
    }

    @Test
    fun `printTicket uses the default template of the ticket type instead of the requested template name`() {
        doReturn(null).whenever(ticketTemplateService).getDefaultTemplate(PrintableTicketType.RECEIPT)

        printService.printTicket(
            PrintRequest(templateName = "bob", ticketData = aliceTicketData, printerType = PrinterType.CUSTOMER),
            null,
        )

        verify(ticketTemplateService).getDefaultTemplate(PrintableTicketType.RECEIPT)
        verify(ticketTemplateService, never()).getTemplateByName(any())
    }

    @Test
    fun `printTicket uses the forced template name and fails when it does not exist`() {
        doReturn(null).whenever(ticketTemplateService).getTemplateByName("bob")

        assertFailsWith<IOException> {
            printService.printTicket(
                PrintRequest(
                    templateName = "bob",
                    ticketData = aliceTicketData,
                    printerType = PrinterType.CUSTOMER,
                    forceTemplateName = true,
                ),
                null,
            )
        }
        verify(ticketTemplateService, never()).getDefaultTemplate(any())
    }

    @Test
    fun `printTicket rejects a shift close request without shift report data`() {
        doReturn(receiptTemplate).whenever(ticketTemplateService).getDefaultTemplate(PrintableTicketType.SHIFT_CLOSE)

        assertFailsWith<IllegalArgumentException> {
            printService.printTicket(
                PrintRequest(ticketType = PrintableTicketType.SHIFT_CLOSE, printerType = PrinterType.CUSTOMER),
                null,
            )
        }
    }

    @Test
    fun `printShiftReport prints with the default shift close template on the customer printer`() {
        doReturn(receiptTemplate).whenever(ticketTemplateService).getDefaultTemplate(PrintableTicketType.SHIFT_CLOSE)
        doReturn(null).whenever(printerConfigService).getDefaultByType(PrinterType.CUSTOMER)

        assertFailsWith<IOException> { printService.printShiftReport(aliceShiftReport, null) }

        verify(ticketTemplateService).getDefaultTemplate(PrintableTicketType.SHIFT_CLOSE)
        verify(printerConfigService).getDefaultByType(PrinterType.CUSTOMER)
    }

    @Test
    fun `printTicket sends the rendered receipt to the default customer printer`() {
        val sentJobs = mutableListOf<Pair<String, ByteArray>>()
        val recordingPrintService =
            buildPrintServiceWithSender { printerName, _, rawJobBytes -> sentJobs += printerName to rawJobBytes }
        doReturn(receiptTemplate).whenever(ticketTemplateService).getDefaultTemplate(PrintableTicketType.RECEIPT)
        doReturn(customerPrinterConfig("alice-printer")).whenever(printerConfigService).getDefaultByType(PrinterType.CUSTOMER)

        recordingPrintService.printTicket(PrintRequest(ticketData = aliceTicketData, printerType = PrinterType.CUSTOMER), null)

        assertEquals(listOf("alice-printer"), sentJobs.map { sentJob -> sentJob.first })
        assertTrue(sentJobs.single().second.isNotEmpty())
    }

    @Test
    fun `printTicket fails when the default printer could not print the receipt`() {
        val failingPrintService = buildPrintServiceWithSender { printerName, _, _ -> throw IOException("$printerName out of paper") }
        doReturn(receiptTemplate).whenever(ticketTemplateService).getDefaultTemplate(PrintableTicketType.RECEIPT)
        doReturn(customerPrinterConfig("alice-printer")).whenever(printerConfigService).getDefaultByType(PrinterType.CUSTOMER)

        val printFailure =
            assertFailsWith<IOException> {
                failingPrintService.printTicket(PrintRequest(ticketData = aliceTicketData, printerType = PrinterType.CUSTOMER), null)
            }

        assertEquals("alice-printer out of paper", printFailure.message)
    }

    @Test
    fun `printTicket keeps broadcasting to the other printers when one of them fails`() {
        val printedPrinterNames = mutableListOf<String>()
        val partiallyFailingPrintService =
            buildPrintServiceWithSender { printerName, _, _ ->
                if (printerName == "bob-printer") throw IOException("bob-printer out of paper")
                printedPrinterNames += printerName
            }
        doReturn(receiptTemplate).whenever(ticketTemplateService).getDefaultTemplate(PrintableTicketType.RECEIPT)
        doReturn(listOf(customerPrinterConfig("bob-printer"), customerPrinterConfig("alice-printer")))
            .whenever(printerConfigService)
            .getEnabledByType(PrinterType.KITCHEN)

        partiallyFailingPrintService.printTicket(
            PrintRequest(ticketData = aliceTicketData, printerType = PrinterType.KITCHEN, broadcast = true),
            null,
        )

        assertEquals(listOf("alice-printer"), printedPrinterNames)
    }

    private fun buildPrintServiceWithSender(printerJobSender: PrinterJobSender) =
        PrintService(ticketTemplateService, printerConfigService, printerJobSender = printerJobSender)
}

private fun customerPrinterConfig(printerName: String) =
    PrinterConfig(id = "config-$printerName", printerType = PrinterType.CUSTOMER, printerName = printerName)

private val receiptTemplate = TicketTemplate(id = "template-alice", name = "alice", elements = emptyList())

private val aliceTicketData =
    TicketData(
        ticketId = "alice-ticket",
        tableName = "Table 1",
        roomName = "Main Room",
        date = "2026-10-10",
        items = emptyList(),
        total = 10.0,
        labels =
            TicketLabels(
                total = "TOTAL",
                discount = "DISCOUNT",
                tip = "TIP",
                paymentMethod = "PAYMENT METHOD",
            ),
    )

private val aliceShiftReport =
    ShiftReportPrintData(
        cashierName = "alice",
        openedAt = "2026-10-10T09:00:00",
        closedAt = "2026-10-10T18:00:00",
        breakdown =
            ShiftBreakdown(
                shiftId = "shift-alice",
                initialAmount = 100.0,
                finalAmount = 600.0,
                difference = 0.0,
                totalSales = 500.0,
                totalTips = 0.0,
                cashSales = 500.0,
                cashRefunds = 0.0,
                expectedTotal = 600.0,
                totalTickets = 5,
                byPaymentMethod = emptyList(),
            ),
        labels = shiftReportLabels(),
    )

private val englishTicketLabels =
    TicketLabels(
        total = "TOTAL",
        discount = "DISCOUNT",
        tip = "TIP",
        paymentMethod = "PAYMENT METHOD",
    )
