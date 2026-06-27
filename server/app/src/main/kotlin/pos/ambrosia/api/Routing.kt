package pos.ambrosia.api

import io.ktor.server.application.Application
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import pos.ambrosia.services.BaseCurrencyService

fun Application.configureRouting() {
    routing {
        get("/") {
            call.respondText("Root path of the API Nothing to see here")
        }
        get("/base-currency") {
            val baseCurrencyService = BaseCurrencyService()
            val baseCurrency = baseCurrencyService.getBaseCurrency()
            if (baseCurrency == null) {
                call.respond(mapOf("currency_id" to null))
            } else {
                call.respond(baseCurrency)
            }
        }
    }
}
