package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.logger
import pos.ambrosia.models.Shift
import pos.ambrosia.services.ShiftService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection

fun Application.configureShifts() {
    val connection: Connection = DatabaseConnection.getConnection()
    val shiftService = ShiftService(connection)
    routing { route("/shifts") { shifts(shiftService) } }
}

fun Route.shifts(shiftService: ShiftService) {
    get("") {
        val shifts = shiftService.getShifts()
        if (shifts.isEmpty()) {
            call.respond(HttpStatusCode.NoContent, "No shifts found")
            return@get
        }
        call.respond(HttpStatusCode.OK, shifts)
    }
    authorizePermission("shifts_read") {
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
    authorizePermission("shifts_create") {
        post("") {
            val shift = call.receive<Shift>()
            val createdShift = shiftService.addShift(shift)
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to createdShift, "message" to "Shift added successfully"),
            )
        }
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

            call.respond(HttpStatusCode.OK, mapOf("id" to id, "message" to "Shift deleted successfully"))
        }
    }
}
