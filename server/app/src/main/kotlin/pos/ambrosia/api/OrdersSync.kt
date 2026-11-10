package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.auth.authenticate
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.Message
import pos.ambrosia.models.MisdatedOrderCorrectionRequest
import pos.ambrosia.models.OrdersSyncFindingsResponse
import pos.ambrosia.models.StoreCheckoutRequest
import pos.ambrosia.models.WalletErrorResponse
import pos.ambrosia.services.ActiveLightningBackend
import pos.ambrosia.services.CheckoutResult
import pos.ambrosia.services.CheckoutService
import pos.ambrosia.services.OrdersSyncService
import pos.ambrosia.utils.PaymentNotConfirmedException
import pos.ambrosia.utils.requirePermission

fun Application.configureOrdersSync() {
    val checkoutService = CheckoutService(ActiveLightningBackend)
    val ordersSyncService = OrdersSyncService(ActiveLightningBackend, checkoutService)
    routing { route("/wallet/orders-sync") { ordersSync(ordersSyncService, checkoutService) } }
}

fun Route.ordersSync(
    ordersSyncService: OrdersSyncService,
    checkoutService: CheckoutService,
) {
    authenticate("auth-jwt-wallet") {
        get("/findings") {
            val startDate = call.request.queryParameters["startDate"]
            val endDate = call.request.queryParameters["endDate"]
            if (startDate.isNullOrBlank() || endDate.isNullOrBlank()) {
                call.respond(HttpStatusCode.BadRequest, Message("startDate and endDate are required"))
                return@get
            }

            val paymentsWithoutOrder = ordersSyncService.findPaymentsWithoutOrder(startDate, endDate)
            val misdatedOrders = ordersSyncService.findMisdatedOrders(startDate, endDate)
            call.respond(HttpStatusCode.OK, OrdersSyncFindingsResponse(paymentsWithoutOrder, misdatedOrders))
        }

        post("/payments-without-order/confirm") {
            val checkoutRequest = call.receive<StoreCheckoutRequest>()
            call.requirePermission("orders_create")

            when (val checkoutResult = checkoutService.checkout(checkoutRequest)) {
                is CheckoutResult.Success -> {
                    val checkoutResponseStatus = if (checkoutResult.alreadyExisted) HttpStatusCode.OK else HttpStatusCode.Created
                    call.respond(checkoutResponseStatus, checkoutResult.response)
                }

                CheckoutResult.NotPaid -> {
                    throw PaymentNotConfirmedException()
                }

                is CheckoutResult.Invalid -> {
                    call.respond(
                        HttpStatusCode.BadRequest,
                        WalletErrorResponse(checkoutResult.message, checkoutResult.code, "ambrosia"),
                    )
                }
            }
        }

        post("/misdated-orders/confirm") {
            val correctionRequest = call.receive<MisdatedOrderCorrectionRequest>()
            call.requirePermission("orders_create")

            val misdatedOrderWasCorrected = ordersSyncService.correctMisdatedOrder(correctionRequest.paymentId)
            if (misdatedOrderWasCorrected) {
                call.respond(HttpStatusCode.OK, Message("Order date corrected"))
            } else {
                call.respond(HttpStatusCode.BadRequest, Message("Unable to correct the order date"))
            }
        }
    }
}
