package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.models.Message
import pos.ambrosia.models.StoreCheckoutRequest
import pos.ambrosia.services.CheckoutService
import pos.ambrosia.services.PhoenixService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection

private const val CHECKOUT_FAILED_MSG = "Checkout failed: check items, stock levels, and payment details"

fun Application.configureCheckout() {
    val connection: Connection = DatabaseConnection.getConnection()
    val checkoutService = CheckoutService(connection)
    val phoenixService = PhoenixService(environment)
    routing { route("/store/orders") { checkout(checkoutService, phoenixService) } }
}

fun Route.checkout(
    service: CheckoutService,
    phoenixService: PhoenixService,
) {
    authorizePermission("orders_create") {
        post("/checkout") {
            val checkoutRequest = call.receive<StoreCheckoutRequest>()
            val checkoutResponse = service.checkout(checkoutRequest)
            if (checkoutResponse == null) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    Message(CHECKOUT_FAILED_MSG),
                )
                return@post
            }
            call.respond(HttpStatusCode.Created, checkoutResponse)
        }
        post("/checkout-if-paid") {
            val request = call.receive<StoreCheckoutRequest>()
            val paymentHash =
                request.paymentHash
                    ?: return@post call.respond(HttpStatusCode.BadRequest, Message("paymentHash required"))

            val existing = service.findCheckoutByPaymentHash(paymentHash)
            if (existing != null) {
                return@post call.respond(HttpStatusCode.OK, existing)
            }

            val incomingPayment = runCatching { phoenixService.getIncomingPayment(paymentHash) }.getOrNull()
            if (incomingPayment?.isPaid != true) {
                return@post call.respond(HttpStatusCode.Accepted, mapOf("status" to "pending"))
            }

            val result = service.checkout(request)
            if (result == null) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    Message(CHECKOUT_FAILED_MSG),
                )
            } else {
                call.respond(
                    HttpStatusCode.OK,
                    mapOf(
                        "status" to "completed",
                        "orderId" to result.orderId,
                        "ticketId" to result.ticketId,
                        "paymentId" to result.paymentId,
                    ),
                )
            }
        }
    }
}
