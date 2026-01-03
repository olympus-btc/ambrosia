package pos.ambrosia.api

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.models.PrintRequest
import pos.ambrosia.models.SetPrinterRequest
import pos.ambrosia.services.ConfigService
import pos.ambrosia.services.PrintService
import pos.ambrosia.services.TicketTemplateService

fun Application.configurePrinters() {
  val connection = DatabaseConnection.getConnection()
  val ticketTemplateService = TicketTemplateService(connection)
  val printService = PrintService(ticketTemplateService)
  val configService = ConfigService(connection)
  routing { route("/printers") { printers(printService, configService) } }
}

fun Route.printers(printService: PrintService, configService: ConfigService) {
  authenticate("auth-jwt") {
    get { call.respond(printService.getAvailablePrinters()) }
    post("/set") {
      val request = call.receive<SetPrinterRequest>()

      printService.setPrinter(request.printerType, request.printerName)
      call.respondText(
              "Printer ${request.printerName} set for ${request.printerType}",
              status = HttpStatusCode.OK
      )
    }
    post("/print") {
      val request = call.receive<PrintRequest>()

      try {
        val config = configService.getConfig()
        printService.printTicket(
            request.ticketData,
            request.templateName,
            request.printerType,
            config)
        call.respondText("Print job sent", status = HttpStatusCode.OK)
      } catch (e: Exception) {
        throw pos.ambrosia.utils.PrintTicketException(e.message ?: "An unknown error occurred during printing.")
      }
    }
  }
}
