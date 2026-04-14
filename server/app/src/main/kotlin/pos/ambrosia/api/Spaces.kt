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
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.logger
import pos.ambrosia.models.Space
import pos.ambrosia.services.SpaceService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection

fun Application.configureSpaces() {
    val connection: Connection = DatabaseConnection.getConnection()
    val spaceService = SpaceService(connection)
    routing { route("/spaces") { spaces(spaceService) } }
}

fun Route.spaces(spaceService: SpaceService) {
    authorizePermission("spaces_read") {
        get("") {
            val spaces = spaceService.getSpaces()
            if (spaces.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No spaces found")
                return@get
            }
            call.respond(HttpStatusCode.OK, spaces)
        }
        get("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@get
            }

            val space = spaceService.getSpaceById(id)
            if (space == null) {
                call.respond(HttpStatusCode.NotFound, "Space not found")
                return@get
            }

            call.respond(HttpStatusCode.OK, space)
        }
    }
    authorizePermission("spaces_create") {
        post("") {
            val space = call.receive<Space>()
            val createdId = spaceService.addSpace(space)
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to createdId, "message" to "Space added successfully"),
            )
        }
    }
    authorizePermission("spaces_update") {
        put("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@put
            }

            val updatedSpace = call.receive<Space>()
            val isUpdated = spaceService.updateSpace(updatedSpace.copy(id = id))
            logger.info(isUpdated.toString())

            if (!isUpdated) {
                call.respond(HttpStatusCode.NotFound, "Space with ID: $id not found")
                return@put
            }

            call.respond(HttpStatusCode.OK, mapOf("id" to id, "message" to "Space updated successfully"))
        }
    }

    authorizePermission("spaces_delete") {
        delete("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@delete
            }

            val isDeleted = spaceService.deleteSpace(id)
            if (!isDeleted) {
                call.respond(HttpStatusCode.BadRequest, "Space not found")
                return@delete
            }

            call.respond(HttpStatusCode.NoContent)
        }
    }
}
