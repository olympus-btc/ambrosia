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
import pos.ambrosia.models.PrinterType
import pos.ambrosia.models.TicketData
import pos.ambrosia.models.TicketLabels
import pos.ambrosia.models.TicketTemplate
import pos.ambrosia.services.PrintService
import pos.ambrosia.services.PrinterConfigService
import pos.ambrosia.services.TicketTemplateService
import java.io.IOException
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
}

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

private val englishTicketLabels =
    TicketLabels(
        total = "TOTAL",
        discount = "DISCOUNT",
        tip = "TIP",
        paymentMethod = "PAYMENT METHOD",
    )
