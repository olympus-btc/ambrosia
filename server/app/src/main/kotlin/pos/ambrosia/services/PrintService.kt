package pos.ambrosia.services

import com.github.anastaciocintra.escpos.EscPos
import com.github.anastaciocintra.output.PrinterOutputStream
import pos.ambrosia.datadir
import pos.ambrosia.logger
import pos.ambrosia.models.Config
import pos.ambrosia.models.PrintRequest
import pos.ambrosia.models.PrintableTicketType
import pos.ambrosia.models.PrinterType
import pos.ambrosia.models.TicketTemplate
import java.io.IOException
import java.nio.file.Paths

class PrintService(
    private val ticketTemplateService: TicketTemplateService,
    private val printerConfigService: PrinterConfigService,
    private val logoLoader: TicketLogoLoader = TicketLogoLoader(Paths.get(datadir.toString(), "uploads")),
) {
    fun getAvailablePrinters(): Array<String> {
        val printerNames = PrinterOutputStream.getListPrintServicesNames()
        logger.info("Found ${printerNames.size} available printers: ${printerNames.joinToString(", ")}")
        return printerNames
    }

    fun setPrinter(
        type: PrinterType,
        printerName: String,
    ): String? {
        logger.info("Setting default printer '$printerName' for $type")
        val printService = PrinterOutputStream.getPrintServiceByName(printerName)
        if (printService == null) {
            logger.error("Printer '$printerName' not found on this system.")
        }
        return printerConfigService.upsertDefaultByTypeName(type, printerName)
    }

    fun printTicket(
        printRequest: PrintRequest,
        businessConfig: Config?,
    ) {
        val ticketTemplate = resolveTemplate(printRequest)
        if (ticketTemplate == null) {
            logger.warn("No template configured for ${printRequest.ticketType}, skipping print job.")
            return
        }
        val printableTicket = toPrintableTicket(printRequest)

        val printerConfigs =
            when {
                printRequest.printerId != null -> {
                    val configById = printerConfigService.getPrinterConfigById(printRequest.printerId)
                    if (configById == null) {
                        throw IOException("Printer configuration not found for id '${printRequest.printerId}'.")
                    }
                    listOf(configById)
                }

                printRequest.broadcast -> {
                    printerConfigService.getEnabledByType(printRequest.printerType)
                }

                else -> {
                    val defaultConfig = printerConfigService.getDefaultByType(printRequest.printerType)
                    if (defaultConfig == null) {
                        throw IOException("Default printer for type ${printRequest.printerType} not configured.")
                    }
                    listOf(defaultConfig)
                }
            }

        if (printerConfigs.isEmpty()) {
            throw IOException("No printers configured for type ${printRequest.printerType}.")
        }

        val resolvedConfigs =
            printerConfigs.mapNotNull { printerConfig ->
                val printerService = PrinterOutputStream.getPrintServiceByName(printerConfig.printerName)
                if (printerService == null) {
                    logger.error("Printer '${printerConfig.printerName}' not found on this system.")
                    null
                } else {
                    printerConfig to printerService
                }
            }

        if (resolvedConfigs.isEmpty()) {
            throw IOException("No configured printers found on this system for type ${printRequest.printerType}.")
        }

        var successCount = 0

        resolvedConfigs.forEach { (_, printerService) ->
            try {
                val printerOutputStream = PrinterOutputStream(printerService)
                val escpos = EscPos(printerOutputStream)
                escpos.setCharsetName(TicketFactory.DEFAULT_CHARSET)
                val ticketFactory = TicketFactory(ticketTemplate, logoLoader = logoLoader)
                ticketFactory.build(escpos, printableTicket, businessConfig)
                escpos.feed(TicketFactory.DEFAULT_FEED_LINES).cut(EscPos.CutMode.FULL)
                escpos.close()
                successCount += 1
            } catch (printException: Exception) {
                logger.error("Failed to print ticket to ${printerService.name}: ${printException.message}", printException)
                if (printRequest.printerId != null || !printRequest.broadcast) {
                    throw printException
                }
            }
        }

        if (successCount == 0) {
            throw IOException("Failed to print ticket to any configured printer.")
        }

        logger.info("Successfully sent print job to ${printRequest.printerType} printer(s).")
    }

    private fun resolveTemplate(printRequest: PrintRequest): TicketTemplate? {
        val forcedTemplateName =
            printRequest.templateName?.takeIf { templateName ->
                printRequest.forceTemplateName &&
                    templateName.isNotBlank()
            }
        if (forcedTemplateName == null) {
            return ticketTemplateService.getDefaultTemplate(printRequest.ticketType)
        }
        return ticketTemplateService.getTemplateByName(forcedTemplateName)
            ?: throw IOException("Template '$forcedTemplateName' not found.")
    }

    private fun toPrintableTicket(printRequest: PrintRequest): PrintableTicket =
        when (printRequest.ticketType) {
            PrintableTicketType.RECEIPT -> {
                PrintableTicket.SaleReceipt(
                    requireNotNull(printRequest.ticketData) { "ticketData is required to print a receipt." },
                )
            }

            PrintableTicketType.SHIFT_CLOSE -> {
                PrintableTicket.ShiftReport(
                    requireNotNull(printRequest.shiftReport) { "shiftReport is required to print a shift close report." },
                )
            }
        }
}
