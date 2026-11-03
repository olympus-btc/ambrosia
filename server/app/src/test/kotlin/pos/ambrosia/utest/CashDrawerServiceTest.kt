package pos.ambrosia.utest

import org.junit.After
import org.junit.Before
import pos.ambrosia.models.CashDrawerPin
import pos.ambrosia.models.PrinterConfigCreateRequest
import pos.ambrosia.models.PrinterType
import pos.ambrosia.services.CashDrawerPulseSender
import pos.ambrosia.services.CashDrawerService
import pos.ambrosia.services.CashDrawerTrigger
import pos.ambrosia.services.PrinterConfigService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.io.IOException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class CashDrawerServiceTest {
    private lateinit var databaseFile: File
    private val printerConfigService = PrinterConfigService()
    private val sentPulses = mutableListOf<Pair<String, CashDrawerPin>>()
    private val recordingPulseSender = CashDrawerPulseSender { printerName, cashDrawerPin -> sentPulses += printerName to cashDrawerPin }
    private val cashDrawerService = CashDrawerService(printerConfigService, recordingPulseSender)

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    @Test
    fun `opens the drawer when charging with a configured payment method`() {
        val cashPaymentMethodId = ExposedTestDb.seedPaymentMethod("Cash")
        createPrinterWithCashDrawer(printerName = "alice-printer", cashDrawerPaymentMethodIds = listOf(cashPaymentMethodId))

        cashDrawerService.openForPaymentMethod(cashPaymentMethodId)

        assertEquals(listOf("alice-printer" to CashDrawerPin.PIN_2), sentPulses)
    }

    @Test
    fun `does not open the drawer when charging with a payment method that is not configured`() {
        val cashPaymentMethodId = ExposedTestDb.seedPaymentMethod("Cash")
        val cardPaymentMethodId = ExposedTestDb.seedPaymentMethod("Credit Card")
        createPrinterWithCashDrawer(printerName = "alice-printer", cashDrawerPaymentMethodIds = listOf(cashPaymentMethodId))

        cashDrawerService.openForPaymentMethod(cardPaymentMethodId)

        assertEquals(emptyList(), sentPulses)
    }

    @Test
    fun `ignores printers without a cash drawer or disabled printers`() {
        val cashPaymentMethodId = ExposedTestDb.seedPaymentMethod("Cash")
        createPrinterWithCashDrawer(
            printerName = "bob-printer",
            cashDrawerPaymentMethodIds = listOf(cashPaymentMethodId),
            cashDrawerEnabled = false,
        )
        createPrinterWithCashDrawer(printerName = "eve-printer", cashDrawerPaymentMethodIds = listOf(cashPaymentMethodId), enabled = false)

        cashDrawerService.openForPaymentMethod(cashPaymentMethodId)

        assertEquals(emptyList(), sentPulses)
    }

    @Test
    fun `uses the configured pin`() {
        val cashPaymentMethodId = ExposedTestDb.seedPaymentMethod("Cash")
        createPrinterWithCashDrawer(
            printerName = "alice-printer",
            cashDrawerPaymentMethodIds = listOf(cashPaymentMethodId),
            cashDrawerPin = CashDrawerPin.PIN_5,
        )

        cashDrawerService.openForPaymentMethod(cashPaymentMethodId)

        assertEquals(listOf("alice-printer" to CashDrawerPin.PIN_5), sentPulses)
    }

    @Test
    fun `opens the drawer on shift open and close only when the printer allows it`() {
        createPrinterWithCashDrawer(printerName = "alice-printer", openCashDrawerOnShiftOpen = true, openCashDrawerOnShiftClose = false)

        cashDrawerService.openForTrigger(CashDrawerTrigger.SHIFT_OPEN)
        cashDrawerService.openForTrigger(CashDrawerTrigger.SHIFT_CLOSE)

        assertEquals(listOf("alice-printer" to CashDrawerPin.PIN_2), sentPulses)
    }

    @Test
    fun `opens the drawer when refunding an order paid with a configured payment method`() {
        val cashPaymentMethodId = ExposedTestDb.seedPaymentMethod("Cash")
        createPrinterWithCashDrawer(printerName = "alice-printer", cashDrawerPaymentMethodIds = listOf(cashPaymentMethodId))
        val refundedOrderId = seedPaidOrder(paymentMethodId = cashPaymentMethodId)

        cashDrawerService.openForRefundedOrder(refundedOrderId)

        assertEquals(listOf("alice-printer" to CashDrawerPin.PIN_2), sentPulses)
    }

    @Test
    fun `does not open the drawer when refunding an order paid with another method or with refunds turned off`() {
        val cashPaymentMethodId = ExposedTestDb.seedPaymentMethod("Cash")
        val cardPaymentMethodId = ExposedTestDb.seedPaymentMethod("Credit Card")
        createPrinterWithCashDrawer(printerName = "alice-printer", cashDrawerPaymentMethodIds = listOf(cashPaymentMethodId))
        createPrinterWithCashDrawer(
            printerName = "bob-printer",
            cashDrawerPaymentMethodIds = listOf(cardPaymentMethodId),
            openCashDrawerOnRefund = false,
        )

        cashDrawerService.openForRefundedOrder(seedPaidOrder(paymentMethodId = cardPaymentMethodId))

        assertEquals(emptyList(), sentPulses)
    }

    @Test
    fun `opens every drawer manually and fails when there is none`() {
        createPrinterWithCashDrawer(printerName = "alice-printer")
        createPrinterWithCashDrawer(printerName = "bob-printer")

        assertEquals(2, cashDrawerService.openManually(null))
        assertFailsWith<IOException> { CashDrawerService(PrinterConfigService(), recordingPulseSender).openManually("missing-printer") }
    }

    @Test
    fun `keeps going when a drawer fails to open`() {
        val cashPaymentMethodId = ExposedTestDb.seedPaymentMethod("Cash")
        createPrinterWithCashDrawer(printerName = "alice-printer", cashDrawerPaymentMethodIds = listOf(cashPaymentMethodId))
        val failingCashDrawerService =
            CashDrawerService(printerConfigService) { _, _ -> throw IOException("printer offline") }

        failingCashDrawerService.openForPaymentMethod(cashPaymentMethodId)

        assertFailsWith<IOException> { failingCashDrawerService.openManually(null) }
    }

    private fun createPrinterWithCashDrawer(
        printerName: String,
        cashDrawerPaymentMethodIds: List<String> = emptyList(),
        cashDrawerEnabled: Boolean = true,
        enabled: Boolean = true,
        cashDrawerPin: CashDrawerPin = CashDrawerPin.PIN_2,
        openCashDrawerOnRefund: Boolean = true,
        openCashDrawerOnShiftOpen: Boolean = true,
        openCashDrawerOnShiftClose: Boolean = true,
    ) {
        printerConfigService.createPrinterConfig(
            PrinterConfigCreateRequest(
                printerType = PrinterType.CUSTOMER,
                printerName = printerName,
                enabled = enabled,
                cashDrawerEnabled = cashDrawerEnabled,
                cashDrawerPin = cashDrawerPin,
                cashDrawerPaymentMethodIds = cashDrawerPaymentMethodIds,
                openCashDrawerOnRefund = openCashDrawerOnRefund,
                openCashDrawerOnShiftOpen = openCashDrawerOnShiftOpen,
                openCashDrawerOnShiftClose = openCashDrawerOnShiftClose,
            ),
        )
    }

    private fun seedPaidOrder(paymentMethodId: String): String {
        val userId = ExposedTestDb.seedUser("alice")
        val orderId = ExposedTestDb.seedOrder(userId = userId, status = "paid", total = 100.0)
        val ticketId = ExposedTestDb.seedTicket(orderId = orderId, userId = userId)
        val paymentId = ExposedTestDb.seedPayment(methodId = paymentMethodId, amount = 100.0)
        ExposedTestDb.seedTicketPayment(paymentId = paymentId, ticketId = ticketId)
        return orderId
    }
}
