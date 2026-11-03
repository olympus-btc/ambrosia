package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.services.PaymentService
import pos.ambrosia.services.TicketPaymentService
import pos.ambrosia.utils.authorizePermission

fun Application.configurePayments() {
    val paymentService = PaymentService()
    val ticketPaymentService = TicketPaymentService()
    routing { route("/payments") { payments(paymentService, ticketPaymentService) } }
}

fun Route.payments(
    paymentService: PaymentService,
    ticketPaymentService: TicketPaymentService,
) {
    authorizePermission("payments_read") {
        get("") {
            val payments = paymentService.getPayments()
            if (payments.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No payments found")
                return@get
            }
            call.respond(HttpStatusCode.OK, payments)
        }
        get("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@get
            }

            val payment = paymentService.getPaymentById(id)
            if (payment == null) {
                call.respond(HttpStatusCode.NotFound, "Payment not found")
                return@get
            }

            call.respond(HttpStatusCode.OK, payment)
        }
        get("/methods") {
            val paymentMethods = paymentService.getPaymentMethods()
            if (paymentMethods.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No payment methods found")
                return@get
            }
            call.respond(HttpStatusCode.OK, paymentMethods)
        }
        get("/methods/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@get
            }

            val paymentMethod = paymentService.getPaymentMethodById(id)
            if (paymentMethod == null) {
                call.respond(HttpStatusCode.NotFound, "Payment method not found")
                return@get
            }

            call.respond(HttpStatusCode.OK, paymentMethod)
        }
        get("/currencies") {
            val currencies = paymentService.getCurrencies()
            if (currencies.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No currencies found")
                return@get
            }
            call.respond(HttpStatusCode.OK, currencies)
        }
        get("/currencies/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@get
            }

            val currency = paymentService.getCurrencyById(id)
            if (currency == null) {
                call.respond(HttpStatusCode.NotFound, "Currency not found")
                return@get
            }

            call.respond(HttpStatusCode.OK, currency)
        }
        get("/ticket-payments/by-ticket/{ticketId}") {
            val ticketId = call.parameters["ticketId"]
            if (ticketId == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ticket ID")
                return@get
            }

            val payments = ticketPaymentService.getTicketPaymentsByTicket(ticketId)
            if (payments == null) {
                call.respond(HttpStatusCode.NotFound, "Ticket not found")
                return@get
            }
            if (payments.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No payments found for this ticket")
                return@get
            }
            call.respond(HttpStatusCode.OK, payments)
        }

        get("/ticket-payments/by-payment/{paymentId}") {
            val paymentId = call.parameters["paymentId"]
            if (paymentId == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed payment ID")
                return@get
            }

            val tickets = ticketPaymentService.getTicketPaymentsByPayment(paymentId)
            if (tickets == null) {
                call.respond(HttpStatusCode.NotFound, "Payment not found")
                return@get
            }
            if (tickets.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No tickets found for this payment")
                return@get
            }
            call.respond(HttpStatusCode.OK, tickets)
        }
    }
    authorizePermission("payments_delete") {
        delete("/{id}") {
            val id = call.parameters["id"]
            if (id == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
                return@delete
            }

            val isDeleted = paymentService.deletePayment(id)
            if (!isDeleted) {
                call.respond(HttpStatusCode.BadRequest, "Failed to delete payment or payment is in use")
                return@delete
            }

            call.respond(HttpStatusCode.NoContent)
        }

        delete("/ticket-payments") {
            val paymentId = call.request.queryParameters["paymentId"]
            val ticketId = call.request.queryParameters["ticketId"]

            if (paymentId == null || ticketId == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing paymentId or ticketId query parameters")
                return@delete
            }

            val isDeleted = ticketPaymentService.deleteTicketPayment(paymentId, ticketId)
            if (!isDeleted) {
                call.respond(HttpStatusCode.BadRequest, "Failed to delete ticket payment relationship")
                return@delete
            }

            call.respond(HttpStatusCode.NoContent)
        }

        delete("/ticket-payments/by-ticket/{ticketId}") {
            val ticketId = call.parameters["ticketId"]
            if (ticketId == null) {
                call.respond(HttpStatusCode.BadRequest, "Missing or malformed ticket ID")
                return@delete
            }

            ticketPaymentService.deleteTicketPaymentsByTicket(ticketId)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
