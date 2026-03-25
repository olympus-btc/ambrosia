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
import pos.ambrosia.models.AddOrderDishRequest
import pos.ambrosia.models.CompleteOrder
import pos.ambrosia.models.Message
import pos.ambrosia.models.Order
import pos.ambrosia.models.OrderDish
import pos.ambrosia.models.OrderWithDishesRequest
import pos.ambrosia.models.OrderWithPaymentFilters
import pos.ambrosia.services.OrderService
import pos.ambrosia.utils.DatabaseException
import pos.ambrosia.utils.ResourceNotFoundException
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection
import java.time.LocalDate

private fun parseDateQueryParam(
    value: String?,
    name: String,
): String? {
    if (value.isNullOrBlank()) return null
    return try {
        LocalDate.parse(value).toString()
    } catch (_: Exception) {
        throw IllegalArgumentException("Invalid $name: $value. Expected format YYYY-MM-DD")
    }
}

private fun parseDoubleQueryParam(
    value: String?,
    name: String,
): Double? {
    if (value.isNullOrBlank()) return null
    return value.toDoubleOrNull() ?: throw IllegalArgumentException("Invalid $name: $value")
}

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
                call.respond(HttpStatusCode.OK, "No orders found")
                return@get
            }
            call.respond(HttpStatusCode.OK, orders)
        }

        get("/with-payments") {
            val filters =
                try {
                    OrderWithPaymentFilters(
                        startDate = parseDateQueryParam(call.request.queryParameters["start_date"], "start_date"),
                        endDate = parseDateQueryParam(call.request.queryParameters["end_date"], "end_date"),
                        status = call.request.queryParameters["status"]?.takeIf { it.isNotBlank() },
                        userId = call.request.queryParameters["user_id"]?.takeIf { it.isNotBlank() },
                        paymentMethod = call.request.queryParameters["payment_method"]?.takeIf { it.isNotBlank() },
                        minTotal = parseDoubleQueryParam(call.request.queryParameters["min_total"], "min_total"),
                        maxTotal = parseDoubleQueryParam(call.request.queryParameters["max_total"], "max_total"),
                        sortBy = call.request.queryParameters["sort_by"]?.takeIf { it.isNotBlank() },
                        sortOrder = call.request.queryParameters["sort_order"]?.takeIf { it.isNotBlank() },
                    ).also {
                        if (it.startDate != null && it.endDate != null && it.startDate > it.endDate) {
                            throw IllegalArgumentException("start_date cannot be greater than end_date")
                        }
                    }
                } catch (error: IllegalArgumentException) {
                    call.respond(HttpStatusCode.BadRequest, Message(error.message ?: "Invalid query parameters"))
                    return@get
                }

            val orders =
                try {
                    orderService.getOrdersWithPaymentsFiltered(filters)
                } catch (error: IllegalArgumentException) {
                    call.respond(HttpStatusCode.BadRequest, Message(error.message ?: "Invalid query parameters"))
                    return@get
                }

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

        get("/total-sales/{date}") {
            val date = call.parameters["date"]
            if (date.isNullOrEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed date")
                return@get
            }

            val totalSales = orderService.getTotalSalesByDate(date)
            call.respond(HttpStatusCode.OK, mapOf("date" to date, "total_sales" to totalSales.toString()))
        }
    }

    authorizePermission("orders_create") {
        post("") {
            val order = call.receive<Order>()
            val orderId = orderService.addOrder(order)
            if (orderId == null) {
                call.respond(HttpStatusCode.BadRequest, "Failed to create order")
                return@post
            }
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to orderId, "message" to "Order created successfully"),
            )
        }

        // Create order with dishes
        post("/with-dishes") {
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
                mapOf("message" to "Order with dishes created successfully", "id" to orderId),
            )
        }
        post("/{id}/dishes") {
            val orderId = call.parameters["id"]
            if (orderId.isNullOrEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed order ID")
                return@post
            }

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
                        should_prepare = true,
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
                mapOf("orderId" to orderId, "message" to "Dishes added to order successfully"),
            )
        }
    }

    authorizePermission("orders_update") {
        put("/{id}") {
            val id = call.parameters["id"]
            if (id.isNullOrEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@put
            }

            val updatedOrder = call.receive<Order>()
            val orderWithId = updatedOrder.copy(id = id)
            val isUpdated = orderService.updateOrder(orderWithId)
            if (!isUpdated) {
                throw ResourceNotFoundException("Order $id not found")
            }
            call.respond(
                HttpStatusCode.OK,
                mapOf("id" to id, "message" to "Order updated successfully"),
            )
        }
        put("/{id}/dishes/{dishId}") {
            val orderId = call.parameters["id"]
            val dishId = call.parameters["dishId"]
            if (orderId.isNullOrEmpty() || dishId.isNullOrEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed IDs")
                return@put
            }

            val updatedDish = call.receive<OrderDish>()
            val dishWithId = updatedDish.copy(id = dishId, order_id = orderId)
            val isUpdated = orderService.updateOrderDish(dishWithId)
            if (!isUpdated) {
                throw ResourceNotFoundException("Order dish $dishId not found in order $orderId")
            }

            // Update order total
            orderService.updateOrderTotal(orderId)
            call.respond(
                HttpStatusCode.OK,
                mapOf(
                    "orderId" to orderId,
                    "dishId" to dishId,
                    "message" to "Order dish updated successfully",
                ),
            )
        }

        // Calculate and update order total
        put("/{id}/calculate-total") {
            val orderId = call.parameters["id"]
            if (orderId.isNullOrEmpty()) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed order ID")
                return@put
            }

            val newTotal = orderService.calculateOrderTotal(orderId)
            val isUpdated = orderService.updateOrderTotal(orderId)
            if (!isUpdated) {
                throw ResourceNotFoundException("Order $orderId not found")
            }
            call.respond(
                HttpStatusCode.OK,
                mapOf("message" to "Order total updated successfully", "total" to newTotal),
            )
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
