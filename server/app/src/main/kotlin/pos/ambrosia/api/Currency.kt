package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.Message
import pos.ambrosia.models.SetBaseCurrencyRequest
import pos.ambrosia.services.CurrencyService
import pos.ambrosia.utils.authorizePermission

fun Application.configureCurrency() {
    val currencyService = CurrencyService()

    routing {
        route("/currencies") {
            authorizePermission("settings_read") {
                get("") {
                    val currencies = currencyService.list()
                    call.respond(HttpStatusCode.OK, currencies)
                }
            }
        }

        route("/base-currency") {
            authorizePermission("settings_read") {
                get("") {
                    val baseCurrency = currencyService.getBaseCurrency()
                    if (baseCurrency == null) {
                        call.respond(HttpStatusCode.NotFound, Message("Base currency not set"))
                    } else {
                        call.respond(HttpStatusCode.OK, baseCurrency)
                    }
                }
            }
            authorizePermission("settings_update") {
                put("") {
                    val setBaseCurrencyRequest = call.receive<SetBaseCurrencyRequest>()
                    if (setBaseCurrencyRequest.acronym.isNullOrBlank()) {
                        call.respond(HttpStatusCode.BadRequest, Message("Acronym is required"))
                        return@put
                    }
                    val wasUpdated = currencyService.setBaseCurrencyByAcronym(setBaseCurrencyRequest.acronym)
                    if (!wasUpdated) {
                        call.respond(HttpStatusCode.NotFound, Message("Unknown currency acronym: ${setBaseCurrencyRequest.acronym}"))
                        return@put
                    }
                    val baseCurrency = currencyService.getBaseCurrency()
                    call.respond(HttpStatusCode.OK, baseCurrency ?: Message("Base currency updated"))
                }
            }
        }
    }
}
