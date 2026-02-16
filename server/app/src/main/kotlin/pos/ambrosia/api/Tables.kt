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
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.logger
import pos.ambrosia.models.Table
import pos.ambrosia.services.TableService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection

fun Application.configureTables() {
    val connection: Connection = DatabaseConnection.getConnection()
    val tableService = TableService(connection)
    routing { route("/tables") { tables(tableService) } }
}

fun Route.tables(tableService: TableService) {
    authorizePermission("tables_read") {
        get("") {
            val tables = tableService.getTables()
            if (tables.isEmpty()) {
                call.respond(HttpStatusCode.NoContent, "No tables found")
                return@get
            }
            call.respond(HttpStatusCode.OK, tables)
        }
        get("/by-space/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@get
            }

            val tables = tableService.getTablesBySpace(spaceId = id)
            if (tables.isEmpty()) {
                call.respond(HttpStatusCode.NoContent, "No tables found for space ID: $id")
                return@get
            }
            call.respond(HttpStatusCode.OK, tables)
        }
        get("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@get
            }

            val table = tableService.getTableById(id)
            if (table == null) {
                call.respond(HttpStatusCode.NotFound, "Table not found")
                return@get
            }

            call.respond(HttpStatusCode.OK, table)
        }
    }
    authorizePermission("tables_create") {
        post("") {
            val table = call.receive<Table>()
            val createdId = tableService.addTable(table)
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to createdId, "message" to "Table added successfully"),
            )
        }
    }
    authorizePermission("tables_update") {
        put("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@put
            }

            val updatedTable = call.receive<Table>()
            val isUpdated = tableService.updateTable(updatedTable.copy(id = id))
            logger.info(isUpdated.toString())

            if (!isUpdated) {
                call.respond(HttpStatusCode.NotFound, "Table with ID: $id not found")
                return@put
            }

            call.respond(HttpStatusCode.OK, mapOf("id" to id, "message" to "Table updated successfully"))
        }
    }
    authorizePermission("tables_delete") {
        delete("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@delete
            }

            val isDeleted = tableService.deleteTable(id)
            if (!isDeleted) {
                call.respond(HttpStatusCode.NotFound, "Table not found")
                return@delete
            }

            call.respond(HttpStatusCode.OK, mapOf("id" to id, "message" to "Table deleted successfully"))
        }
    }
}
