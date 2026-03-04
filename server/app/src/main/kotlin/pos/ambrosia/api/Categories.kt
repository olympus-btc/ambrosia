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
import pos.ambrosia.models.CategoryItem
import pos.ambrosia.models.CategoryUpsert
import pos.ambrosia.services.CategoryService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection

fun Application.configureCategories() {
    val connection: Connection = DatabaseConnection.getConnection()
    val service = CategoryService(connection)
    routing { route("/categories") { categories(service) } }
}

fun Route.categories(service: CategoryService) {
    authorizePermission("categories_read") {
        get("") {
            val type = call.request.queryParameters["type"]
            if (type.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed type")
                return@get
            }
            val items = service.getCategories(type)
            if (items == null) {
                call.respond(HttpStatusCode.OK, "No category type found")
                return@get
            }
            if (items.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No categories added yet")
                return@get
            }
            call.respond(HttpStatusCode.OK, items)
        }

        get("/{id}") {
            val id = call.parameters["id"]
            val type = call.request.queryParameters["type"]
            if (id.isNullOrBlank() || type.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID/type")
                return@get
            }
            val item = service.getCategoryById(id, type)
            if (item == null) {
                call.respond(HttpStatusCode.NotFound, "Category not found")
                return@get
            }
            call.respond(HttpStatusCode.OK, item)
        }
    }
    authorizePermission("categories_create") {
        post("") {
            val body = call.receive<CategoryUpsert>()
            val type = body.type
            if (type.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed type")
                return@post
            }
            val id = service.addCategory(type, CategoryItem(name = body.name))
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Failed to create category")
                return@post
            }
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to id, "message" to "Category added successfully"),
            )
        }
    }
    authorizePermission("categories_update") {
        put("/{id}") {
            val id = call.parameters["id"]
            val body = call.receive<CategoryUpsert>()
            val type = body.type
            if (id.isNullOrBlank() || type.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID/type")
                return@put
            }
            val ok = service.updateCategory(type, CategoryItem(id = id, name = body.name))
            if (!ok) {
                call.respond(HttpStatusCode.NotFound, "Category with ID: $id not found")
                return@put
            }
            call.respond(
                HttpStatusCode.OK,
                mapOf("id" to id, "message" to "Category updated successfully"),
            )
        }
    }
    authorizePermission("categories_delete") {
        delete("/{id}") {
            val id = call.parameters["id"]
            val type = call.request.queryParameters["type"]
            if (id.isNullOrBlank() || type.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID/type")
                return@delete
            }
            val ok = service.deleteCategory(id, type)
            if (!ok) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    "Cannot delete category - it may be in use or not found",
                )
                return@delete
            }
            call.respond(
                HttpStatusCode.OK,
                mapOf("id" to id, "message" to "Category deleted successfully"),
            )
        }
    }
}
