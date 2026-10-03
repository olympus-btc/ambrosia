package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.FreelanceProjectUpsert
import pos.ambrosia.services.ProjectService
import pos.ambrosia.utils.authorizePermission

fun Application.configureProjects() {
    val projectService = ProjectService()
    routing { route("/freelance/projects") { projects(projectService) } }
}

fun Route.projects(projectService: ProjectService) {
    authorizePermission("projects_read") {
        get("") {
            val projects = projectService.getProjects()
            if (projects.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No projects found")
                return@get
            }
            call.respond(HttpStatusCode.OK, projects)
        }

        get("/{id}") {
            val projectId =
                call.parameters["id"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
            val project =
                projectService.getProjectById(projectId)
                    ?: return@get call.respond(HttpStatusCode.NotFound, "Project not found")
            call.respond(HttpStatusCode.OK, project)
        }
    }

    authorizePermission("projects_update") {
        put("/{id}") {
            val projectId =
                call.parameters["id"]
                    ?: return@put call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
            val projectRequest = call.receive<FreelanceProjectUpsert>()
            val projectWasUpdated = projectService.updateProject(projectId, projectRequest)
            if (!projectWasUpdated) {
                call.respond(HttpStatusCode.NotFound, "Project with ID: $projectId not found or invalid")
                return@put
            }
            call.respond(HttpStatusCode.OK, mapOf("id" to projectId, "message" to "Project updated successfully"))
        }
    }

    authorizePermission("projects_delete") {
        delete("/{id}") {
            val projectId =
                call.parameters["id"]
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
            val projectWasDeleted = projectService.deleteProject(projectId)
            if (!projectWasDeleted) {
                call.respond(HttpStatusCode.NotFound, "Project not found")
                return@delete
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
