package pos.ambrosia.api

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.models.PrintRequest
import pos.ambrosia.models.PrinterConfigCreateRequest
import pos.ambrosia.models.PrinterConfigUpdateRequest
import pos.ambrosia.models.SetPrinterRequest
import pos.ambrosia.services.ConfigService
import pos.ambrosia.services.PrinterConfigService
import pos.ambrosia.services.PrinterConfigUpdateStatus
import pos.ambrosia.services.PrintService
import pos.ambrosia.services.TicketTemplateService

fun Application.configurePrinters() {
  val connection = DatabaseConnection.getConnection()
  val ticketTemplateService = TicketTemplateService(connection)
  val printerConfigService = PrinterConfigService(connection)
  val printService = PrintService(ticketTemplateService, printerConfigService)
  val configService = ConfigService(connection)
  routing { route("/printers") { printers(printService, configService, printerConfigService) } }
}

fun Route.printers(
    printService: PrintService,
    configService: ConfigService,
    printerConfigService: PrinterConfigService
) {
  authenticate("auth-jwt") {
    get("/available") { call.respond(printService.getAvailablePrinters()) }
    get("/configs") { call.respond(printerConfigService.getPrinterConfigs()) }
    post("/configs") {
      val request = call.receive<PrinterConfigCreateRequest>()
      val configId = printerConfigService.createPrinterConfig(request)
      if (configId != null) {
        call.respond(HttpStatusCode.Created, mapOf("id" to configId))
      } else {
        call.respond(
            HttpStatusCode.Conflict,
            mapOf("error" to "Printer configuration already exists")
        )
      }
    }
    put("/configs/{id}") {
      val id = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest)
      val request = call.receive<PrinterConfigUpdateRequest>()
      when (printerConfigService.updatePrinterConfig(id, request)) {
        PrinterConfigUpdateStatus.UPDATED -> call.respond(HttpStatusCode.OK)
        PrinterConfigUpdateStatus.NOT_FOUND -> call.respond(HttpStatusCode.NotFound)
        PrinterConfigUpdateStatus.CONFLICT ->
            call.respond(
                HttpStatusCode.Conflict,
                mapOf("error" to "Printer configuration already exists")
            )
      }
    }
    delete("/configs/{id}") {
      val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
      val success = printerConfigService.deletePrinterConfig(id)
      if (success) {
        call.respond(HttpStatusCode.NoContent)
      } else {
        call.respond(HttpStatusCode.NotFound)
      }
    }
    post("/configs/{id}/default") {
      val id = call.parameters["id"] ?: return@post call.respond(HttpStatusCode.BadRequest)
      val success = printerConfigService.setDefault(id)
      if (success) {
        call.respond(HttpStatusCode.OK)
      } else {
        call.respond(HttpStatusCode.NotFound)
      }
    }
    post("/set") {
      val request = call.receive<SetPrinterRequest>()

      val configId = printService.setPrinter(request.printerType, request.printerName)
      if (configId == null) {
        call.respond(
            HttpStatusCode.Conflict,
            mapOf("error" to "Failed to set default printer")
        )
      } else {
        call.respondText(
            "Printer ${request.printerName} set for ${request.printerType}",
            status = HttpStatusCode.OK
        )
      }
    }
    post("/print") {
      val request = call.receive<PrintRequest>()

      try {
        val config = configService.getConfig()
        printService.printTicket(
            request.ticketData,
            request.templateName,
            request.printerType,
            config,
            request.printerId,
            request.broadcast,
            request.forceTemplateName)
        call.respondText("Print job sent", status = HttpStatusCode.OK)
      } catch (e: Exception) {
        throw pos.ambrosia.utils.PrintTicketException(e.message ?: "An unknown error occurred during printing.")
      }
    }
  }
}
