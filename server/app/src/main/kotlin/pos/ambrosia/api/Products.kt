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
import pos.ambrosia.models.Product
import pos.ambrosia.models.ProductStockAdjustment
import pos.ambrosia.services.ProductService
import pos.ambrosia.services.ProductVariantService
import pos.ambrosia.utils.authorizePermission

fun Application.configureProducts() {
    val productService = ProductService()
    val productVariantService = ProductVariantService()
    routing { route("/products") { products(productService, productVariantService) } }
}

fun Route.products(
    productService: ProductService,
    productVariantService: ProductVariantService,
) {
    authorizePermission("products_read") {
        get("") {
            val products = productService.getProducts()
            if (products.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No products found")
                return@get
            }
            call.respond(HttpStatusCode.OK, products)
        }
        get("/{id}") {
            val productId =
                call.parameters["id"]
                    ?: return@get call.respond(
                        HttpStatusCode.BadRequest,
                        "Missing or malformed ID",
                    )
            val product =
                productService.getProductById(productId)
                    ?: return@get call.respond(HttpStatusCode.NotFound, "Product not found")
            call.respond(HttpStatusCode.OK, product)
        }
    }
    authorizePermission("products_create") {
        post("") {
            val productRequest = call.receive<Product>()
            val createdProductId = productService.addProduct(productRequest)
            if (createdProductId == null) {
                call.respond(HttpStatusCode.BadRequest, Message("Invalid product data"))
                return@post
            }
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to createdProductId, "message" to "Product added successfully"),
            )
        }
    }
    authorizePermission("products_update") {
        put("/{id}") {
            val productId =
                call.parameters["id"]
                    ?: return@put call.respond(
                        HttpStatusCode.BadRequest,
                        "Missing or malformed ID",
                    )
            val productRequest = call.receive<Product>()
            val existingProduct =
                productService.getProductById(productId)
                    ?: return@put call.respond(HttpStatusCode.NotFound, Message("Product with ID $productId not found"))
            val productWasUpdated = productService.updateProduct(productRequest.copy(id = productId))
            if (!productWasUpdated) {
                call.respond(HttpStatusCode.BadRequest, Message("Invalid product data"))
                return@put
            }
            call.respond(
                HttpStatusCode.OK,
                mapOf("id" to existingProduct.id, "message" to "Product updated successfully"),
            )
        }
    }
    authorizePermission("orders_create") {
        post("/stock") {
            val stockAdjustments = call.receive<List<ProductStockAdjustment>>()
            if (stockAdjustments.isEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "No stock adjustments provided")
                return@post
            }
            val stockWasAdjusted = productVariantService.adjustStock(stockAdjustments)
            if (!stockWasAdjusted) {
                call.respond(HttpStatusCode.BadRequest, "Invalid or insufficient stock")
                return@post
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Stock adjusted successfully"))
        }
    }
    authorizePermission("products_delete") {
        delete("/{id}") {
            val productId =
                call.parameters["id"]
                    ?: return@delete call.respond(
                        HttpStatusCode.BadRequest,
                        "Missing or malformed ID",
                    )
            val productWasDeleted = productService.deleteProduct(productId)
            if (!productWasDeleted) return@delete call.respond(HttpStatusCode.NotFound, Message("Product not found"))
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
