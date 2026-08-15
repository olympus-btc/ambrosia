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
import pos.ambrosia.models.WalletErrorResponse
import pos.ambrosia.services.ActiveLightningBackend
import pos.ambrosia.services.CheckoutResult
import pos.ambrosia.services.CheckoutService
import pos.ambrosia.utils.PaymentNotConfirmedException
import pos.ambrosia.utils.authorizePermission
import pos.ambrosia.utils.requirePermission

fun Application.configureCheckout() {
    val checkoutService = CheckoutService(ActiveLightningBackend)
    routing { route("/store/orders") { checkout(checkoutService) } }
}

fun Route.checkout(checkoutService: CheckoutService) {
    authorizePermission("orders_create") {
        post("/checkout") {
            val checkoutRequest = call.receive<StoreCheckoutRequest>()
            if (checkoutRequest.discountAmount > 0.0) {
                call.requirePermission("orders_discount")
            }
            when (val result = checkoutService.checkout(checkoutRequest)) {
                is CheckoutResult.Success -> {
                    val status = if (result.alreadyExisted) HttpStatusCode.OK else HttpStatusCode.Created
                    call.respond(status, result.response)
                }

                CheckoutResult.NotPaid -> {
                    throw PaymentNotConfirmedException()
                }

                is CheckoutResult.Invalid -> {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        WalletErrorResponse(result.message, result.code, "ambrosia"),
                    )
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

            val incomingPayment = runCatching { ActiveLightningBackend.getIncomingPayment(paymentHash) }.getOrNull()
            val status = if (incomingPayment?.isPaid == true) "paid" else "pending"
            call.respond(HttpStatusCode.OK, mapOf("status" to status))
        }
    }
}
