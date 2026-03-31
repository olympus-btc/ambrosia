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
import pos.ambrosia.models.TicketData
import pos.ambrosia.models.TicketTemplate
import pos.ambrosia.util.formatTicketLine
import java.awt.image.BufferedImage
import java.util.EnumMap

class TicketFactory(
    private val template: TicketTemplate,
) {
    companion object {
        const val DEFAULT_TICKET_WIDTH = 48
        const val DEFAULT_FEED_LINES = 5
        const val DEFAULT_CHARSET = "cp850"

        private val QR_IMAGE_SIZE_BY_FONT_SIZE =
            mapOf(
                FontSize.NORMAL to ImageSize.SMALL,
                FontSize.LARGE to ImageSize.MEDIUM,
                FontSize.EXTRA_LARGE to ImageSize.LARGE,
            )
        private val QR_IMAGE_SIZE_PX =
            mapOf(
                ImageSize.SMALL to 300,
                ImageSize.MEDIUM to 360,
                ImageSize.LARGE to 420,
            )
    }

    fun build(
        escpos: EscPos,
        data: TicketData,
        config: Config?,
    ) {
        template.elements.forEach { element ->
            val style = convertToEscPosStyle(element.style)
            val content = resolveValue(element.value, data, config)

            when (element.type) {
                ElementType.SEPARATOR -> {
                    escpos.writeLF(style, content.repeat(DEFAULT_TICKET_WIDTH))
                }

                ElementType.TABLE_HEADER -> {
                    escpos.writeLF(style, content)
                }

                ElementType.TABLE_ROW -> {
                    data.items.forEach {
                        val itemText = "${it.quantity}x ${it.name}"
                        val priceText = it.price.toString()
                        val row = formatTicketLine(itemText, priceText)
                        escpos.writeLF(style, row)
                        it.comments.forEach { comment ->
                            escpos.writeLF(style, "  - $comment")
                        }
                    }
                }

                ElementType.TOTAL_ROW -> {
                    val label = content.ifEmpty { "TOTAL" }
                    val row = formatTicketLine(label, data.total.toString())
                    escpos.writeLF(style, "-".repeat(DEFAULT_TICKET_WIDTH))
                    escpos.writeLF(style, row)
                }

                ElementType.QRCODE -> {
                    val qrContent = if (content.isNotBlank()) content else (data.invoice ?: "")
                    if (qrContent.isNotBlank()) {
                        writeQrCode(escpos, qrContent, element.style)
                    }
                }

                else -> {
                    escpos.writeLF(style, content)
                }
            }
        }
    }

    private fun writeQrCode(
        escpos: EscPos,
        content: String,
        elementStyle: ElementStyle?,
    ) {
        val fontSize = elementStyle?.fontSize ?: FontSize.NORMAL
        val imageSize = QR_IMAGE_SIZE_BY_FONT_SIZE[fontSize] ?: ImageSize.SMALL
        val sizePx = QR_IMAGE_SIZE_PX[imageSize] ?: 300

        logger.info("Printing QR image: sizePx=$sizePx, contentLength=${content.length}")
        try {
            val hints = EnumMap<EncodeHintType, Any>(EncodeHintType::class.java)
            hints[EncodeHintType.ERROR_CORRECTION] = ErrorCorrectionLevel.M
            hints[EncodeHintType.MARGIN] = 1
            val bitMatrix = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, sizePx, sizePx, hints)
            val image = BufferedImage(bitMatrix.width, bitMatrix.height, BufferedImage.TYPE_INT_RGB)
            for (x in 0 until bitMatrix.width) {
                for (y in 0 until bitMatrix.height) {
                    image.setRGB(x, y, if (bitMatrix.get(x, y)) 0x000000 else 0xFFFFFF)
                }
            }
            val escPosImage = EscPosImage(CoffeeImageImpl(image), BitonalThreshold())
            val wrapper = RasterBitImageWrapper()
            wrapper.setJustification(
                when (elementStyle?.justification ?: Justification.LEFT) {
                    Justification.LEFT -> EscPosConst.Justification.Left_Default
                    Justification.CENTER -> EscPosConst.Justification.Center
                    Justification.RIGHT -> EscPosConst.Justification.Right
                },
            )
            escpos.write(wrapper, escPosImage)
            escpos.feed(1)
        } catch (e: Exception) {
            logger.error("Failed to print QR image: ${e.message}", e)
            val fallbackStyle = convertToEscPosStyle(elementStyle)
            escpos.writeLF(fallbackStyle, content)
        }
    }

    private fun resolveValue(
        value: String,
        data: TicketData,
        config: Config?,
    ): String {
        val replacements = buildReplacementMap(data, config)
        var resolved = value
        replacements.forEach { (placeholder, replacement) ->
            resolved = resolved.replace(placeholder, replacement)
        }
        return resolved
    }

    private fun buildReplacementMap(
        data: TicketData,
        config: Config?,
    ): Map<String, String> =
        buildMap {
            put("{{ticket.id}}", data.ticketId)
            put("{{ticket.tableName}}", data.tableName)
            put("{{ticket.roomName}}", data.roomName)
            put("{{ticket.date}}", data.date)
            put("{{ticket.total}}", data.total.toString())
            put("{{ticket.invoice}}", data.invoice ?: "")
            config?.let {
                put("{{config.businessName}}", it.businessName)
                put("{{config.businessAddress}}", it.businessAddress ?: "")
                put("{{config.businessPhone}}", it.businessPhone ?: "")
                put("{{config.businessEmail}}", it.businessEmail ?: "")
            }
        }

    private fun convertToEscPosStyle(elementStyle: ElementStyle?): Style {
        val escposStyle = Style()
        elementStyle?.let {
            if (it.bold) {
                escposStyle.setBold(true)
            }
            escposStyle.setJustification(
                when (it.justification) {
                    Justification.LEFT -> EscPosConst.Justification.Left_Default
                    Justification.CENTER -> EscPosConst.Justification.Center
                    Justification.RIGHT -> EscPosConst.Justification.Right
                },
            )
            escposStyle.setFontSize(
                when (it.fontSize) {
                    FontSize.NORMAL -> Style.FontSize.`_1`
                    FontSize.LARGE -> Style.FontSize.`_2`
                    FontSize.EXTRA_LARGE -> Style.FontSize.`_3`
                },
                Style.FontSize.`_1`,
            )
        }
        return escposStyle
    }
}
