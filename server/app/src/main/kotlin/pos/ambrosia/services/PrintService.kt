package pos.ambrosia.services

import com.github.anastaciocintra.escpos.EscPos
import com.github.anastaciocintra.output.PrinterOutputStream
import java.io.IOException
import pos.ambrosia.models.TicketData
import pos.ambrosia.models.TicketTemplate
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
      templateName: String?,
      type: PrinterType,
      config: Config?,
      printerId: String?,
      broadcast: Boolean,
      forceTemplateName: Boolean
  ) {
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

    val resolvedConfigs =
        configs.mapNotNull { configItem ->
          val printerService = PrinterOutputStream.getPrintServiceByName(configItem.printerName)
          if (printerService == null) {
            logger.error("Printer '${configItem.printerName}' not found on this system.")
            null
          } else {
            configItem to printerService
          }
        }

    if (resolvedConfigs.isEmpty()) {
      throw IOException("No configured printers found on this system for type $type.")
    }

    try {
      val templateCache = mutableMapOf<String, TicketTemplate>()
      var successCount = 0

      resolvedConfigs.forEach { (configItem, printerService) ->
        try {
          val resolvedTemplateName =
              if (forceTemplateName && !templateName.isNullOrBlank()) {
                templateName
              } else {
                configItem.templateName ?: templateName
              }
          if (resolvedTemplateName.isNullOrBlank()) {
            throw IOException("Template not configured for printer ${configItem.printerName}.")
          }
          val template =
              templateCache.getOrPut(resolvedTemplateName) {
                ticketTemplateService.getTemplateByName(resolvedTemplateName)
                    ?: throw IOException("Template '$resolvedTemplateName' not found.")
              }

          val printerOutputStream = PrinterOutputStream(printerService)
          val escpos = EscPos(printerOutputStream)
          val ticketFactory = TicketFactory(template)
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
