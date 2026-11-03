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
import pos.ambrosia.models.PayoutAccountUpsert
import pos.ambrosia.services.PayoutAccountService
import pos.ambrosia.utils.authorizePermission

fun Application.configurePayoutAccounts() {
    val payoutAccountService = PayoutAccountService(environment)
    routing { route("/freelance/payout-accounts") { payoutAccounts(payoutAccountService) } }
}

fun Route.payoutAccounts(payoutAccountService: PayoutAccountService) {
    authorizePermission("payout_accounts_read") {
        get("") {
            val payoutAccounts = payoutAccountService.getPayoutAccounts()
            if (payoutAccounts.isEmpty()) {
                call.respond(HttpStatusCode.OK, "No payout accounts found")
                return@get
            }
            call.respond(HttpStatusCode.OK, payoutAccounts)
        }

        get("/{id}") {
            val payoutAccountId =
                call.parameters["id"]
                    ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
            val payoutAccount =
                payoutAccountService.getPayoutAccountById(payoutAccountId)
                    ?: return@get call.respond(HttpStatusCode.NotFound, "Payout account not found")
            call.respond(HttpStatusCode.OK, payoutAccount)
        }
    }

    authorizePermission("payout_accounts_create") {
        post("") {
            val payoutAccountRequest = call.receive<PayoutAccountUpsert>()
            val createdPayoutAccountId = payoutAccountService.addPayoutAccount(payoutAccountRequest)
            if (createdPayoutAccountId == null) {
                call.respond(HttpStatusCode.BadRequest, "Invalid payout account data")
                return@post
            }
            call.respond(
                HttpStatusCode.Created,
                mapOf("id" to createdPayoutAccountId, "message" to "Payout account added successfully"),
            )
        }
    }

    authorizePermission("payout_accounts_update") {
        put("/{id}") {
            val payoutAccountId =
                call.parameters["id"]
                    ?: return@put call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
            val payoutAccountRequest = call.receive<PayoutAccountUpsert>()
            val payoutAccountWasUpdated = payoutAccountService.updatePayoutAccount(payoutAccountId, payoutAccountRequest)
            if (!payoutAccountWasUpdated) {
                call.respond(HttpStatusCode.NotFound, "Payout account with ID: $payoutAccountId not found or invalid")
                return@put
            }
            call.respond(
                HttpStatusCode.OK,
                mapOf("id" to payoutAccountId, "message" to "Payout account updated successfully"),
            )
        }
    }

    authorizePermission("payout_accounts_delete") {
        delete("/{id}") {
            val payoutAccountId =
                call.parameters["id"]
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, "Missing or malformed ID")
            val payoutAccountWasDeleted = payoutAccountService.deletePayoutAccount(payoutAccountId)
            if (!payoutAccountWasDeleted) {
                call.respond(HttpStatusCode.NotFound, "Payout account not found")
                return@delete
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
