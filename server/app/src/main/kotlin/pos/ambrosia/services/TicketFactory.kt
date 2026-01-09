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
import java.awt.image.BufferedImage
import java.util.EnumMap
import pos.ambrosia.models.*
import pos.ambrosia.util.formatTicketLine
import pos.ambrosia.logger

class TicketFactory(private val template: TicketTemplate) {

  fun build(escpos: EscPos, data: TicketData, config: Config?) {
    template.elements.forEach { element ->
      val style = convertToEscPosStyle(element.style)
      val content = resolveValue(element.value, data, config)

      when (element.type) {
        ElementType.SEPARATOR -> escpos.writeLF(style, content.repeat(48))
        ElementType.TABLE_HEADER -> escpos.writeLF(style, content)
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
        ElementType.QRCODE -> {
          val qrContent = if (content.isNotBlank()) content else (data.invoice ?: "")
          if (qrContent.isNotBlank()) {
            val sizePx =
                when (element.style?.fontSize ?: FontSize.NORMAL) {
                  FontSize.NORMAL -> 300
                  FontSize.LARGE -> 360
                  FontSize.EXTRA_LARGE -> 420
                }
            logger.info("Printing QR image: sizePx=$sizePx, contentLength=${qrContent.length}")
            try {
              val hints = EnumMap<EncodeHintType, Any>(EncodeHintType::class.java)
              hints[EncodeHintType.ERROR_CORRECTION] = ErrorCorrectionLevel.M
              hints[EncodeHintType.MARGIN] = 1
              val bitMatrix = QRCodeWriter().encode(qrContent, BarcodeFormat.QR_CODE, sizePx, sizePx, hints)
              val image = BufferedImage(bitMatrix.width, bitMatrix.height, BufferedImage.TYPE_INT_RGB)
              for (x in 0 until bitMatrix.width) {
                for (y in 0 until bitMatrix.height) {
                  image.setRGB(x, y, if (bitMatrix.get(x, y)) 0x000000 else 0xFFFFFF)
                }
              }
              val escPosImage = EscPosImage(CoffeeImageImpl(image), BitonalThreshold())
              val wrapper = RasterBitImageWrapper()
              wrapper.setJustification(
                  when (element.style?.justification ?: Justification.LEFT) {
                    Justification.LEFT -> EscPosConst.Justification.Left_Default
                    Justification.CENTER -> EscPosConst.Justification.Center
                    Justification.RIGHT -> EscPosConst.Justification.Right
                  }
              )
              escpos.write(wrapper, escPosImage)
              escpos.feed(1)
            } catch (e: Exception) {
              logger.error("Failed to print QR image: ${e.message}", e)
              escpos.writeLF(style, qrContent)
            }
          }
        }
        else -> escpos.writeLF(style, content)
      }
    }
  }

  private fun resolveValue(value: String, item: TicketDataItem): String {
    return value.replace("{{item.quantity}}", item.quantity.toString())
            .replace("{{item.name}}", item.name)
            .replace("{{item.price}}", item.price.toString())
  }

  private fun resolveValue(value: String, data: TicketData, config: Config?): String {
    var resolved = value
    config?.let {
      resolved = resolved.replace("{{config.businessName}}", it.businessName)
      resolved = resolved.replace("{{config.businessAddress}}", it.businessAddress ?: "")
      resolved = resolved.replace("{{config.businessPhone}}", it.businessPhone ?: "")
    }

    return resolved.replace("{{ticket.id}}", data.ticketId)
            .replace("{{ticket.tableName}}", data.tableName)
            .replace("{{ticket.roomName}}", data.roomName)
            .replace("{{ticket.date}}", data.date)
            .replace("{{ticket.total}}", data.total.toString())
            .replace("{{ticket.invoice}}", data.invoice ?: "")
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
              }
      )
      escposStyle.setFontSize(
              when (it.fontSize) {
                FontSize.NORMAL -> Style.FontSize.`_1`
                FontSize.LARGE -> Style.FontSize.`_2`
                FontSize.EXTRA_LARGE -> Style.FontSize.`_3`
              },
              Style.FontSize.`_1`
      )
    }
    return escposStyle
  }
}
