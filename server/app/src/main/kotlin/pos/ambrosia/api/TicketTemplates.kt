package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.auth.authenticate
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.TicketTemplate
import pos.ambrosia.models.TicketTemplateRequest
import pos.ambrosia.services.TemplateDeletionStatus
import pos.ambrosia.services.TicketTemplateService
import pos.ambrosia.utils.authorizePermission

fun Application.configureTicketTemplates() {
    val ticketTemplateService = TicketTemplateService()
    routing { route("/templates") { templatesAPI(ticketTemplateService) } }
}

fun Route.templatesAPI(ticketTemplateService: TicketTemplateService) {
    authenticate("auth-jwt") {
        get {
            val templates = ticketTemplateService.getTemplates()
            call.respond(templates)
        }

        get("/{id}") {
            val templateId = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
            val ticketTemplate = ticketTemplateService.getTemplateById(templateId)
            if (ticketTemplate != null) {
                call.respond(ticketTemplate)
            } else {
                call.respond(HttpStatusCode.NotFound)
            }
        }
    }
    authorizePermission("printer_update") {
        post {
            val templateRequest = call.receive<TicketTemplateRequest>()
            val templateId = ticketTemplateService.addTemplate(templateRequest)
            if (templateId != null) {
                call.respond(HttpStatusCode.Created, mapOf("id" to templateId))
            } else {
                call.respond(HttpStatusCode.Conflict, mapOf("error" to "Template name already exists"))
            }
        }

        put("/{id}") {
            val templateId = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest)
            val templateRequest = call.receive<TicketTemplateRequest>()
            val isTemplateUpdated = ticketTemplateService.updateTemplate(templateId, templateRequest)
            if (isTemplateUpdated) {
                call.respond(HttpStatusCode.OK)
            } else {
                // Assuming failure could be due to not found or name conflict
                call.respond(
                    HttpStatusCode.Conflict,
                    mapOf("error" to "Failed to update template. It might not exist or the name is already taken."),
                )
            }
        }

        delete("/{id}") {
            val templateId = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
            when (ticketTemplateService.deleteTemplate(templateId)) {
                TemplateDeletionStatus.DELETED -> {
                    call.respond(HttpStatusCode.NoContent)
                }

                TemplateDeletionStatus.NOT_FOUND -> {
                    call.respond(HttpStatusCode.NotFound)
                }

                TemplateDeletionStatus.IS_DEFAULT -> {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        mapOf(
                            "error" to "The default template of a ticket type cannot be deleted. Set another template as default first.",
                        ),
                    )
                }
            }
        }

        post("/{id}/default") {
            val templateId = call.parameters["id"] ?: return@post call.respond(HttpStatusCode.BadRequest)
            if (ticketTemplateService.setDefaultTemplate(templateId)) {
                call.respond(HttpStatusCode.OK)
            } else {
                call.respond(HttpStatusCode.NotFound)
            }
        }
    }
}
