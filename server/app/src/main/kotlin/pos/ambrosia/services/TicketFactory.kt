package pos.ambrosia.services

import com.github.anastaciocintra.escpos.EscPos
import com.github.anastaciocintra.escpos.EscPosConst
import com.github.anastaciocintra.escpos.Style
import com.github.anastaciocintra.escpos.image.BitonalThreshold
import com.github.anastaciocintra.escpos.image.CoffeeImageImpl
import com.github.anastaciocintra.escpos.image.EscPosImage
import com.github.anastaciocintra.escpos.image.RasterBitImageWrapper
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import pos.ambrosia.logger
import pos.ambrosia.models.Config
import pos.ambrosia.models.ElementStyle
import pos.ambrosia.models.ElementType
import pos.ambrosia.models.FontSize
import pos.ambrosia.models.ImageSize
import pos.ambrosia.models.Justification
import pos.ambrosia.models.ShiftReportPrintData
import pos.ambrosia.models.TicketData
import pos.ambrosia.models.TicketTemplate
import pos.ambrosia.utils.formatTicketLine
import pos.ambrosia.utils.removeAccents
import java.awt.image.BufferedImage
import java.time.Clock
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.EnumMap
import java.util.Locale

class TicketFactory(
    private val template: TicketTemplate,
    private val clock: Clock = Clock.systemUTC(),
    private val logoLoader: TicketLogoLoader? = null,
) {
    companion object {
        const val DEFAULT_TICKET_WIDTH = 48
        const val DEFAULT_FEED_LINES = 5
        const val DEFAULT_CHARSET = "cp850"
        private val SEPARATOR_LINE = "-".repeat(DEFAULT_TICKET_WIDTH)

        private val QR_IMAGE_SIZE_BY_FONT_SIZE =
            mapOf(
                FontSize.NORMAL to ImageSize.SMALL,
                FontSize.LARGE to ImageSize.MEDIUM,
                FontSize.EXTRA_LARGE to ImageSize.LARGE,
            )
        private val QR_TARGET_WIDTH_DOTS =
            mapOf(
                ImageSize.SMALL to 160,
                ImageSize.MEDIUM to 240,
                ImageSize.LARGE to 320,
            )
        private val LOGO_TARGET_WIDTH_DOTS =
            mapOf(
                FontSize.NORMAL to 192,
                FontSize.LARGE to 288,
                FontSize.EXTRA_LARGE to 384,
            )
        private const val QR_MIN_DOTS_PER_MODULE = 3
        private const val PRINTABLE_WIDTH_DOTS = 576
        const val JOB_START_PADDING_BYTES = 1024
        private val SALE_ELEMENT_TYPES =
            setOf(ElementType.TABLE_HEADER, ElementType.TABLE_ROW, ElementType.TOTAL_ROW, ElementType.PAYMENT_METHOD)
    }

    fun build(
        escpos: EscPos,
        ticketData: TicketData,
        businessConfig: Config?,
    ) {
        build(escpos, PrintableTicket.SaleReceipt(ticketData), businessConfig)
    }

    fun build(
        escpos: EscPos,
        printableTicket: PrintableTicket,
        businessConfig: Config?,
    ) {
        escpos.write(ByteArray(JOB_START_PADDING_BYTES), 0, JOB_START_PADDING_BYTES)
        escpos.initializePrinter()
        val replacements = buildReplacementMap(printableTicket, businessConfig)
        template.elements.forEach { templateElement ->
            val escPosStyle = convertToEscPosStyle(templateElement.style)
            val resolvedContent = resolveTemplateVariables(templateElement.value, replacements)

            when (templateElement.type) {
                ElementType.SEPARATOR -> {
                    writePrintableLine(escpos, escPosStyle, SEPARATOR_LINE)
                }

                in SALE_ELEMENT_TYPES -> {
                    if (printableTicket is PrintableTicket.SaleReceipt) {
                        writeSaleElement(escpos, templateElement.type, escPosStyle, resolvedContent, printableTicket.ticketData)
                    }
                }

                ElementType.SHIFT_SUMMARY -> {
                    if (printableTicket is PrintableTicket.ShiftReport) {
                        writeShiftSummary(escpos, escPosStyle, resolvedContent, printableTicket.shiftReport)
                    }
                }

                ElementType.QRCODE -> {
                    val saleInvoice = (printableTicket as? PrintableTicket.SaleReceipt)?.ticketData?.invoice.orEmpty()
                    val qrContent = resolvedContent.ifBlank { saleInvoice }
                    if (qrContent.isNotBlank()) {
                        writeQrCode(escpos, qrContent, templateElement.style)
                    }
                }

                ElementType.LOGO -> {
                    val storedLogoUrl = templateElement.value.ifBlank { businessConfig?.businessLogoUrl.orEmpty() }
                    if (storedLogoUrl.isNotBlank()) {
                        writeLogo(escpos, storedLogoUrl, templateElement.style)
                    }
                }

                else -> {
                    writePrintableLine(escpos, escPosStyle, resolvedContent)
                }
            }
        }
    }

    private fun writeSaleElement(
        escpos: EscPos,
        elementType: ElementType,
        escPosStyle: Style,
        resolvedContent: String,
        ticketData: TicketData,
    ) {
        when (elementType) {
            ElementType.TABLE_HEADER -> {
                writePrintableLine(escpos, escPosStyle, resolvedContent)
            }

            ElementType.TABLE_ROW -> {
                ticketData.items.forEach { ticketItem ->
                    val itemText = "${ticketItem.quantity}x ${ticketItem.name}"
                    val priceText = ticketItem.price.toString()
                    val itemRow = formatTicketLine(itemText, priceText)
                    writePrintableLine(escpos, escPosStyle, itemRow)
                    ticketItem.comments.forEach { comment ->
                        writePrintableLine(escpos, escPosStyle, "  - $comment")
                    }
                }
            }

            ElementType.TOTAL_ROW -> {
                val totalLabel = resolvedContent.ifEmpty { ticketData.labels.total }
                writePrintableLine(escpos, escPosStyle, SEPARATOR_LINE)
                if (ticketData.discountAmount > 0) {
                    val discountRow = formatTicketLine(ticketData.labels.discount, "-${ticketData.discountAmount}")
                    writePrintableLine(escpos, escPosStyle, discountRow)
                }
                if (ticketData.tipAmount > 0) {
                    val tipRow = formatTicketLine(ticketData.labels.tip, "+${ticketData.tipAmount}")
                    writePrintableLine(escpos, escPosStyle, tipRow)
                }
                val totalRow = formatTicketLine(totalLabel, ticketData.total.toString())
                writePrintableLine(escpos, escPosStyle, totalRow)
            }

            ElementType.PAYMENT_METHOD -> {
                val paymentMethodName = ticketData.paymentMethod.orEmpty()
                if (paymentMethodName.isNotBlank()) {
                    val paymentMethodLabel = resolvedContent.ifEmpty { ticketData.labels.paymentMethod }
                    writePrintableLine(escpos, escPosStyle, formatTicketLine(paymentMethodLabel, paymentMethodName))
                }
            }

            else -> {
                writePrintableLine(escpos, escPosStyle, resolvedContent)
            }
        }
    }

    private fun writeShiftSummary(
        escpos: EscPos,
        escPosStyle: Style,
        resolvedContent: String,
        shiftReport: ShiftReportPrintData,
    ) {
        val labels = shiftReport.labels
        val breakdown = shiftReport.breakdown
        val writeRow = { label: String, value: String -> writePrintableLine(escpos, escPosStyle, formatTicketLine(label, value)) }

        writePrintableLine(escpos, escPosStyle, resolvedContent.ifEmpty { labels.title })
        writeRow(labels.cashier, shiftReport.cashierName)
        writeRow(labels.openedAt, formatShiftDateTime(shiftReport.openedAt))
        shiftReport.closedAt?.let { closedAt -> writeRow(labels.closedAt, formatShiftDateTime(closedAt)) }
        writeRow(labels.tickets, breakdown.totalTickets.toString())

        writePrintableLine(escpos, escPosStyle, SEPARATOR_LINE)
        breakdown.byPaymentMethod.forEach { paymentMethodTotal ->
            val paymentMethodLabel = labels.paymentMethods[paymentMethodTotal.name.trim().lowercase()] ?: paymentMethodTotal.name
            writeRow(paymentMethodLabel, paymentMethodTotal.total.toString())
        }
        writeRow(labels.totalSales, breakdown.totalSales.toString())
        writeRow(labels.tips, breakdown.totalTips.toString())

        writePrintableLine(escpos, escPosStyle, SEPARATOR_LINE)
        writeRow(labels.initialAmount, breakdown.initialAmount.toString())
        writeRow(labels.cashSales, breakdown.cashSales.toString())
        writeRow(labels.cashRefunds, "-${breakdown.cashRefunds}")
        writeRow(labels.expectedCash, breakdown.expectedTotal.toString())
        breakdown.finalAmount?.let { countedCash -> writeRow(labels.countedCash, countedCash.toString()) }
        breakdown.difference?.let { difference -> writeRow(labels.difference, difference.toString()) }
    }

    private fun formatShiftDateTime(localDateTime: String): String =
        parseIssuedAt(localDateTime)
            ?.format(DateTimeFormatter.ofPattern("${template.dateFormat.pattern} ${template.timeFormat.pattern}", Locale.US))
            ?: localDateTime

    private fun writePrintableLine(
        escpos: EscPos,
        escPosStyle: Style,
        lineText: String,
    ) {
        escpos.writeLF(escPosStyle, removeAccents(lineText))
    }

    private fun writeQrCode(
        escpos: EscPos,
        qrContent: String,
        elementStyle: ElementStyle?,
    ) {
        val fontSize = elementStyle?.fontSize ?: FontSize.NORMAL
        val imageSize = QR_IMAGE_SIZE_BY_FONT_SIZE[fontSize] ?: ImageSize.SMALL
        val targetWidthDots = QR_TARGET_WIDTH_DOTS.getValue(imageSize)

        logger.info("Printing QR image: targetWidthDots=$targetWidthDots, contentLength=${qrContent.length}")
        try {
            val qrEncodeHints = EnumMap<EncodeHintType, Any>(EncodeHintType::class.java)
            qrEncodeHints[EncodeHintType.ERROR_CORRECTION] = ErrorCorrectionLevel.M
            qrEncodeHints[EncodeHintType.MARGIN] = 1
            val moduleMatrix = QRCodeWriter().encode(qrContent, BarcodeFormat.QR_CODE, 0, 0, qrEncodeHints)
            val moduleCount = moduleMatrix.width
            val dotsPerModule = resolveQrDotsPerModule(moduleCount, targetWidthDots)
            val imageWidthDots = moduleCount * dotsPerModule
            val qrImage = BufferedImage(imageWidthDots, imageWidthDots, BufferedImage.TYPE_INT_RGB)
            for (pixelX in 0 until imageWidthDots) {
                for (pixelY in 0 until imageWidthDots) {
                    val isDarkModule = moduleMatrix.get(pixelX / dotsPerModule, pixelY / dotsPerModule)
                    qrImage.setRGB(pixelX, pixelY, if (isDarkModule) 0x000000 else 0xFFFFFF)
                }
            }
            writeRasterImage(escpos, qrImage, elementStyle?.justification ?: Justification.LEFT)
        } catch (qrException: Exception) {
            logger.error("Failed to print QR image: ${qrException.message}", qrException)
            val fallbackStyle = convertToEscPosStyle(elementStyle)
            writePrintableLine(escpos, fallbackStyle, qrContent)
        }
    }

    private fun writeLogo(
        escpos: EscPos,
        storedLogoUrl: String,
        elementStyle: ElementStyle?,
    ) {
        val targetWidthDots = LOGO_TARGET_WIDTH_DOTS.getValue(elementStyle?.fontSize ?: FontSize.NORMAL)
        val logoImage =
            try {
                logoLoader?.loadScaledLogo(storedLogoUrl, targetWidthDots)
            } catch (logoException: Exception) {
                logger.error("Failed to load logo image: ${logoException.message}", logoException)
                null
            } ?: return
        writeRasterImage(escpos, logoImage, elementStyle?.justification ?: Justification.LEFT)
    }

    private fun writeRasterImage(
        escpos: EscPos,
        rasterImage: BufferedImage,
        justification: Justification,
    ) {
        val escPosImage = EscPosImage(CoffeeImageImpl(rasterImage), BitonalThreshold())
        val rasterImageWrapper = RasterBitImageWrapper()
        rasterImageWrapper.setJustification(
            when (justification) {
                Justification.LEFT -> EscPosConst.Justification.Left_Default
                Justification.CENTER -> EscPosConst.Justification.Center
                Justification.RIGHT -> EscPosConst.Justification.Right
            },
        )
        escpos.write(rasterImageWrapper, escPosImage)
        escpos.feed(1)
    }

    private fun resolveQrDotsPerModule(
        moduleCount: Int,
        targetWidthDots: Int,
    ): Int {
        val readableDotsPerModule = maxOf(targetWidthDots / moduleCount, QR_MIN_DOTS_PER_MODULE)
        val maxDotsPerModule = maxOf(PRINTABLE_WIDTH_DOTS / moduleCount, 1)
        return minOf(readableDotsPerModule, maxDotsPerModule)
    }

    private fun resolveTemplateVariables(
        templateText: String,
        replacements: Map<String, String>,
    ): String {
        var resolvedText = templateText
        replacements.forEach { (placeholder, replacement) ->
            resolvedText = resolvedText.replace(placeholder, replacement)
        }
        return resolvedText
    }

    private fun buildReplacementMap(
        printableTicket: PrintableTicket,
        businessConfig: Config?,
    ): Map<String, String> =
        buildMap {
            when (printableTicket) {
                is PrintableTicket.SaleReceipt -> putAll(buildSaleReplacements(printableTicket.ticketData))
                is PrintableTicket.ShiftReport -> putAll(buildShiftReplacements(printableTicket.shiftReport))
            }
            val printedAt = resolvePrintedAt(printableTicket, businessConfig)
            val printDate = printedAt.format(DateTimeFormatter.ofPattern(template.dateFormat.pattern, Locale.US))
            val printTime = printedAt.format(DateTimeFormatter.ofPattern(template.timeFormat.pattern, Locale.US))
            put("{{print.date}}", printDate)
            put("{{print.time}}", printTime)
            put("{{print.dateTime}}", "$printDate $printTime")
            if (businessConfig != null) {
                put("{{config.businessName}}", businessConfig.businessName)
                put("{{config.businessAddress}}", businessConfig.businessAddress ?: "")
                put("{{config.businessPhone}}", businessConfig.businessPhone ?: "")
                put("{{config.businessEmail}}", businessConfig.businessEmail ?: "")
            }
        }

    private fun buildSaleReplacements(ticketData: TicketData): Map<String, String> =
        mapOf(
            "{{ticket.id}}" to ticketData.ticketId,
            "{{ticket.tableName}}" to ticketData.tableName,
            "{{ticket.roomName}}" to ticketData.roomName,
            "{{ticket.date}}" to ticketData.date,
            "{{ticket.total}}" to ticketData.total.toString(),
            "{{ticket.discountAmount}}" to ticketData.discountAmount.toString(),
            "{{ticket.tipAmount}}" to ticketData.tipAmount.toString(),
            "{{ticket.invoice}}" to (ticketData.invoice ?: ""),
        )

    private fun buildShiftReplacements(shiftReport: ShiftReportPrintData): Map<String, String> {
        val breakdown = shiftReport.breakdown
        return mapOf(
            "{{shift.cashier}}" to shiftReport.cashierName,
            "{{shift.openedAt}}" to formatShiftDateTime(shiftReport.openedAt),
            "{{shift.closedAt}}" to shiftReport.closedAt?.let(::formatShiftDateTime).orEmpty(),
            "{{shift.totalTickets}}" to breakdown.totalTickets.toString(),
            "{{shift.totalSales}}" to breakdown.totalSales.toString(),
            "{{shift.totalTips}}" to breakdown.totalTips.toString(),
            "{{shift.initialAmount}}" to breakdown.initialAmount.toString(),
            "{{shift.cashSales}}" to breakdown.cashSales.toString(),
            "{{shift.cashRefunds}}" to breakdown.cashRefunds.toString(),
            "{{shift.expectedCash}}" to breakdown.expectedTotal.toString(),
            "{{shift.countedCash}}" to breakdown.finalAmount?.toString().orEmpty(),
            "{{shift.difference}}" to breakdown.difference?.toString().orEmpty(),
        )
    }

    private fun resolvePrintedAt(
        printableTicket: PrintableTicket,
        businessConfig: Config?,
    ): ZonedDateTime {
        val businessZone = businessConfig?.timezone?.let(ZoneId::of) ?: clock.zone
        return printableTicket.issuedAt
            ?.let(::parseIssuedAt)
            ?.atZone(businessZone)
            ?: ZonedDateTime.now(clock).withZoneSameInstant(businessZone)
    }

    private fun parseIssuedAt(issuedAt: String): LocalDateTime? =
        try {
            LocalDateTime.parse(issuedAt)
        } catch (invalidIssuedAtException: DateTimeParseException) {
            logger.warn("Ignoring invalid ticket issuedAt '$issuedAt': ${invalidIssuedAtException.message}")
            null
        }

    private fun convertToEscPosStyle(elementStyle: ElementStyle?): Style {
        val escposStyle = Style()
        if (elementStyle != null) {
            if (elementStyle.bold) {
                escposStyle.setBold(true)
            }
            escposStyle.setJustification(
                when (elementStyle.justification) {
                    Justification.LEFT -> EscPosConst.Justification.Left_Default
                    Justification.CENTER -> EscPosConst.Justification.Center
                    Justification.RIGHT -> EscPosConst.Justification.Right
                },
            )
            val printedFontSize =
                when (elementStyle.fontSize) {
                    FontSize.NORMAL -> Style.FontSize.`_1`
                    FontSize.LARGE -> Style.FontSize.`_2`
                    FontSize.EXTRA_LARGE -> Style.FontSize.`_3`
                }
            escposStyle.setFontSize(printedFontSize, printedFontSize)
        }
        return escposStyle
    }
}
