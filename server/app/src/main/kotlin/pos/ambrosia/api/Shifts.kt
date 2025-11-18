package pos.ambrosia.api

import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.sql.Connection
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.logger
import pos.ambrosia.models.Shift
import pos.ambrosia.services.ShiftService
import pos.ambrosia.utils.authorizePermission

fun Application.configureShifts() {
  val connection: Connection = DatabaseConnection.getConnection()
  val shiftService = ShiftService(connection)
  routing { route("/shifts") { shifts(shiftService) } }
}

fun Route.shifts(shiftService: ShiftService) {
  authorizePermission("shifts_read") {
    get("") {
      val shifts = shiftService.getShifts()
      if (shifts.isEmpty()) {
        call.respond(HttpStatusCode.NoContent, "No shifts found")
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
      call.respond(
        HttpStatusCode.Created,
        mapOf("id" to createdShift, "message" to "Shift added successfully")
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

    post("/{id}/close") {
      val id = call.parameters["id"]
      if (id == null) {
        call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
        return@post
      }

      val closed = shiftService.closeShift(id)
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

      call.respond(HttpStatusCode.OK, mapOf("id" to id, "message" to "Shift deleted successfully"))
    }
  }
}
