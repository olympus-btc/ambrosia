package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.models.Message
import pos.ambrosia.services.CheckoutService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection

fun Application.configureStoreOrders() {
    val connection: Connection = DatabaseConnection.getConnection()
    val service = CheckoutService(connection)
    routing { route("/store/orders") { storeOrders(service) } }
}

fun Route.storeOrders(service: CheckoutService) {
    authorizePermission("orders_read") {
        get("") {
            val orderStatus = call.request.queryParameters["status"]
            val orders = service.getStoreOrders(orderStatus)
            call.respond(HttpStatusCode.OK, orders)
        }
        get("/{id}") {
            val id =
                call.parameters["id"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest, Message("Missing order ID"))
            val order =
                service.getStoreOrderById(id)
                    ?: return@get call.respond(HttpStatusCode.NotFound, Message("Order not found"))
            call.respond(HttpStatusCode.OK, order)
        }
    }
    authorizePermission("orders_delete") {
        delete("/{id}") {
            val id =
                call.parameters["id"]
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, Message("Missing order ID"))
            val cancelled = service.cancelStoreOrder(id)
            if (!cancelled) {
                return@delete call.respond(
                    HttpStatusCode.NotFound,
                    Message("Order not found or already closed"),
                )
            }
            call.respond(HttpStatusCode.OK, Message("Order cancelled successfully"))
        }
    }
}
