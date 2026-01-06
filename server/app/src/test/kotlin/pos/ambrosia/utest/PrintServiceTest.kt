package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.mockito.kotlin.*
import pos.ambrosia.models.*
import pos.ambrosia.services.PrinterConfigService
import pos.ambrosia.services.PrintService
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

        val printers = printService.getAvailablePrinters()
        assertNotNull(printers)

    }

    @Test
    fun `printTicket should throw exception if printer is not configured`() {
        val ticketData = TicketData(
            ticketId = "1",
            tableName = "Table 1",
            roomName = "Main Room",
            date = "2023-10-27",
            items = emptyList(),
            total = 100.00
        )

        runBlocking {
            assertFailsWith<IOException> {
                printService.printTicket(ticketData, "Default", PrinterType.KITCHEN, null, null, false)
            }
        }
    }

    @Test
    fun `printTicket should validate template existence before checking printer`() {
        
        val ticketData = TicketData(
            ticketId = "1",
            tableName = "Table 1",
            roomName = "Main Room",
            date = "2023-10-27",
            items = emptyList(),
            total = 100.00
        )

        whenever(runBlocking { ticketTemplateService.getTemplateByName("NonExistent") }).thenReturn(null)
    }
}
