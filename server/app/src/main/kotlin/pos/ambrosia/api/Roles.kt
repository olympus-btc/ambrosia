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
import pos.ambrosia.models.Role
import pos.ambrosia.models.RolePermissionsUpdateRequest
import pos.ambrosia.models.RolePermissionsUpdateResult
import pos.ambrosia.services.PermissionsService
import pos.ambrosia.services.RolesService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection

fun Application.configureRoles() {
    val connection: Connection = DatabaseConnection.getConnection()
    val roleService = RolesService(environment, connection)
    val permissionsService = PermissionsService(environment, connection)
    routing { route("/roles") { roles(roleService, permissionsService) } }
}

fun Route.roles(
    roleService: RolesService,
    permissionsService: PermissionsService,
) {
    get("/{id}") {
        val id = call.parameters["id"]
        if (id == null) {
            call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
            return@get
        }

        val role = roleService.getRoleById(id)
        if (role == null) {
            call.respond(HttpStatusCode.NotFound, "Role not found")
            return@get
        }

        call.respond(HttpStatusCode.OK, role)
    }
    authorizePermission("roles_read") {
        get("") {
            val roles = roleService.getRoles()
            if (roles.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No roles found")
                return@get
            }
            call.respond(HttpStatusCode.OK, roles)
        }
        get("/{id}/permissions") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@get
            }
            val perms = permissionsService.getByRole(id)
            if (perms == null) {
                call.respond(HttpStatusCode.OK, "Role not found")
                return@get
            }
            if (perms.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No permissions found for this role")
                return@get
            }
            call.respond(HttpStatusCode.OK, perms)
        }
    }
    authorizePermission("roles_create") {
        post("") {
            val user = call.receive<Role>()
            val id = roleService.addRole(user)
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to id, "message" to "Role added successfully"),
            )
        }
    }
    authorizePermission("roles_update") {
        put("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@put
            }

            val updatedRole = call.receive<Role>()
            val isUpdated = roleService.updateRole(id, updatedRole)

            if (!isUpdated) {
                call.respond(HttpStatusCode.NotFound, "Role with ID: $id not found")
                return@put
            }

            call.respond(HttpStatusCode.OK, mapOf("id" to id, "message" to "Role updated successfully"))
        }
        put("/{id}/permissions") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@put
            }

            val payload = call.receive<RolePermissionsUpdateRequest>()
            val count = permissionsService.replaceRolePermissions(id, payload.permissions.distinct())
            call.respond(HttpStatusCode.OK, RolePermissionsUpdateResult(roleId = id, assigned = count))
        }
    }
    authorizePermission("roles_delete") {
        delete("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@delete
            }

            val isDeleted = roleService.deleteRole(id)
            if (!isDeleted) {
                call.respond(HttpStatusCode.NotFound, "Role with ID: $id not found")
                return@delete
            }

            call.respond(HttpStatusCode.NoContent)
        }
    }
}
