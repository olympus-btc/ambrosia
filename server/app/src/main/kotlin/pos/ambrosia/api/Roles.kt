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
import pos.ambrosia.models.Role
import pos.ambrosia.models.RolePermissionsUpdateRequest
import pos.ambrosia.models.RolePermissionsUpdateResult
import pos.ambrosia.services.PermissionsService
import pos.ambrosia.services.RolesService
import pos.ambrosia.utils.authorizePermission

fun Application.configureRoles() {
  val connection: Connection = DatabaseConnection.getConnection()
  val roleService = RolesService(environment, connection)
  val permissionsService = PermissionsService(environment, connection)
  routing { route("/roles") { roles(roleService, permissionsService) } }
}

fun Route.roles(roleService: RolesService, permissionsService: PermissionsService) {
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
        call.respond(HttpStatusCode.NoContent, "No roles found")
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
      if (perms.isEmpty()) {
        call.respond(HttpStatusCode.NoContent)
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
        mapOf("id" to id, "message" to "Role added successfully")
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
      // Evitar colisión de nombre con otro rol
      val existing = roleService.getRoles()
      val nameTaken = existing.any { it.role.equals(updatedRole.role, ignoreCase = true) && it.id != id }
      if (nameTaken) {
        call.respond(HttpStatusCode.Conflict, "Role name already exists")
        return@put
      }
      val isUpdated = roleService.updateRole(id, updatedRole)
      logger.info(isUpdated.toString())

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

      call.respond(
        HttpStatusCode.NoContent,
        mapOf("id" to id, "message" to "Role deleted successfully")
      )
    }
  }
}
