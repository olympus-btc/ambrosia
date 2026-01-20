package pos.ambrosia.api

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.sql.Connection
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.logger
import pos.ambrosia.models.Product
import pos.ambrosia.models.ProductStockAdjustment
import pos.ambrosia.services.ProductService
import pos.ambrosia.utils.authorizePermission

fun Application.configureProducts() {
  val connection: Connection = DatabaseConnection.getConnection()
  val service = ProductService(connection)
  routing { route("/products") { products(service) } }
}

fun Route.products(service: ProductService) {
  authorizePermission("products_read") {
    get("") {
      val items = service.getProducts()
      if (items.isEmpty()) {
        call.respond(HttpStatusCode.NoContent, "No products found")
        return@get
      }
      call.respond(HttpStatusCode.OK, items)
    }
    get("/{id}") {
      val id =
      call.parameters["id"]
      ?: return@get call.respond(
        HttpStatusCode.BadRequest,
        "Missing or malformed ID"
      )
      val item =
      service.getProductById(id)
      ?: return@get call.respond(HttpStatusCode.NotFound, "Product not found")
      call.respond(HttpStatusCode.OK, item)
    }
  }
  authorizePermission("products_create") {
    post("") {
      val body = call.receive<Product>()
      val id = service.addProduct(body)
      if (id == null) {
        call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Invalid or duplicate product"))
        return@post
      }
      call.respond(
        HttpStatusCode.Created,
        mapOf("id" to id, "message" to "Product added successfully")
      )
    }
  }
  authorizePermission("products_update") {
    put("/{id}") {
      val id =
      call.parameters["id"]
      ?: return@put call.respond(
        HttpStatusCode.BadRequest,
        "Missing or malformed ID"
      )
      val body = call.receive<Product>()
      val ok = service.updateProduct(body.copy(id = id))
      if (!ok) {
        call.respond(HttpStatusCode.NotFound, "Product with ID: $id not found")
        return@put
      }
      call.respond(
        HttpStatusCode.OK,
        mapOf("id" to id, "message" to "Product updated successfully")
      )
    }
    post("/adjust-stock") {
      try {
        val adjustments = call.receive<List<ProductStockAdjustment>>()
        if (adjustments.isEmpty()) {
          call.respond(HttpStatusCode.BadRequest, "No stock adjustments provided")
          return@post
        }
        val ok = service.adjustStock(adjustments)
        if (!ok) {
          call.respond(HttpStatusCode.BadRequest, "Invalid or insufficient stock")
          return@post
        }
        call.respond(HttpStatusCode.OK, mapOf("message" to "Stock adjusted successfully"))
      } catch (e: Exception) {
        logger.error("Error adjusting product stock: ${e.message}")
        call.respond(HttpStatusCode.BadRequest, "Invalid stock adjustment data")
      }
    }
  }
  authorizePermission("products_delete") {
    delete("/{id}") {
      val id =
      call.parameters["id"]
      ?: return@delete call.respond(
        HttpStatusCode.BadRequest,
        "Missing or malformed ID"
      )
      service.deleteProduct(id)
      call.respond(
        HttpStatusCode.NoContent,
        mapOf("id" to id, "message" to "Product deleted successfully")
      )
    }
  }
}
