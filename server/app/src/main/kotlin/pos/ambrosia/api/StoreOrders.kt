package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.Message
import pos.ambrosia.models.RefundRequest
import pos.ambrosia.services.ActiveLightningBackend
import pos.ambrosia.services.CheckoutService
import pos.ambrosia.services.RefundService
import pos.ambrosia.utils.authorizePermission

fun Application.configureStoreOrders() {
    val checkoutService = CheckoutService()
    val refundService = RefundService(ActiveLightningBackend)
    routing { route("/store/orders") { storeOrders(checkoutService, refundService) } }
}

fun Route.storeOrders(
    checkoutService: CheckoutService,
    refundService: RefundService,
) {
    authorizePermission("orders_delete") {
        delete("/{id}") {
            val id =
                call.parameters["id"]
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, Message("Missing order ID"))
            val cancelled = checkoutService.cancelStoreOrder(id)
            if (!cancelled) {
                return@delete call.respond(
                    HttpStatusCode.NotFound,
                    Message("Order not found or already closed"),
                )
            }
            call.respond(HttpStatusCode.OK, Message("Order cancelled successfully"))
        }
    }
    authorizePermission("orders_refund") {
        post("/{id}/refund") {
            val orderId =
                call.parameters["id"]
                    ?: return@post call.respond(HttpStatusCode.BadRequest, Message("Missing order ID"))
            val request = call.receive<RefundRequest>()
            val refund = refundService.processRefund(orderId, request)
            call.respond(HttpStatusCode.OK, refund)
        }
    }
}
