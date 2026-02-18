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
import pos.ambrosia.models.Supplier
import pos.ambrosia.services.SupplierService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection

fun Application.configureSuppliers() {
    val connection: Connection = DatabaseConnection.getConnection()
    val supplierService = SupplierService(connection)
    routing { route("/suppliers") { suppliers(supplierService) } }
}

fun Route.suppliers(supplierService: SupplierService) {
    authorizePermission("suppliers_read") {
        get("") {
            val suppliers = supplierService.getSuppliers()
            if (suppliers.isEmpty()) {
                call.respond(HttpStatusCode.NoContent, "No suppliers found")
                return@get
            }
            call.respond(HttpStatusCode.OK, suppliers)
        }
        get("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@get
            }

            val supplier = supplierService.getSupplierById(id)
            if (supplier == null) {
                call.respond(HttpStatusCode.NotFound, "Supplier not found")
                return@get
            }

            call.respond(HttpStatusCode.OK, supplier)
        }
    }
    authorizePermission("suppliers_create") {
        post("") {
            val supplier = call.receive<Supplier>()
            val createdId = supplierService.addSupplier(supplier)
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to createdId, "message" to "Supplier added successfully"),
            )
        }
    }
    authorizePermission("suppliers_update") {
        put("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@put
            }

            val updatedSupplier = call.receive<Supplier>()
            val isUpdated = supplierService.updateSupplier(updatedSupplier.copy(id = id))
            logger.info(isUpdated.toString())

            if (!isUpdated) {
                call.respond(HttpStatusCode.NotFound, "Supplier with ID: $id not found")
                return@put
            }

            call.respond(
                HttpStatusCode.OK,
                mapOf("id" to id, "message" to "Supplier updated successfully"),
            )
        }
    }
    authorizePermission("suppliers_delete") {
        delete("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@delete
            }

            val isDeleted = supplierService.deleteSupplier(id)
            if (!isDeleted) {
                call.respond(HttpStatusCode.NotFound, "Supplier not found")
                return@delete
            }

            call.respond(
                HttpStatusCode.OK,
                mapOf("id" to id, "message" to "Supplier deleted successfully"),
            )
        }
    }
}
