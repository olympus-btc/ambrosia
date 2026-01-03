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
import pos.ambrosia.models.AddOrderDishRequest
import pos.ambrosia.models.CompleteOrder
import pos.ambrosia.models.Order
import pos.ambrosia.models.OrderDish
import pos.ambrosia.models.OrderWithDishesRequest
import pos.ambrosia.services.OrderService
import pos.ambrosia.utils.authorizePermission

fun Application.configureOrders() {
  val connection: Connection = DatabaseConnection.getConnection()
  val orderService = OrderService(connection)
  routing { route("/orders") { orders(orderService) } }
}

fun Route.orders(orderService: OrderService) {
  authorizePermission("orders_read") {
    get("") {
      val orders = orderService.getOrders()
      if (orders.isEmpty()) {
        call.respond(HttpStatusCode.NoContent, "No orders found")
        return@get
      }
      call.respond(HttpStatusCode.OK, orders)
    }

    get("/with-payments") {
      val orders = orderService.getOrdersWithPayments()
      if (orders.isEmpty()) {
        call.respond(HttpStatusCode.NoContent, "No orders found")
        return@get
      }
      call.respond(HttpStatusCode.OK, orders)
    }

    get("/{id}") {
      val id = call.parameters["id"]
      if (id.isNullOrEmpty()) {
        call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
        return@get
      }

      try {
        val order = orderService.getOrderById(id)
        if (order == null) {
          call.respond(HttpStatusCode.NotFound, "Order not found")
          return@get
        }
        call.respond(HttpStatusCode.OK, order)
      } catch (e: Exception) {
        logger.error("Error retrieving order: ${e.message}")
        call.respond(HttpStatusCode.InternalServerError, "Error retrieving order")
      }
    }

    // Get complete order with dishes
    get("/{id}/complete") {
      val id = call.parameters["id"]
      if (id.isNullOrEmpty()) {
        call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
        return@get
      }

      try {
        val order = orderService.getOrderById(id)
        if (order == null) {
          call.respond(HttpStatusCode.NotFound, "Order not found")
          return@get
        }
        val dishes = orderService.getOrderDishes(id)
        val completeOrder = CompleteOrder(order, dishes)
        call.respond(HttpStatusCode.OK, completeOrder)
      } catch (e: Exception) {
        logger.error("Error retrieving complete order: ${e.message}")
        call.respond(HttpStatusCode.InternalServerError, "Error retrieving complete order")
      }
    }
    get("/{id}/dishes") {
      val orderId = call.parameters["id"]
      if (orderId.isNullOrEmpty()) {
        call.respond(HttpStatusCode.BadRequest, "Missing or malformed order ID")
        return@get
      }

      try {
        val dishes = orderService.getOrderDishes(orderId)
        if (dishes.isEmpty()) {
          call.respond(HttpStatusCode.NoContent, "No dishes found for this order")
          return@get
        }
        call.respond(HttpStatusCode.OK, dishes)
      } catch (e: Exception) {
        logger.error("Error retrieving order dishes: ${e.message}")
        call.respond(HttpStatusCode.InternalServerError, "Error retrieving order dishes")
      }
    }
    // Filter endpoints
    get("/user/{userId}") {
      val userId = call.parameters["userId"]
      if (userId.isNullOrEmpty()) {
        call.respond(HttpStatusCode.BadRequest, "Missing or malformed user ID")
        return@get
      }

      try {
        val orders = orderService.getOrdersByUserId(userId)
        if (orders.isEmpty()) {
          call.respond(HttpStatusCode.NoContent, "No orders found for user")
          return@get
        }
        call.respond(HttpStatusCode.OK, orders)
      } catch (e: Exception) {
        logger.error("Error retrieving orders by user: ${e.message}")
        call.respond(HttpStatusCode.InternalServerError, "Error retrieving orders")
      }
    }

    get("/table/{tableId}") {
      val tableId = call.parameters["tableId"]
      if (tableId.isNullOrEmpty()) {
        call.respond(HttpStatusCode.BadRequest, "Missing or malformed table ID")
        return@get
      }

      try {
        val orders = orderService.getOrdersByTableId(tableId)
        if (orders.isEmpty()) {
          call.respond(HttpStatusCode.NoContent, "No orders found for table")
          return@get
        }
        call.respond(HttpStatusCode.OK, orders)
      } catch (e: Exception) {
        logger.error("Error retrieving orders by table: ${e.message}")
        call.respond(HttpStatusCode.InternalServerError, "Error retrieving orders")
      }
    }

    get("/status/{status}") {
      val status = call.parameters["status"]
      if (status.isNullOrEmpty()) {
        call.respond(HttpStatusCode.BadRequest, "Missing or malformed status")
        return@get
      }

      try {
        val orders = orderService.getOrdersByStatus(status)
        if (orders.isEmpty()) {
          call.respond(HttpStatusCode.NoContent, "No orders found with status: $status")
          return@get
        }
        call.respond(HttpStatusCode.OK, orders)
      } catch (e: Exception) {
        logger.error("Error retrieving orders by status: ${e.message}")
        call.respond(HttpStatusCode.InternalServerError, "Error retrieving orders")
      }
    }

    get("/date-range") {
      val startDate = call.request.queryParameters["start_date"]
      val endDate = call.request.queryParameters["end_date"]

      if (startDate.isNullOrEmpty() || endDate.isNullOrEmpty()) {
        call.respond(HttpStatusCode.BadRequest, "Missing start_date or end_date query parameters")
        return@get
      }

      try {
        val orders = orderService.getOrdersByDateRange(startDate, endDate)
        if (orders.isEmpty()) {
          call.respond(HttpStatusCode.NoContent, "No orders found in date range")
          return@get
        }
        call.respond(HttpStatusCode.OK, orders)
      } catch (e: Exception) {
        logger.error("Error retrieving orders by date range: ${e.message}")
        call.respond(HttpStatusCode.InternalServerError, "Error retrieving orders")
      }
    }

    get("/total-sales/{date}") {
      val date = call.parameters["date"]
      if (date.isNullOrEmpty()) {
        call.respond(HttpStatusCode.BadRequest, "Missing or malformed date")
        return@get
      }

      try {
        val totalSales = orderService.getTotalSalesByDate(date)
        call.respond(HttpStatusCode.OK, mapOf("date" to date, "total_sales" to totalSales))
      } catch (e: Exception) {
        logger.error("Error retrieving total sales: ${e.message}")
        call.respond(HttpStatusCode.InternalServerError, "Error retrieving total sales")
      }
    }
  }

  authorizePermission("orders_create") {
    post("") {
      try {
        val order = call.receive<Order>()
        val orderId = orderService.addOrder(order)
        if (orderId == null) {
          call.respond(HttpStatusCode.BadRequest, "Failed to create order")
          return@post
        }
        call.respond(
          HttpStatusCode.Created,
          mapOf("id" to orderId, "message" to "Order created successfully")
        )
      } catch (e: Exception) {
        logger.error("Error creating order: ${e.message}")
        call.respond(HttpStatusCode.BadRequest, "Invalid order data")
      }
    }

    // Create order with dishes
    post("/with-dishes") {
      try {
        val request = call.receive<OrderWithDishesRequest>()
        val orderId = orderService.addOrder(request.order)
        if (orderId == null) {
          call.respond(HttpStatusCode.BadRequest, "Failed to create order")
          return@post
        }

        val dishesAdded = orderService.addDishesToOrder(orderId, request.dishes)
        if (!dishesAdded) {
          call.respond(HttpStatusCode.BadRequest, "Order created but failed to add some dishes")
          return@post
        }

        // Update order total based on dishes
        orderService.updateOrderTotal(orderId)
        call.respond(
          HttpStatusCode.Created,
          mapOf("message" to "Order with dishes created successfully", "id" to orderId)
        )
      } catch (e: Exception) {
        logger.error("Error creating order with dishes: ${e.message}")
        call.respond(HttpStatusCode.BadRequest, "Invalid request data")
      }
    }
    post("/{id}/dishes") {
      val orderId = call.parameters["id"]
      if (orderId.isNullOrEmpty()) {
        call.respond(HttpStatusCode.BadRequest, "Missing or malformed order ID")
        return@post
      }

      try {
        val dishRequests = call.receive<List<AddOrderDishRequest>>()
        if (dishRequests.isEmpty()) {
          call.respond(HttpStatusCode.BadRequest, "No dishes provided")
          return@post
        }

        // Convert DTO to OrderDish objects
        val dishes =
        dishRequests.map { request ->
          OrderDish(
            order_id = orderId,
            dish_id = request.dish_id,
            price_at_order = request.price_at_order,
            notes = request.notes,
            status = "pending",
            should_prepare = true
          )
        }

        val added = orderService.addDishesToOrder(orderId, dishes)
        if (!added) {
          call.respond(HttpStatusCode.BadRequest, "Failed to add dishes to order")
          return@post
        }

        // Update order total
        orderService.updateOrderTotal(orderId)
        call.respond(
          HttpStatusCode.Created,
          mapOf("orderId" to orderId, "message" to "Dishes added to order successfully")
        )
      } catch (e: Exception) {
        logger.error("Error adding dishes to order: ${e.message}")
        call.respond(HttpStatusCode.BadRequest, "Invalid dishes data")
      }
    }
  }

  authorizePermission("orders_update") {
    put("/{id}") {
      val id = call.parameters["id"]
      if (id.isNullOrEmpty()) {
        call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
        return@put
      }

      try {
        val updatedOrder = call.receive<Order>()
        val orderWithId = updatedOrder.copy(id = id)
        val isUpdated = orderService.updateOrder(orderWithId)
        if (!isUpdated) {
          call.respond(HttpStatusCode.NotFound, "Order with ID: $id not found")
          return@put
        }
        call.respond(
          HttpStatusCode.OK,
          mapOf("id" to id, "message" to "Order updated successfully")
        )
      } catch (e: Exception) {
        logger.error("Error updating order: ${e.message}")
        call.respond(HttpStatusCode.BadRequest, "Invalid order data")
      }
    }
    put("/{id}/dishes/{dishId}") {
      val orderId = call.parameters["id"]
      val dishId = call.parameters["dishId"]
      if (orderId.isNullOrEmpty() || dishId.isNullOrEmpty()) {
        call.respond(HttpStatusCode.BadRequest, "Missing or malformed IDs")
        return@put
      }

      try {
        val updatedDish = call.receive<OrderDish>()
        val dishWithId = updatedDish.copy(id = dishId, order_id = orderId)
        val isUpdated = orderService.updateOrderDish(dishWithId)
        if (!isUpdated) {
          call.respond(HttpStatusCode.NotFound, "Order dish not found")
          return@put
        }

        // Update order total
        orderService.updateOrderTotal(orderId)
        call.respond(
          HttpStatusCode.OK,
          mapOf(
            "orderId" to orderId,
            "dishId" to dishId,
            "message" to "Order dish updated successfully"
          )
        )
      } catch (e: Exception) {
        logger.error("Error updating order dish: ${e.message}")
        call.respond(HttpStatusCode.BadRequest, "Invalid dish data")
      }
    }
    // Calculate and update order total
    put("/{id}/calculate-total") {
      val orderId = call.parameters["id"]
      if (orderId.isNullOrEmpty()) {
        call.respond(HttpStatusCode.BadRequest, "Missing or malformed order ID")
        return@put
      }

      try {
        val newTotal = orderService.calculateOrderTotal(orderId)
        val isUpdated = orderService.updateOrderTotal(orderId)
        if (!isUpdated) {
          call.respond(HttpStatusCode.NotFound, "Order not found")
          return@put
        }
        call.respond(
          HttpStatusCode.OK,
          mapOf("message" to "Order total updated successfully", "total" to newTotal)
        )
      } catch (e: Exception) {
        logger.error("Error calculating order total: ${e.message}")
        call.respond(HttpStatusCode.InternalServerError, "Error calculating order total")
      }
    }
  }

  authorizePermission("orders_delete") {
    delete("/{id}") {
      val id = call.parameters["id"]
      if (id.isNullOrEmpty()) {
        call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
        return@delete
      }

      try {
        val isDeleted = orderService.deleteOrder(id)
        if (!isDeleted) {
          call.respond(HttpStatusCode.NotFound, "Order not found")
          return@delete
        }
        call.respond(
          HttpStatusCode.OK,
          mapOf("id" to id, "message" to "Order deleted successfully")
        )
      } catch (e: Exception) {
        logger.error("Error deleting order: ${e.message}")
        call.respond(HttpStatusCode.InternalServerError, "Error deleting order")
      }
    }
    delete("/{id}/dishes/{dishId}") {
      val orderId = call.parameters["id"]
      val dishId = call.parameters["dishId"]
      if (orderId.isNullOrEmpty() || dishId.isNullOrEmpty()) {
        call.respond(HttpStatusCode.BadRequest, "Missing or malformed IDs")
        return@delete
      }

      try {
        val isDeleted = orderService.removeOrderDish(dishId)
        if (!isDeleted) {
          call.respond(HttpStatusCode.NotFound, "Order dish not found")
          return@delete
        }

        // Update order total
        orderService.updateOrderTotal(orderId)
        call.respond(
          HttpStatusCode.OK,
          mapOf(
            "orderId" to orderId,
            "dishId" to dishId,
            "message" to "Dish removed from order successfully"
          )
        )
      } catch (e: Exception) {
        logger.error("Error removing order dish: ${e.message}")
        call.respond(HttpStatusCode.InternalServerError, "Error removing order dish")
      }
    }

    delete("/{id}/dishes") {
      val orderId = call.parameters["id"]
      if (orderId.isNullOrEmpty()) {
        call.respond(HttpStatusCode.BadRequest, "Missing or malformed order ID")
        return@delete
      }

      try {
        val isDeleted = orderService.removeAllOrderDishes(orderId)
        if (!isDeleted) {
          call.respond(HttpStatusCode.InternalServerError, "Failed to remove dishes from order")
          return@delete
        }

        // Update order total to 0
        orderService.updateOrderTotal(orderId)
        call.respond(
          HttpStatusCode.OK,
          mapOf(
            "orderId" to orderId,
            "message" to "All dishes removed from order successfully"
          )
        )
      } catch (e: Exception) {
        logger.error("Error removing all order dishes: ${e.message}")
        call.respond(HttpStatusCode.InternalServerError, "Error removing order dishes")
      }
    }
  }
}
