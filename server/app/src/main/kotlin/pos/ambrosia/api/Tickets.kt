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
import pos.ambrosia.models.Ticket
import pos.ambrosia.services.TicketService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection

fun Application.configureTickets() {
    val connection: Connection = DatabaseConnection.getConnection()
    val ticketService = TicketService(connection)
    routing { route("/tickets") { tickets(ticketService) } }
}

fun Route.tickets(ticketService: TicketService) {
    authorizePermission("tickets_read") {
        get("") {
            val tickets = ticketService.getTickets()
            if (tickets.isEmpty()) {
                call.respond(HttpStatusCode.NoContent, "No tickets found")
                return@get
            }
            call.respond(HttpStatusCode.OK, tickets)
        }
        get("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@get
            }

            val ticket = ticketService.getTicketById(id)
            if (ticket == null) {
                call.respond(HttpStatusCode.NotFound, "Ticket not found")
                return@get
            }

            call.respond(HttpStatusCode.OK, ticket)
        }
    }
    authorizePermission("tickets_create") {
        post("") {
            val ticket = call.receive<Ticket>()
            val generatedId = ticketService.addTicket(ticket)
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to generatedId, "message" to "Ticket added successfully"),
            )
        }
    }
    authorizePermission("tickets_update") {
        put("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@put
            }

            val updatedTicket = call.receive<Ticket>()
            val isUpdated = ticketService.updateTicket(updatedTicket.copy(id = id))
            logger.info(isUpdated.toString())

            if (!isUpdated) {
                call.respond(HttpStatusCode.NotFound, "Ticket with ID: $id not found")
                return@put
            }

            call.respond(HttpStatusCode.OK, mapOf("id" to id, "message" to "Ticket updated successfully"))
        }
    }
    authorizePermission("tickets_delete") {
        delete("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@delete
            }

            val isDeleted = ticketService.deleteTicket(id)
            if (!isDeleted) {
                call.respond(HttpStatusCode.NotFound, "Ticket not found")
                return@delete
            }

            call.respond(HttpStatusCode.OK, mapOf("id" to id, "message" to "Ticket deleted successfully"))
        }
    }
}
