package pos.ambrosia.utest

import com.github.anastaciocintra.escpos.EscPos
import com.github.anastaciocintra.escpos.Style
import com.github.anastaciocintra.escpos.image.EscPosImage
import com.github.anastaciocintra.escpos.image.ImageWrapperInterface
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.atLeast
import org.mockito.kotlin.atMost
import org.mockito.kotlin.eq
import org.mockito.kotlin.inOrder
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.times
import org.mockito.kotlin.verify
import pos.ambrosia.models.Config
import pos.ambrosia.models.ElementStyle
import pos.ambrosia.models.ElementType
import pos.ambrosia.models.FontSize
import pos.ambrosia.models.Justification
import pos.ambrosia.models.ShiftBreakdown
import pos.ambrosia.models.ShiftPaymentMethodTotal
import pos.ambrosia.models.ShiftReportPrintData
import pos.ambrosia.models.TicketData
import pos.ambrosia.models.TicketDataItem
import pos.ambrosia.models.TicketDateFormat
import pos.ambrosia.models.TicketElement
import pos.ambrosia.models.TicketLabels
import pos.ambrosia.models.TicketTemplate
import pos.ambrosia.models.TicketTimeFormat
import pos.ambrosia.services.PrintableTicket
import pos.ambrosia.services.TicketFactory
import pos.ambrosia.services.TicketLogoLoader
import pos.ambrosia.utils.formatTicketLine
import pos.ambrosia.utils.shiftReportLabels
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import javax.imageio.ImageIO
import kotlin.io.path.createDirectories
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TicketFactoryTest {
    @Test
    fun `build should process a simple text element`() {
        // Arrange
        val mockEscpos: EscPos = mock()
        val ticketTemplate =
            TicketTemplate(
                id = "template-1",
                name = "Test Template",
                elements =
                    listOf(
                        TicketElement(
                            id = "elem-1",
                            templateId = "template-1",
                            order = 0,
                            type = ElementType.TEXT,
                            value = "Welcome to {{config.businessName}}",
                        ),
                    ),
            )
        val ticketData =
            TicketData(
                ticketId = "123",
                tableName = "Table 1",
                roomName = "Main Room",
                date = "2025-10-31",
                items = emptyList(),
                total = 0.0,
                labels = englishTicketLabels,
            )
        val businessConfig =
            Config(
                businessType = "restaurant",
                businessName = "Ambrosia",
                businessAddress = null,
                businessPhone = null,
                businessEmail = null,
                businessTaxId = null,
                businessLogoUrl = null,
            )

        val ticketFactory = TicketFactory(ticketTemplate)

        // Act
        ticketFactory.build(mockEscpos, ticketData, businessConfig)

        // Assert
        verify(mockEscpos).writeLF(any<Style>(), eq("Welcome to Ambrosia"))
    }

    @Test
    fun `build should pad and reset the printer before printing the template elements`() {
        val mockEscpos: EscPos = mock()
        val ticketTemplate =
            TicketTemplate(
                id = "template-reset",
                name = "Reset Template",
                elements =
                    listOf(
                        TicketElement(
                            id = "elem-reset",
                            templateId = "template-reset",
                            order = 0,
                            type = ElementType.HEADER,
                            value = "alice",
                        ),
                    ),
            )
        val ticketData =
            TicketData(
                ticketId = "reset-001",
                tableName = "Table 1",
                roomName = "Main Room",
                date = "2026-10-15",
                items = emptyList(),
                total = 0.0,
                labels = englishTicketLabels,
            )

        TicketFactory(ticketTemplate).build(mockEscpos, ticketData, null)

        inOrder(mockEscpos) {
            verify(mockEscpos).write(eq(ByteArray(TicketFactory.JOB_START_PADDING_BYTES)), eq(0), eq(TicketFactory.JOB_START_PADDING_BYTES))
            verify(mockEscpos).initializePrinter()
            verify(mockEscpos).writeLF(any<Style>(), eq("alice"))
        }
    }

    @Test
    fun `build should process table row elements`() {
        // Arrange
        val mockEscpos: EscPos = mock()
        val printedRowCaptor = argumentCaptor<String>()
        val ticketTemplate =
            TicketTemplate(
                id = "template-2",
                name = "Table Row Template",
                elements =
                    listOf(
                        TicketElement(
                            id = "elem-2",
                            templateId = "template-2",
                            order = 0,
                            type = ElementType.TABLE_ROW,
                            value = "", // Value is ignored for TABLE_ROW
                            style = ElementStyle(bold = false, justification = Justification.LEFT, fontSize = FontSize.NORMAL),
                        ),
                    ),
            )
        val ticketData =
            TicketData(
                ticketId = "456",
                tableName = "Table 2",
                roomName = "Patio",
                date = "2025-10-31",
                items =
                    listOf(
                        TicketDataItem(quantity = 1, name = "Burger", price = 12.50, comments = listOf("No pickles", "Well done")),
                        TicketDataItem(quantity = 2, name = "Fries", price = 3.00),
                    ),
                total = 18.50,
                labels = englishTicketLabels,
            )
        val businessConfig =
            Config(
                businessType = "restaurant",
                businessName = "Ambrosia",
                businessAddress = null,
                businessPhone = null,
                businessEmail = null,
                businessTaxId = null,
                businessLogoUrl = null,
            )

        val ticketFactory = TicketFactory(ticketTemplate)

        // Act
        ticketFactory.build(mockEscpos, ticketData, businessConfig)

        // Assert
        verify(mockEscpos, times(4)).writeLF(any<Style>(), printedRowCaptor.capture())
        val printedRows = printedRowCaptor.allValues

        assert(printedRows[0].startsWith("1x Burger"))
        assert(printedRows[0].endsWith("12.5"))
        assertEquals("  - No pickles", printedRows[1])
        assertEquals("  - Well done", printedRows[2])
        assert(printedRows[3].startsWith("2x Fries"))
        assert(printedRows[3].endsWith("3.0"))
    }

    @Test
    fun `build should process separator element`() {
        // Arrange
        val mockEscpos: EscPos = mock()
        val ticketTemplate =
            TicketTemplate(
                id = "template-3",
                name = "Separator Template",
                elements =
                    listOf(
                        TicketElement(
                            id = "elem-3",
                            templateId = "template-3",
                            order = 0,
                            type = ElementType.SEPARATOR,
                            value = "-",
                        ),
                    ),
            )
        val ticketData =
            TicketData(
                ticketId = "789",
                tableName = "Table 3",
                roomName = "Bar",
                date = "2025-10-31",
                items = emptyList(),
                total = 0.0,
                labels = englishTicketLabels,
            )
        val businessConfig =
            Config(
                businessType = "restaurant",
                businessName = "Ambrosia",
                businessAddress = null,
                businessPhone = null,
                businessEmail = null,
                businessTaxId = null,
                businessLogoUrl = null,
            )

        val ticketFactory = TicketFactory(ticketTemplate)

        // Act
        ticketFactory.build(mockEscpos, ticketData, businessConfig)

        // Assert
        verify(mockEscpos).writeLF(any<Style>(), eq("-".repeat(48)))
    }

    @Test
    fun `build should print a full dashed line for a separator without value`() {
        assertEquals("-".repeat(48), printedSeparatorLine(storedValue = ""))
    }

    @Test
    fun `build should print a full dashed line for a separator keeping a previous element value`() {
        assertEquals("-".repeat(48), printedSeparatorLine(storedValue = "{{config.businessName}}"))
    }

    private fun printedSeparatorLine(storedValue: String): String {
        val mockEscpos: EscPos = mock()
        val printedLineCaptor = argumentCaptor<String>()
        val ticketTemplate =
            TicketTemplate(
                id = "template-separator",
                name = "Separator Template",
                elements =
                    listOf(
                        TicketElement(
                            id = "elem-separator",
                            templateId = "template-separator",
                            order = 0,
                            type = ElementType.SEPARATOR,
                            value = storedValue,
                        ),
                    ),
            )
        val ticketData =
            TicketData(
                ticketId = "separator-001",
                tableName = "Table 1",
                roomName = "Main Room",
                date = "2026-10-15",
                items = emptyList(),
                total = 0.0,
                labels = englishTicketLabels,
            )
        val businessConfig =
            Config(
                businessName = "alice",
                businessAddress = null,
                businessPhone = null,
                businessEmail = null,
                businessTaxId = null,
                businessLogoUrl = null,
            )

        TicketFactory(ticketTemplate).build(mockEscpos, ticketData, businessConfig)

        verify(mockEscpos).writeLF(any<Style>(), printedLineCaptor.capture())
        return printedLineCaptor.firstValue
    }

    @Test
    fun `build should scale text height together with width for large text`() {
        val printedBytes = printedTextBytes(FontSize.LARGE)

        assertTrue(printedBytes.containsCommand(byteArrayOf(0x1D, 0x21, 0x11)))
    }

    @Test
    fun `build should scale text height together with width for extra large text`() {
        val printedBytes = printedTextBytes(FontSize.EXTRA_LARGE)

        assertTrue(printedBytes.containsCommand(byteArrayOf(0x1D, 0x21, 0x22)))
    }

    private fun printedTextBytes(fontSize: FontSize): ByteArray {
        val printedOutput = ByteArrayOutputStream()
        val ticketTemplate =
            TicketTemplate(
                id = "template-font-size",
                name = "Font Size Template",
                elements =
                    listOf(
                        TicketElement(
                            id = "elem-footer",
                            templateId = "template-font-size",
                            order = 0,
                            type = ElementType.FOOTER,
                            value = "bob",
                            style = ElementStyle(fontSize = fontSize),
                        ),
                    ),
            )
        val ticketData =
            TicketData(
                ticketId = "font-size-001",
                tableName = "Table 1",
                roomName = "Main Room",
                date = "2026-10-15",
                items = emptyList(),
                total = 0.0,
                labels = englishTicketLabels,
            )

        TicketFactory(ticketTemplate).build(EscPos(printedOutput), ticketData, null)

        return printedOutput.toByteArray()
    }

    private fun ByteArray.containsCommand(command: ByteArray): Boolean =
        (0..size - command.size).any { startIndex ->
            command.indices.all { commandIndex -> this[startIndex + commandIndex] == command[commandIndex] }
        }

    @Test
    fun `build should process table header element`() {
        // Arrange
        val mockEscpos: EscPos = mock()
        val ticketTemplate =
            TicketTemplate(
                id = "template-4",
                name = "Table Header Template",
                elements =
                    listOf(
                        TicketElement(
                            id = "elem-4",
                            templateId = "template-4",
                            order = 0,
                            type = ElementType.TABLE_HEADER,
                            value = "Item             Qty     Price",
                        ),
                    ),
            )
        val ticketData =
            TicketData(
                ticketId = "101",
                tableName = "Table 4",
                roomName = "Kitchen",
                date = "2025-10-31",
                items = emptyList(),
                total = 0.0,
                labels = englishTicketLabels,
            )
        val businessConfig =
            Config(
                businessType = "restaurant",
                businessName = "Ambrosia",
                businessAddress = null,
                businessPhone = null,
                businessEmail = null,
                businessTaxId = null,
                businessLogoUrl = null,
            )

        val ticketFactory = TicketFactory(ticketTemplate)

        // Act
        ticketFactory.build(mockEscpos, ticketData, businessConfig)

        // Assert
        verify(mockEscpos).writeLF(any<Style>(), eq("Item             Qty     Price"))
    }

    @Test
    fun `build should process TOTAL_ROW with discount and tip amount`() {
        val mockEscpos: EscPos = mock()
        val ticketTemplate =
            TicketTemplate(
                id = "template-tip",
                name = "Tip Template",
                elements =
                    listOf(
                        TicketElement(
                            id = "elem-total",
                            templateId = "template-tip",
                            order = 0,
                            type = ElementType.TOTAL_ROW,
                            value = "TOTAL",
                        ),
                    ),
            )
        val ticketData =
            TicketData(
                ticketId = "tip-001",
                tableName = "Table 1",
                roomName = "Salón",
                date = "2026-08-28",
                items = emptyList(),
                total = 115.0,
                discountAmount = 10.0,
                tipAmount = 15.0,
                labels = englishTicketLabels,
            )
        val businessConfig =
            Config(
                businessType = "restaurant",
                businessName = "Ambrosia",
                businessAddress = null,
                businessPhone = null,
                businessEmail = null,
                businessTaxId = null,
                businessLogoUrl = null,
            )

        val ticketFactory = TicketFactory(ticketTemplate)
        ticketFactory.build(mockEscpos, ticketData, businessConfig)

        val printedLineCaptor = argumentCaptor<String>()
        verify(mockEscpos, times(4)).writeLF(any<Style>(), printedLineCaptor.capture())
        val printedLines = printedLineCaptor.allValues
        assertEquals("-".repeat(TicketFactory.DEFAULT_TICKET_WIDTH), printedLines[0])
        assertEquals(formatTicketLine("DISCOUNT", "-10.0"), printedLines[1])
        assertEquals(formatTicketLine("TIP", "+15.0"), printedLines[2])
        assertEquals(formatTicketLine("TOTAL", "115.0"), printedLines[3])
    }

    @Test
    fun `build should print the total, discount and tip with the received labels without accents`() {
        val mockEscpos: EscPos = mock()
        val printedLineCaptor = argumentCaptor<String>()
        val ticketTemplate =
            TicketTemplate(
                id = "template-labels",
                name = "Labels Template",
                elements =
                    listOf(
                        TicketElement(
                            id = "elem-total",
                            templateId = "template-labels",
                            order = 0,
                            type = ElementType.TOTAL_ROW,
                            value = "",
                        ),
                        TicketElement(
                            id = "elem-payment-method",
                            templateId = "template-labels",
                            order = 1,
                            type = ElementType.PAYMENT_METHOD,
                            value = "",
                        ),
                    ),
            )
        val ticketData =
            TicketData(
                ticketId = "labels-001",
                tableName = "Mesa 1",
                roomName = "Salón",
                date = "2026-10-18",
                items = emptyList(),
                total = 115.0,
                discountAmount = 10.0,
                tipAmount = 15.0,
                paymentMethod = "Tarjeta de débito",
                labels =
                    TicketLabels(
                        total = "TOTAL",
                        discount = "DESCUENTO",
                        tip = "PROPINA",
                        paymentMethod = "MÉTODO DE PAGO",
                    ),
            )

        TicketFactory(ticketTemplate).build(mockEscpos, ticketData, null)

        verify(mockEscpos, times(5)).writeLF(any<Style>(), printedLineCaptor.capture())
        assertEquals(
            listOf(
                "-".repeat(TicketFactory.DEFAULT_TICKET_WIDTH),
                formatTicketLine("DESCUENTO", "-10.0"),
                formatTicketLine("PROPINA", "+15.0"),
                formatTicketLine("TOTAL", "115.0"),
                formatTicketLine("METODO DE PAGO", "Tarjeta de debito"),
            ),
            printedLineCaptor.allValues,
        )
    }

    @Test
    fun `build should remove accents from the template text and item names`() {
        val mockEscpos: EscPos = mock()
        val printedLineCaptor = argumentCaptor<String>()
        val ticketTemplate =
            TicketTemplate(
                id = "template-accents",
                name = "Accents Template",
                elements =
                    listOf(
                        TicketElement(
                            id = "elem-text",
                            templateId = "template-accents",
                            order = 0,
                            type = ElementType.TEXT,
                            value = "Gracias por tu visita, vuelve pronto al Salón",
                        ),
                        TicketElement(
                            id = "elem-rows",
                            templateId = "template-accents",
                            order = 1,
                            type = ElementType.TABLE_ROW,
                            value = "",
                        ),
                    ),
            )
        val ticketData =
            TicketData(
                ticketId = "accents-001",
                tableName = "Mesa 1",
                roomName = "Salón",
                date = "2026-10-18",
                items = listOf(TicketDataItem(quantity = 1, name = "Piña colada", price = 80.0, comments = listOf("sin azúcar"))),
                total = 80.0,
                labels = englishTicketLabels,
            )

        TicketFactory(ticketTemplate).build(mockEscpos, ticketData, null)

        verify(mockEscpos, times(3)).writeLF(any<Style>(), printedLineCaptor.capture())
        assertEquals(
            listOf(
                "Gracias por tu visita, vuelve pronto al Salon",
                formatTicketLine("1x Pina colada", "80.0"),
                "  - sin azucar",
            ),
            printedLineCaptor.allValues,
        )
    }

    @Test
    fun `build should resolve ticket tipAmount placeholder`() {
        val mockEscpos: EscPos = mock()
        val ticketTemplate =
            TicketTemplate(
                id = "template-ph",
                name = "Placeholder Template",
                elements =
                    listOf(
                        TicketElement(
                            id = "elem-ph",
                            templateId = "template-ph",
                            order = 0,
                            type = ElementType.TEXT,
                            value = "Tip: {{ticket.tipAmount}}",
                        ),
                    ),
            )
        val ticketData =
            TicketData(
                ticketId = "tip-002",
                tableName = "Table 2",
                roomName = "Bar",
                date = "2026-08-28",
                items = emptyList(),
                total = 50.0,
                tipAmount = 5.0,
                labels = englishTicketLabels,
            )

        val ticketFactory = TicketFactory(ticketTemplate)
        ticketFactory.build(mockEscpos, ticketData, null)

        verify(mockEscpos).writeLF(any<Style>(), eq("Tip: 5.0"))
    }

    @Test
    fun `build should print the payment method row with the element label`() {
        assertEquals(
            listOf(formatTicketLine("Metodo de pago", "Efectivo")),
            printedPaymentMethodLines(storedLabel = "Método de pago", paymentMethod = "Efectivo"),
        )
    }

    @Test
    fun `build should print the default label when the payment method element has no label`() {
        assertEquals(
            listOf(formatTicketLine("PAYMENT METHOD", "Card")),
            printedPaymentMethodLines(storedLabel = "", paymentMethod = "Card"),
        )
    }

    @Test
    fun `build should skip the payment method row when the ticket has no payment method`() {
        assertEquals(emptyList(), printedPaymentMethodLines(storedLabel = "Método de pago", paymentMethod = null))
    }

    private fun printedPaymentMethodLines(
        storedLabel: String,
        paymentMethod: String?,
    ): List<String> {
        val mockEscpos: EscPos = mock()
        val printedLineCaptor = argumentCaptor<String>()
        val ticketTemplate =
            TicketTemplate(
                id = "template-payment-method",
                name = "Payment Method Template",
                elements =
                    listOf(
                        TicketElement(
                            id = "elem-payment-method",
                            templateId = "template-payment-method",
                            order = 0,
                            type = ElementType.PAYMENT_METHOD,
                            value = storedLabel,
                        ),
                    ),
            )
        val ticketData =
            TicketData(
                ticketId = "payment-001",
                tableName = "Table 1",
                roomName = "Main Room",
                date = "2026-10-17",
                items = emptyList(),
                total = 100.0,
                paymentMethod = paymentMethod,
                labels = englishTicketLabels,
            )

        TicketFactory(ticketTemplate).build(mockEscpos, ticketData, null)

        verify(mockEscpos, atMost(1)).writeLF(any<Style>(), printedLineCaptor.capture())
        return printedLineCaptor.allValues
    }

    @Test
    fun `build should print short QR content smaller as the size decreases`() {
        val socialLink = "https://instagram.com/alice"

        val normalWidthDots = printedQrWidthDots(socialLink, FontSize.NORMAL)
        val largeWidthDots = printedQrWidthDots(socialLink, FontSize.LARGE)
        val extraLargeWidthDots = printedQrWidthDots(socialLink, FontSize.EXTRA_LARGE)

        assertTrue(normalWidthDots < 200)
        assertTrue(normalWidthDots < largeWidthDots)
        assertTrue(largeWidthDots < extraLargeWidthDots)
    }

    @Test
    fun `build should keep long QR content readable and within the printable width`() {
        val longContent = "lnbc".padEnd(2000, 'q')

        val normalWidthDots = printedQrWidthDots(longContent, FontSize.NORMAL)
        val extraLargeWidthDots = printedQrWidthDots(longContent, FontSize.EXTRA_LARGE)

        assertTrue(normalWidthDots > 320)
        assertTrue(extraLargeWidthDots <= 576)
    }

    @Test
    fun `build should resolve print date and time in the business timezone`() {
        val printedLine =
            printedTextLine(
                value = "{{print.date}} {{print.time}}",
                dateFormat = TicketDateFormat.DAY_MONTH_YEAR,
                timeFormat = TicketTimeFormat.HOURS_24,
            )

        assertEquals("15/10/2026 21:30", printedLine)
    }

    @Test
    fun `build should resolve print date and time with the template formats`() {
        assertEquals(
            "10/15/2026 9:30 PM",
            printedTextLine(
                value = "{{print.date}} {{print.time}}",
                dateFormat = TicketDateFormat.MONTH_DAY_YEAR,
                timeFormat = TicketTimeFormat.HOURS_12,
            ),
        )
        assertEquals(
            "2026-10-15",
            printedTextLine(
                value = "{{print.date}}",
                dateFormat = TicketDateFormat.YEAR_MONTH_DAY,
                timeFormat = TicketTimeFormat.HOURS_24,
            ),
        )
    }

    @Test
    fun `build should resolve the combined print date and time`() {
        assertEquals(
            "Printed: 15/10/2026 9:30 PM",
            printedTextLine(
                value = "Printed: {{print.dateTime}}",
                dateFormat = TicketDateFormat.DAY_MONTH_YEAR,
                timeFormat = TicketTimeFormat.HOURS_12,
            ),
        )
    }

    @Test
    fun `build should resolve print date and time from the ticket issue date`() {
        assertEquals(
            "10/10/2026 15:18",
            printedTextLine(
                value = "{{print.date}} {{print.time}}",
                dateFormat = TicketDateFormat.DAY_MONTH_YEAR,
                timeFormat = TicketTimeFormat.HOURS_24,
                issuedAt = "2026-10-10T15:18:42.123456",
            ),
        )
    }

    @Test
    fun `build should resolve print date and time from the clock when the ticket issue date is invalid`() {
        assertEquals(
            "15/10/2026 21:30",
            printedTextLine(
                value = "{{print.date}} {{print.time}}",
                dateFormat = TicketDateFormat.DAY_MONTH_YEAR,
                timeFormat = TicketTimeFormat.HOURS_24,
                issuedAt = "not-a-date",
            ),
        )
    }

    private fun printedTextLine(
        value: String,
        dateFormat: TicketDateFormat,
        timeFormat: TicketTimeFormat,
        issuedAt: String? = null,
    ): String {
        val mockEscpos: EscPos = mock()
        val printedLineCaptor = argumentCaptor<String>()
        val ticketTemplate =
            TicketTemplate(
                id = "template-print-date",
                name = "Print Date Template",
                elements =
                    listOf(
                        TicketElement(
                            id = "elem-print-date",
                            templateId = "template-print-date",
                            order = 0,
                            type = ElementType.TEXT,
                            value = value,
                        ),
                    ),
                dateFormat = dateFormat,
                timeFormat = timeFormat,
            )
        val ticketData =
            TicketData(
                ticketId = "print-001",
                tableName = "Table 1",
                roomName = "Main Room",
                date = "2026-10-16",
                items = emptyList(),
                total = 0.0,
                issuedAt = issuedAt,
                labels = englishTicketLabels,
            )
        val businessConfig =
            Config(
                businessName = "alice",
                businessAddress = null,
                businessPhone = null,
                businessEmail = null,
                businessTaxId = null,
                businessLogoUrl = null,
                timezone = "America/Mexico_City",
            )
        val printClock = Clock.fixed(Instant.parse("2026-10-16T03:30:00Z"), ZoneOffset.UTC)

        TicketFactory(ticketTemplate, printClock).build(mockEscpos, ticketData, businessConfig)

        verify(mockEscpos).writeLF(any<Style>(), printedLineCaptor.capture())
        return printedLineCaptor.firstValue
    }

    @Test
    fun `build should print the business logo when the logo element has no image`() {
        val printedWidthDots =
            printedLogoWidthDots(
                templateText = "",
                fontSize = FontSize.NORMAL,
                businessLogoUrl = "/uploads/2026-10/alice.png",
            )

        assertEquals(192, printedWidthDots)
    }

    @Test
    fun `build should print the chosen logo image with the selected size`() {
        val printedWidthDots =
            printedLogoWidthDots(
                templateText = "/uploads/2026-10/bob.png",
                fontSize = FontSize.EXTRA_LARGE,
                businessLogoUrl = "/uploads/2026-10/alice.png",
            )

        assertEquals(384, printedWidthDots)
    }

    @Test
    fun `build should skip the logo element when there is no logo to print`() {
        val printedWidthDots =
            printedLogoWidthDots(
                templateText = "",
                fontSize = FontSize.NORMAL,
                businessLogoUrl = null,
            )

        assertNull(printedWidthDots)
    }

    private fun printedLogoWidthDots(
        templateText: String,
        fontSize: FontSize,
        businessLogoUrl: String?,
    ): Int? {
        val dataFolder = Files.createTempDirectory("ambrosia-factory-logo-test")
        try {
            val uploadRoot = dataFolder.resolve("uploads").createDirectories()
            val logoFolder = uploadRoot.resolve("2026-10").createDirectories()
            ImageIO.write(BufferedImage(100, 50, BufferedImage.TYPE_INT_RGB), "png", logoFolder.resolve("alice.png").toFile())
            ImageIO.write(BufferedImage(200, 100, BufferedImage.TYPE_INT_RGB), "png", logoFolder.resolve("bob.png").toFile())
            val mockEscpos: EscPos = mock()
            val imageCaptor = argumentCaptor<EscPosImage>()
            val ticketTemplate =
                TicketTemplate(
                    id = "template-logo",
                    name = "Logo Template",
                    elements =
                        listOf(
                            TicketElement(
                                id = "elem-logo",
                                templateId = "template-logo",
                                order = 0,
                                type = ElementType.LOGO,
                                value = templateText,
                                style = ElementStyle(fontSize = fontSize),
                            ),
                        ),
                )
            val ticketData =
                TicketData(
                    ticketId = "logo-001",
                    tableName = "Table 1",
                    roomName = "Main Room",
                    date = "2026-10-15",
                    items = emptyList(),
                    total = 0.0,
                    labels = englishTicketLabels,
                )
            val businessConfig =
                Config(
                    businessName = "alice",
                    businessAddress = null,
                    businessPhone = null,
                    businessEmail = null,
                    businessTaxId = null,
                    businessLogoUrl = businessLogoUrl,
                )

            TicketFactory(ticketTemplate, logoLoader = TicketLogoLoader(uploadRoot)).build(mockEscpos, ticketData, businessConfig)

            verify(mockEscpos, atMost(1)).write(any<ImageWrapperInterface<*>>(), imageCaptor.capture())
            return imageCaptor.allValues.firstOrNull()?.widthOfImageInBits
        } finally {
            dataFolder.toFile().deleteRecursively()
        }
    }

    private fun printedQrWidthDots(
        qrContent: String,
        fontSize: FontSize,
    ): Int {
        val mockEscpos: EscPos = mock()
        val imageCaptor = argumentCaptor<EscPosImage>()
        val ticketTemplate =
            TicketTemplate(
                id = "template-qr",
                name = "QR Template",
                elements =
                    listOf(
                        TicketElement(
                            id = "elem-qr",
                            templateId = "template-qr",
                            order = 0,
                            type = ElementType.QRCODE,
                            value = qrContent,
                            style = ElementStyle(fontSize = fontSize),
                        ),
                    ),
            )
        val ticketData =
            TicketData(
                ticketId = "qr-001",
                tableName = "Table 1",
                roomName = "Main Room",
                date = "2026-10-15",
                items = emptyList(),
                total = 0.0,
                labels = englishTicketLabels,
            )

        TicketFactory(ticketTemplate).build(mockEscpos, ticketData, null)

        verify(mockEscpos).write(any<ImageWrapperInterface<*>>(), imageCaptor.capture())
        return imageCaptor.firstValue.widthOfImageInBits
    }

    @Test
    fun `build should print the shift summary with translated payment methods and the cash block`() {
        val printedLines =
            printedShiftReportLines(
                elements = listOf(shiftReportElement(ElementType.SHIFT_SUMMARY)),
                closedAt = "2026-10-10T18:05:00",
            )

        assertEquals(
            listOf(
                "SHIFT CLOSE",
                formatTicketLine("Cashier", "alice"),
                formatTicketLine("Opened", "10/10/2026 09:00"),
                formatTicketLine("Closed", "10/10/2026 18:05"),
                formatTicketLine("Tickets", "3"),
                "-".repeat(TicketFactory.DEFAULT_TICKET_WIDTH),
                formatTicketLine("Cash payments", "80.0"),
                formatTicketLine("Card", "40.0"),
                formatTicketLine("Sales", "120.0"),
                formatTicketLine("Tips", "6.0"),
                "-".repeat(TicketFactory.DEFAULT_TICKET_WIDTH),
                formatTicketLine("Initial cash", "100.0"),
                formatTicketLine("Cash sales", "80.0"),
                formatTicketLine("Cash refunds", "-10.0"),
                formatTicketLine("Expected cash", "170.0"),
                formatTicketLine("Counted cash", "175.0"),
                formatTicketLine("Difference", "5.0"),
            ),
            printedLines,
        )
    }

    @Test
    fun `build should skip the closing rows of the shift summary while the shift is still open`() {
        val printedLines =
            printedShiftReportLines(
                elements = listOf(shiftReportElement(ElementType.SHIFT_SUMMARY)),
                closedAt = null,
                finalAmount = null,
                difference = null,
            )

        assertTrue(printedLines.none { printedLine -> printedLine.startsWith("Closed") })
        assertTrue(printedLines.none { printedLine -> printedLine.startsWith("Counted cash") })
        assertTrue(printedLines.none { printedLine -> printedLine.startsWith("Difference") })
    }

    @Test
    fun `build should skip sale elements when printing a shift report`() {
        val printedLines =
            printedShiftReportLines(
                elements =
                    listOf(
                        shiftReportElement(ElementType.TABLE_HEADER, "Products"),
                        shiftReportElement(ElementType.TOTAL_ROW),
                        shiftReportElement(ElementType.PAYMENT_METHOD),
                        shiftReportElement(ElementType.TEXT, "Cashier {{shift.cashier}}"),
                    ),
                closedAt = "2026-10-10T18:05:00",
            )

        assertEquals(listOf("Cashier alice"), printedLines)
    }

    @Test
    fun `build should skip the shift summary when printing a sale receipt`() {
        val mockEscpos: EscPos = mock()
        val ticketTemplate =
            TicketTemplate(
                id = "template-shift-report",
                name = "Shift Report Template",
                elements = listOf(shiftReportElement(ElementType.SHIFT_SUMMARY)),
            )
        val ticketData =
            TicketData(
                ticketId = "sale-001",
                tableName = "Table 1",
                roomName = "Main Room",
                date = "2026-10-10",
                items = emptyList(),
                total = 10.0,
                labels = englishTicketLabels,
            )

        TicketFactory(ticketTemplate).build(mockEscpos, ticketData, null)

        verify(mockEscpos, never()).writeLF(any<Style>(), any<String>())
    }

    @Test
    fun `build should resolve shift variables and print the shift closing time as the print date`() {
        val printedLines =
            printedShiftReportLines(
                elements =
                    listOf(
                        shiftReportElement(ElementType.TEXT, "{{shift.expectedCash}} {{shift.countedCash}} {{shift.difference}}"),
                        shiftReportElement(ElementType.TEXT, "{{print.dateTime}}"),
                    ),
                closedAt = "2026-10-10T18:05:00",
            )

        assertEquals(listOf("170.0 175.0 5.0", "10/10/2026 18:05"), printedLines)
    }

    private fun shiftReportElement(
        elementType: ElementType,
        value: String = "",
    ): TicketElement =
        TicketElement(
            id = "elem-${elementType.name}-$value",
            templateId = "template-shift-report",
            order = 0,
            type = elementType,
            value = value,
        )

    private fun printedShiftReportLines(
        elements: List<TicketElement>,
        closedAt: String?,
        finalAmount: Double? = 175.0,
        difference: Double? = 5.0,
    ): List<String> {
        val mockEscpos: EscPos = mock()
        val printedLineCaptor = argumentCaptor<String>()
        val ticketTemplate =
            TicketTemplate(
                id = "template-shift-report",
                name = "Shift Report Template",
                elements = elements,
            )
        val shiftReport =
            ShiftReportPrintData(
                cashierName = "alice",
                openedAt = "2026-10-10T09:00:00",
                closedAt = closedAt,
                breakdown =
                    ShiftBreakdown(
                        shiftId = "shift-alice",
                        initialAmount = 100.0,
                        finalAmount = finalAmount,
                        difference = difference,
                        totalSales = 120.0,
                        totalTips = 6.0,
                        cashSales = 80.0,
                        cashRefunds = 10.0,
                        expectedTotal = 170.0,
                        totalTickets = 3,
                        byPaymentMethod =
                            listOf(
                                ShiftPaymentMethodTotal(name = "Cash", total = 80.0),
                                ShiftPaymentMethodTotal(name = "Card", total = 40.0),
                            ),
                    ),
                labels = shiftReportLabels(paymentMethods = mapOf("cash" to "Cash payments")),
            )

        TicketFactory(ticketTemplate).build(mockEscpos, PrintableTicket.ShiftReport(shiftReport), null)

        verify(mockEscpos, atLeast(0)).writeLF(any<Style>(), printedLineCaptor.capture())
        return printedLineCaptor.allValues
    }
}

private val englishTicketLabels =
    TicketLabels(
        total = "TOTAL",
        discount = "DISCOUNT",
        tip = "TIP",
        paymentMethod = "PAYMENT METHOD",
    )
