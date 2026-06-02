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
import pos.ambrosia.models.Message
import pos.ambrosia.models.UpsertOptionTypeRequest
import pos.ambrosia.models.UpsertVariantRequest
import pos.ambrosia.services.ProductVariantService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection

fun Application.configureProductVariants() {
    val connection: Connection = DatabaseConnection.getConnection()
    val service = ProductVariantService(connection)
    routing { route("/products/{id}") { productVariants(service) } }
}

fun Route.productVariants(service: ProductVariantService) {
    authorizePermission("products_read") {
        get("/variants") {
            val productId =
                call.parameters["id"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest, Message("Missing product ID"))
            val variants = service.getVariants(productId)
            call.respond(HttpStatusCode.OK, variants)
        }
        get("/options") {
            val productId =
                call.parameters["id"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest, Message("Missing product ID"))
            val options = service.getOptionTypes(productId)
            call.respond(HttpStatusCode.OK, options)
        }
    }
    authorizePermission("products_update") {
        post("/variants") {
            val productId =
                call.parameters["id"]
                    ?: return@post call.respond(HttpStatusCode.BadRequest, Message("Missing product ID"))
            val body = call.receive<UpsertVariantRequest>()
            val variantId =
                service.addVariant(productId, body)
                    ?: return@post call.respond(HttpStatusCode.BadRequest, Message("Invalid variant data"))
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to variantId, "message" to "Variant created successfully"),
            )
        }
        put("/variants/{variantId}") {
            val variantId =
                call.parameters["variantId"]
                    ?: return@put call.respond(HttpStatusCode.BadRequest, Message("Missing variant ID"))
            val body = call.receive<UpsertVariantRequest>()
            val ok = service.updateVariant(variantId, body)
            if (!ok) return@put call.respond(HttpStatusCode.NotFound, Message("Variant not found or invalid data"))
            call.respond(
                HttpStatusCode.OK,
                mapOf("id" to variantId, "message" to "Variant updated successfully"),
            )
        }
        delete("/variants/{variantId}") {
            val variantId =
                call.parameters["variantId"]
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, Message("Missing variant ID"))
            service.deleteVariant(variantId)
            call.respond(HttpStatusCode.NoContent)
        }
        post("/options") {
            val productId =
                call.parameters["id"]
                    ?: return@post call.respond(HttpStatusCode.BadRequest, Message("Missing product ID"))
            val body = call.receive<UpsertOptionTypeRequest>()
            val optionTypeId = service.addOptionType(productId, body)
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to optionTypeId, "message" to "Option type created successfully"),
            )
        }
        put("/options/{optionTypeId}") {
            val optionTypeId =
                call.parameters["optionTypeId"]
                    ?: return@put call.respond(HttpStatusCode.BadRequest, Message("Missing option type ID"))
            val body = call.receive<UpsertOptionTypeRequest>()
            val ok = service.updateOptionType(optionTypeId, body)
            if (!ok) return@put call.respond(HttpStatusCode.NotFound, Message("Option type not found"))
            call.respond(
                HttpStatusCode.OK,
                mapOf("id" to optionTypeId, "message" to "Option type updated successfully"),
            )
        }
        delete("/options/{optionTypeId}") {
            val optionTypeId =
                call.parameters["optionTypeId"]
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, Message("Missing option type ID"))
            service.deleteOptionType(optionTypeId)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
