package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.auth.authenticate
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.Message
import pos.ambrosia.models.OrdersSyncFindingsResponse
import pos.ambrosia.services.ActiveLightningBackend
import pos.ambrosia.services.CheckoutService
import pos.ambrosia.services.OrdersSyncService

fun Application.configureOrdersSync() {
    val ordersSyncService = OrdersSyncService(ActiveLightningBackend, CheckoutService(ActiveLightningBackend))
    routing { route("/wallet/orders-sync") { ordersSync(ordersSyncService) } }
}

fun Route.ordersSync(ordersSyncService: OrdersSyncService) {
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
    }
}
