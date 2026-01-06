package pos.ambrosia.services

import com.github.anastaciocintra.escpos.EscPos
import com.github.anastaciocintra.output.PrinterOutputStream
import java.io.IOException
import pos.ambrosia.models.TicketData
import pos.ambrosia.models.PrinterType
import pos.ambrosia.models.Config
import pos.ambrosia.logger

class PrintService(
    private val ticketTemplateService: TicketTemplateService,
    private val printerConfigService: PrinterConfigService
) {

  fun getAvailablePrinters(): Array<String> {
    val printerNames = PrinterOutputStream.getListPrintServicesNames()
    logger.info("Found ${printerNames.size} available printers: ${printerNames.joinToString(", ")}")
    return printerNames
  }

  suspend fun setPrinter(type: PrinterType, printerName: String): String? {
    logger.info("Setting default printer '$printerName' for $type")
    val printService = PrinterOutputStream.getPrintServiceByName(printerName)
    if (printService == null) {
      logger.error("Printer '$printerName' not found on this system.")
    }
    return printerConfigService.upsertDefaultByTypeName(type, printerName)
  }

  suspend fun printTicket(
      ticketData: TicketData,
      templateName: String,
      type: PrinterType,
      config: Config?,
      printerId: String?,
      broadcast: Boolean
  ) {
    val template =
        ticketTemplateService.getTemplateByName(templateName)
            ?: throw IOException("Template '$templateName' not found.")

    val configs =
        when {
          printerId != null -> {
            val configById = printerConfigService.getPrinterConfigById(printerId)
            if (configById == null) {
              throw IOException("Printer configuration not found for id '$printerId'.")
            }
            listOf(configById)
          }
          broadcast -> {
            printerConfigService.getEnabledByType(type)
          }
          else -> {
            val defaultConfig = printerConfigService.getDefaultByType(type)
            if (defaultConfig == null) {
              throw IOException("Default printer for type $type not configured.")
            }
            listOf(defaultConfig)
          }
        }

    if (configs.isEmpty()) {
      throw IOException("No printers configured for type $type.")
    }

    val resolvedPrinters =
        configs.mapNotNull { configItem ->
          val printerService = PrinterOutputStream.getPrintServiceByName(configItem.printerName)
          if (printerService == null) {
            logger.error("Printer '${configItem.printerName}' not found on this system.")
          }
          printerService
        }

    if (resolvedPrinters.isEmpty()) {
      throw IOException("No configured printers found on this system for type $type.")
    }

    try {
      val ticketFactory = TicketFactory(template)
      var successCount = 0

      resolvedPrinters.forEach { printerService ->
        try {
          val printerOutputStream = PrinterOutputStream(printerService)
          val escpos = EscPos(printerOutputStream)
          ticketFactory.build(escpos, ticketData, config)
          escpos.feed(5).cut(EscPos.CutMode.FULL)
          escpos.close()
          successCount += 1
        } catch (e: Exception) {
          logger.error("Failed to print ticket to ${printerService.name}: ${e.message}", e)
          if (printerId != null || !broadcast) {
            throw e
          }
        }
      }

      if (successCount == 0) {
        throw IOException("Failed to print ticket to any configured printer.")
      }

      logger.info("Successfully sent print job to $type printer(s).")
    } catch (e: Exception) {
      logger.error("Failed to print ticket: ${e.message}", e)
      throw IOException("Failed to print ticket: ${e.message}", e)
    }
  }
}
