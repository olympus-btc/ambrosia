package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.Message
import pos.ambrosia.models.StoreCheckoutRequest
import pos.ambrosia.services.CheckoutResult
import pos.ambrosia.services.CheckoutService
import pos.ambrosia.services.PhoenixService
import pos.ambrosia.utils.PaymentNotConfirmedException
import pos.ambrosia.utils.authorizePermission

private const val CHECKOUT_FAILED_MSG = "Checkout failed: check items, stock levels, and payment details"

fun Application.configureCheckout() {
    val phoenixService = PhoenixService(environment)
    val checkoutService = CheckoutService(phoenixService)
    routing { route("/store/orders") { checkout(checkoutService, phoenixService) } }
}

fun Route.checkout(
    checkoutService: CheckoutService,
    phoenixService: PhoenixService,
) {
    authorizePermission("orders_create") {
        post("/checkout") {
            val checkoutRequest = call.receive<StoreCheckoutRequest>()
            when (val result = checkoutService.checkout(checkoutRequest)) {
                is CheckoutResult.Success -> {
                    val status = if (result.alreadyExisted) HttpStatusCode.OK else HttpStatusCode.Created
                    call.respond(status, result.response)
                }

                CheckoutResult.NotPaid -> {
                    throw PaymentNotConfirmedException()
                }

                CheckoutResult.Invalid -> {
                    call.respond(HttpStatusCode.BadRequest, Message(CHECKOUT_FAILED_MSG))
                }
            }
        }
        get("/payment-status/{hash}") {
            val paymentHash = call.parameters["hash"]
            if (paymentHash.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, Message("paymentHash required"))
                return@get
            }

            val existing = checkoutService.findCheckoutByPaymentHash(paymentHash)
            if (existing != null) {
                call.respond(HttpStatusCode.OK, existing)
                return@get
            }

            val incomingPayment = runCatching { phoenixService.getIncomingPayment(paymentHash) }.getOrNull()
            val status = if (incomingPayment?.isPaid == true) "paid" else "pending"
            call.respond(HttpStatusCode.OK, mapOf("status" to status))
        }
    }
}
