package pos.ambrosia.api

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import pos.ambrosia.models.TicketTemplate
import pos.ambrosia.models.TicketTemplateRequest
import pos.ambrosia.services.TicketTemplateService
import pos.ambrosia.db.DatabaseConnection

fun Application.configureTicketTemplates() {
    val connection = DatabaseConnection.getConnection()
    val ticketTemplateService = TicketTemplateService(connection)
    routing { route("/templates") { templatesAPI(ticketTemplateService) }}
}

fun Route.templatesAPI(ticketTemplateService: TicketTemplateService) {
    authenticate("auth-jwt") {
        post {
            val templateRequest = call.receive<TicketTemplateRequest>()
            val templateId = ticketTemplateService.addTemplate(templateRequest)
            if (templateId != null) {
                call.respond(HttpStatusCode.Created, mapOf("id" to templateId))
            } else {
                call.respond(HttpStatusCode.Conflict, mapOf("error" to "Template name already exists"))
            }
        }

        get {
            val templates = ticketTemplateService.getTemplates()
            call.respond(templates)
        }

        get("/{id}") {
            val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
            val template = ticketTemplateService.getTemplateById(id)
            if (template != null) {
                call.respond(template)
            } else {
                call.respond(HttpStatusCode.NotFound)
            }
        }

        put("/{id}") {
            val id = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest)
            val templateRequest = call.receive<TicketTemplateRequest>()
            val success = ticketTemplateService.updateTemplate(id, templateRequest)
            if (success) {
                call.respond(HttpStatusCode.OK)
            } else {
                // Assuming failure could be due to not found or name conflict
                call.respond(HttpStatusCode.Conflict, mapOf("error" to "Failed to update template. It might not exist or the name is already taken."))
            }
        }

        delete("/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
            val success = ticketTemplateService.deleteTemplate(id)
            if(success) {
                call.respond(HttpStatusCode.NoContent)
            } else {
                call.respond(HttpStatusCode.NotFound)
            }
        }
    }
}