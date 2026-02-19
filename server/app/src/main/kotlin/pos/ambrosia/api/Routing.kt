package pos.ambrosia.api

import io.ktor.server.application.Application
import io.ktor.server.plugins.swagger.swaggerUI
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.services.BaseCurrencyService
import java.sql.Connection

fun Application.configureRouting() {
    val connection: Connection = DatabaseConnection.getConnection()
    routing {
        swaggerUI(path = "/swagger", swaggerFile = "openapi/documentation.yaml")
        get("/") {
            // TODO: Add link to the documentation
            call.respondText("Root path of the API Nothing to see here")
        }
        get("/base-currency") {
            val baseCurrencyService = BaseCurrencyService(connection)
            val baseCurrency = baseCurrencyService.getBaseCurrency()
            if (baseCurrency == null) {
                call.respond(mapOf("currency_id" to null))
            } else {
                call.respond(baseCurrency)
            }
        }
    }
}
