package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.CompleteOrder
import pos.ambrosia.services.OrderService
import pos.ambrosia.utils.DatabaseException
import pos.ambrosia.utils.ResourceNotFoundException
import pos.ambrosia.utils.authorizePermission

fun Application.configureOrders() {
    val orderService = OrderService()
    routing { route("/orders") { orders(orderService) } }
}

fun Route.orders(orderService: OrderService) {
    authorizePermission("orders_read") {
        get("") {
            val orders = orderService.getOrders()
            if (orders.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No orders found")
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

            val order = orderService.getOrderById(id)
            if (order == null) {
                throw ResourceNotFoundException("Order $id not found")
            }
            call.respond(HttpStatusCode.OK, order)
        }

        // Get complete order with dishes
        get("/{id}/complete") {
            val id = call.parameters["id"]
            if (id.isNullOrEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@get
            }

            val order = orderService.getOrderById(id)
            if (order == null) {
                throw ResourceNotFoundException("Order $id not found")
            }

            val dishes = orderService.getOrderDishes(id)
            val completeOrder = CompleteOrder(order, dishes)
            call.respond(HttpStatusCode.OK, completeOrder)
        }

        get("/{id}/dishes") {
            val orderId = call.parameters["id"]
            if (orderId.isNullOrEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed order ID")
                return@get
            }

            val dishes = orderService.getOrderDishes(orderId)
            if (dishes.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No dishes found for this order")
                return@get
            }
            call.respond(HttpStatusCode.OK, dishes)
        }

        // Filter endpoints
        get("/user/{userId}") {
            val userId = call.parameters["userId"]
            if (userId.isNullOrEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed user ID")
                return@get
            }

            val orders = orderService.getOrdersByUserId(userId)
            if (orders == null) {
                call.respond(HttpStatusCode.NotFound, "User not found")
                return@get
            }
            if (orders.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No orders found for user")
                return@get
            }
            call.respond(HttpStatusCode.OK, orders)
        }

        get("/table/{tableId}") {
            val tableId = call.parameters["tableId"]
            if (tableId.isNullOrEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed table ID")
                return@get
            }

            val orders = orderService.getOrdersByTableId(tableId)
            if (orders == null) {
                call.respond(HttpStatusCode.NotFound, "Table not found")
                return@get
            }
            if (orders.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No orders found for table")
                return@get
            }
            call.respond(HttpStatusCode.OK, orders)
        }

        get("/status/{status}") {
            val status = call.parameters["status"]
            if (status.isNullOrEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed status")
                return@get
            }

            val orders = orderService.getOrdersByStatus(status)
            if (orders == null) {
                call.respond(HttpStatusCode.NotFound, "Invalid order status")
                return@get
            }
            if (orders.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No orders found with status: $status")
                return@get
            }
            call.respond(HttpStatusCode.OK, orders)
        }

        get("/date-range") {
            val startDate = call.request.queryParameters["start_date"]
            val endDate = call.request.queryParameters["end_date"]
            if (startDate.isNullOrEmpty() || endDate.isNullOrEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "Missing start_date or end_date query parameters")
                return@get
            }

            val orders = orderService.getOrdersByDateRange(startDate, endDate)
            if (orders.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No orders found in date range")
                return@get
            }
            call.respond(HttpStatusCode.OK, orders)
        }
    }

    authorizePermission("orders_delete") {
        delete("/{id}") {
            val id = call.parameters["id"]
            if (id.isNullOrEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@delete
            }

            val isDeleted = orderService.deleteOrder(id)
            if (!isDeleted) {
                throw ResourceNotFoundException("Order $id not found")
            }
            call.respond(HttpStatusCode.NoContent)
        }

        delete("/{id}/dishes/{dishId}") {
            val orderId = call.parameters["id"]
            val dishId = call.parameters["dishId"]
            if (orderId.isNullOrEmpty() || dishId.isNullOrEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed IDs")
                return@delete
            }

            val isDeleted = orderService.removeOrderDish(dishId)
            if (!isDeleted) {
                throw ResourceNotFoundException("Order dish $dishId not found")
            }

            // Update order total
            orderService.updateOrderTotal(orderId)
            call.respond(HttpStatusCode.NoContent)
        }

        delete("/{id}/dishes") {
            val orderId = call.parameters["id"]
            if (orderId.isNullOrEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed order ID")
                return@delete
            }

            val isDeleted = orderService.removeAllOrderDishes(orderId)
            if (!isDeleted) {
                throw DatabaseException("Failed to remove dishes from order")
            }

            // Update order total to 0
            orderService.updateOrderTotal(orderId)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
