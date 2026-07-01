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
import pos.ambrosia.models.Message
import pos.ambrosia.models.UpsertOptionTypeRequest
import pos.ambrosia.models.UpsertVariantRequest
import pos.ambrosia.services.ProductVariantService
import pos.ambrosia.utils.authorizePermission

fun Application.configureProductVariants() {
    val productVariantService = ProductVariantService()
    routing { route("/products/{id}") { productVariants(productVariantService) } }
}

fun Route.productVariants(productVariantService: ProductVariantService) {
    authorizePermission("products_read") {
        get("/variants") {
            val productId =
                call.parameters["id"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest, Message("Missing product ID"))
            val variants = productVariantService.getVariants(productId)
            call.respond(HttpStatusCode.OK, variants)
        }
        get("/options") {
            val productId =
                call.parameters["id"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest, Message("Missing product ID"))
            val options = productVariantService.getOptionTypes(productId)
            call.respond(HttpStatusCode.OK, options)
        }
    }
    authorizePermission("products_update") {
        post("/variants") {
            val productId =
                call.parameters["id"]
                    ?: return@post call.respond(HttpStatusCode.BadRequest, Message("Missing product ID"))
            val variantRequest = call.receive<UpsertVariantRequest>()
            val variantId =
                productVariantService.addVariant(productId, variantRequest)
                    ?: return@post call.respond(HttpStatusCode.BadRequest, Message("Invalid variant data"))
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to variantId, "message" to "Variant created successfully"),
            )
        }
        put("/variants/{variantId}") {
            val productId =
                call.parameters["id"]
                    ?: return@put call.respond(HttpStatusCode.BadRequest, Message("Missing product ID"))
            val variantId =
                call.parameters["variantId"]
                    ?: return@put call.respond(HttpStatusCode.BadRequest, Message("Missing variant ID"))
            val variantRequest = call.receive<UpsertVariantRequest>()
            val variantWasUpdated = productVariantService.updateVariant(productId, variantId, variantRequest)
            if (!variantWasUpdated) return@put call.respond(HttpStatusCode.NotFound, Message("Variant not found or invalid data"))
            call.respond(
                HttpStatusCode.OK,
                mapOf("id" to variantId, "message" to "Variant updated successfully"),
            )
        }
        delete("/variants/{variantId}") {
            val productId =
                call.parameters["id"]
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, Message("Missing product ID"))
            val variantId =
                call.parameters["variantId"]
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, Message("Missing variant ID"))
            val variantWasDeleted = productVariantService.deleteVariant(productId, variantId)
            if (!variantWasDeleted) return@delete call.respond(HttpStatusCode.NotFound, Message("Variant not found"))
            call.respond(HttpStatusCode.NoContent)
        }
        post("/options") {
            val productId =
                call.parameters["id"]
                    ?: return@post call.respond(HttpStatusCode.BadRequest, Message("Missing product ID"))
            val optionTypeRequest = call.receive<UpsertOptionTypeRequest>()
            val optionTypeId =
                productVariantService.addOptionType(productId, optionTypeRequest)
                    ?: return@post call.respond(HttpStatusCode.BadRequest, Message("Invalid option type data"))
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to optionTypeId, "message" to "Option type created successfully"),
            )
        }
        put("/options/{optionTypeId}") {
            val productId =
                call.parameters["id"]
                    ?: return@put call.respond(HttpStatusCode.BadRequest, Message("Missing product ID"))
            val optionTypeId =
                call.parameters["optionTypeId"]
                    ?: return@put call.respond(HttpStatusCode.BadRequest, Message("Missing option type ID"))
            val optionTypeRequest = call.receive<UpsertOptionTypeRequest>()
            val optionTypeWasUpdated = productVariantService.updateOptionType(productId, optionTypeId, optionTypeRequest)
            if (!optionTypeWasUpdated) return@put call.respond(HttpStatusCode.NotFound, Message("Option type not found"))
            call.respond(
                HttpStatusCode.OK,
                mapOf("id" to optionTypeId, "message" to "Option type updated successfully"),
            )
        }
        delete("/options/{optionTypeId}") {
            val productId =
                call.parameters["id"]
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, Message("Missing product ID"))
            val optionTypeId =
                call.parameters["optionTypeId"]
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, Message("Missing option type ID"))
            val optionTypeWasDeleted = productVariantService.deleteOptionType(productId, optionTypeId)
            if (!optionTypeWasDeleted) return@delete call.respond(HttpStatusCode.NotFound, Message("Option type not found"))
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
