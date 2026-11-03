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
import pos.ambrosia.models.FreelanceClientUpsert
import pos.ambrosia.models.FreelanceProjectUpsert
import pos.ambrosia.services.ClientService
import pos.ambrosia.services.ProjectService
import pos.ambrosia.utils.authorizePermission

fun Application.configureClients() {
    val clientService = ClientService()
    val projectService = ProjectService()
    routing { route("/freelance/clients") { clients(clientService, projectService) } }
}

fun Route.clients(
    clientService: ClientService,
    projectService: ProjectService,
) {
    authorizePermission("clients_read") {
        get("") {
            val clients = clientService.getClients()
            if (clients.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No clients found")
                return@get
            }
            call.respond(HttpStatusCode.OK, clients)
        }

        get("/{id}") {
            val clientId =
                call.parameters["id"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
            val client =
                clientService.getClientById(clientId)
                    ?: return@get call.respond(HttpStatusCode.NotFound, "Client not found")
            call.respond(HttpStatusCode.OK, client)
        }

        get("/{id}/projects") {
            val clientId =
                call.parameters["id"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
            val projects =
                projectService.getProjectsByClientId(clientId)
                    ?: return@get call.respond(HttpStatusCode.NotFound, "Client not found")
            if (projects.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No projects found")
                return@get
            }
            call.respond(HttpStatusCode.OK, projects)
        }
    }

    authorizePermission("clients_create") {
        post("") {
            val clientRequest = call.receive<FreelanceClientUpsert>()
            val createdClientId = clientService.addClient(clientRequest)
            if (createdClientId == null) {
                call.respond(HttpStatusCode.BadRequest, "Invalid client data")
                return@post
            }
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to createdClientId, "message" to "Client added successfully"),
            )
        }
    }

    authorizePermission("projects_create") {
        post("/{id}/projects") {
            val clientId =
                call.parameters["id"]
                    ?: return@post call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
            val projectRequest = call.receive<FreelanceProjectUpsert>()
            val createdProjectId = projectService.addProject(clientId, projectRequest)
            if (createdProjectId == null) {
                call.respond(HttpStatusCode.BadRequest, "Invalid project data")
                return@post
            }
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to createdProjectId, "message" to "Project added successfully"),
            )
        }
    }

    authorizePermission("clients_update") {
        put("/{id}") {
            val clientId =
                call.parameters["id"]
                    ?: return@put call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
            val clientRequest = call.receive<FreelanceClientUpsert>()
            val clientWasUpdated = clientService.updateClient(clientId, clientRequest)
            if (!clientWasUpdated) {
                call.respond(HttpStatusCode.NotFound, "Client with ID: $clientId not found or invalid")
                return@put
            }
            call.respond(HttpStatusCode.OK, mapOf("id" to clientId, "message" to "Client updated successfully"))
        }
    }

    authorizePermission("clients_delete") {
        delete("/{id}") {
            val clientId =
                call.parameters["id"]
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
            val clientWasDeleted = clientService.deleteClient(clientId)
            if (!clientWasDeleted) {
                call.respond(HttpStatusCode.NotFound, "Client not found")
                return@delete
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
