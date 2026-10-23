package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.logger
import pos.ambrosia.models.CloseShiftRequest
import pos.ambrosia.models.Message
import pos.ambrosia.models.PrintShiftReportRequest
import pos.ambrosia.models.Shift
import pos.ambrosia.services.CashDrawerService
import pos.ambrosia.services.CashDrawerTrigger
import pos.ambrosia.services.ConfigService
import pos.ambrosia.services.PrintService
import pos.ambrosia.services.PrinterConfigService
import pos.ambrosia.services.ShiftService
import pos.ambrosia.services.TicketTemplateService
import pos.ambrosia.utils.PrintTicketException
import pos.ambrosia.utils.authorizeAdminPermission
import pos.ambrosia.utils.authorizePermission
import java.time.LocalDate

private fun parseShiftsReportDateQueryParam(
    value: String?,
    name: String,
): String? {
    if (value.isNullOrBlank()) return null
    return try {
        LocalDate.parse(value).toString()
    } catch (_: Exception) {
        throw IllegalArgumentException("Invalid $name: $value. Expected format YYYY-MM-DD")
    }
}

fun Application.configureShifts() {
    val shiftService = ShiftService()
    val cashDrawerService = CashDrawerService()
    val printService = PrintService(TicketTemplateService(), PrinterConfigService())
    val configService = ConfigService()
    routing { route("/shifts") { shifts(shiftService, cashDrawerService, printService, configService) } }
}

fun Route.shifts(
    shiftService: ShiftService,
    cashDrawerService: CashDrawerService,
    printService: PrintService,
    configService: ConfigService,
) {
    authorizePermission("shifts_read") {
        get("") {
            val shifts = shiftService.getShifts()
            if (shifts.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No shifts found")
                return@get
            }
            call.respond(HttpStatusCode.OK, shifts)
        }

        get("/open") {
            val userId = call.request.queryParameters["user_id"]
            val openShift = shiftService.getOpenShift(userId)
            if (openShift == null) {
                call.respond(HttpStatusCode.NoContent)
                return@get
            }
            call.respond(HttpStatusCode.OK, openShift)
        }

        get("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@get
            }

            val shift = shiftService.getShiftById(id)
            if (shift == null) {
                call.respond(HttpStatusCode.NotFound, "Shift not found")
                return@get
            }

            call.respond(HttpStatusCode.OK, shift)
        }
    }
    authorizeAdminPermission("shifts_report_read") {
        get("/report") {
            val requestedPeriod = call.request.queryParameters["period"]?.takeIf { it.isNotBlank() }

            val requestedStartDate: String?
            val requestedEndDate: String?
            try {
                requestedStartDate = parseShiftsReportDateQueryParam(call.request.queryParameters["startDate"], "startDate")
                requestedEndDate = parseShiftsReportDateQueryParam(call.request.queryParameters["endDate"], "endDate")
                if (requestedStartDate != null && requestedEndDate == null) {
                    throw IllegalArgumentException("endDate is required when startDate is provided")
                }
                if (requestedEndDate != null && requestedStartDate == null) {
                    throw IllegalArgumentException("startDate is required when endDate is provided")
                }
                if (requestedStartDate != null && requestedEndDate != null && requestedStartDate > requestedEndDate) {
                    throw IllegalArgumentException("startDate cannot be after endDate")
                }
            } catch (invalidQueryParameters: IllegalArgumentException) {
                call.respond(HttpStatusCode.BadRequest, Message(invalidQueryParameters.message ?: "Invalid query parameters"))
                return@get
            }

            val shiftsReport =
                try {
                    shiftService.getShiftsReport(requestedPeriod, requestedStartDate, requestedEndDate)
                } catch (invalidQueryParameters: IllegalArgumentException) {
                    call.respond(HttpStatusCode.BadRequest, Message(invalidQueryParameters.message ?: "Invalid query parameters"))
                    return@get
                }

            call.respond(HttpStatusCode.OK, shiftsReport)
        }

        get("/{id}/breakdown") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@get
            }

            val breakdown = shiftService.getShiftBreakdown(id)
            if (breakdown == null) {
                call.respond(HttpStatusCode.NotFound, "Shift not found")
                return@get
            }

            call.respond(HttpStatusCode.OK, breakdown)
        }
    }
    authorizePermission("shifts_create") {
        post("") {
            val open = shiftService.getOpenShift(null)
            if (open != null) {
                call.respond(HttpStatusCode.Conflict, "There is already an open shift")
                return@post
            }

            val shift = call.receive<Shift>()
            val createdShift = shiftService.addShift(shift)
            if (createdShift == null) {
                call.respond(HttpStatusCode.BadRequest, "Failed to add shift")
                return@post
            }
            cashDrawerService.openForTrigger(CashDrawerTrigger.SHIFT_OPEN)
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to createdShift, "message" to "Shift added successfully"),
            )
        }
        authorizePermission("shifts_update") {
            put("/{id}") {
                val id = call.parameters["id"]
                if (id == null) {
                    call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                    return@put
                }

                val updatedShift = call.receive<Shift>()
                val isUpdated = shiftService.updateShift(updatedShift.copy(id = id))
                logger.info(isUpdated.toString())

                if (!isUpdated) {
                    call.respond(HttpStatusCode.NotFound, "Shift with ID: $id not found")
                    return@put
                }

                call.respond(HttpStatusCode.OK, mapOf("id" to id, "message" to "Shift updated successfully"))
            }
        }

        post("/{id}/cash-drawer") {
            val closingShiftId = call.parameters["id"]
            if (closingShiftId == null || shiftService.getOpenShift(null)?.id != closingShiftId) {
                call.respond(HttpStatusCode.NotFound, "Open shift not found")
                return@post
            }
            cashDrawerService.openForTrigger(CashDrawerTrigger.SHIFT_CLOSE)
            call.respond(HttpStatusCode.NoContent)
        }

        post("/{id}/print-report") {
            val shiftId = call.parameters["id"]
            if (shiftId == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@post
            }

            val printShiftReportRequest = call.receive<PrintShiftReportRequest>()
            val shiftReport = shiftService.getShiftReportPrintData(shiftId, printShiftReportRequest.labels)
            if (shiftReport == null) {
                call.respond(HttpStatusCode.NotFound, "Shift not found")
                return@post
            }

            try {
                printService.printShiftReport(shiftReport, configService.getConfig())
            } catch (printError: Exception) {
                throw PrintTicketException(printError.message ?: "The shift report could not be printed.")
            }
            call.respond(HttpStatusCode.OK, Message("Shift report sent to the printer"))
        }

        post("/{id}/close") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@post
            }

            val request =
                try {
                    call.receive<CloseShiftRequest>()
                } catch (_: Exception) {
                    CloseShiftRequest()
                }
            val closed = shiftService.closeShift(id, request.finalAmount, request.difference)
            if (!closed) {
                call.respond(HttpStatusCode.NotFound, "Shift not found or already closed")
                return@post
            }
            call.respond(HttpStatusCode.OK, mapOf("id" to id, "message" to "Shift closed successfully"))
        }
    }
    authorizePermission("shifts_delete") {
        delete("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@delete
            }

            val isDeleted = shiftService.deleteShift(id)
            if (!isDeleted) {
                call.respond(HttpStatusCode.NotFound, "Shift not found")
                return@delete
            }

            call.respond(HttpStatusCode.NoContent)
        }
    }
}
