package pos.ambrosia.api

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.models.Currency
import pos.ambrosia.models.Message
import pos.ambrosia.models.SetBaseCurrencyRequest
import pos.ambrosia.services.CurrencyService
import pos.ambrosia.utils.authorizePermission
import java.sql.Connection

fun Application.configureCurrency() {
    val connection: Connection = DatabaseConnection.getConnection()
    val service = CurrencyService(connection)

    routing {
        route("/currencies") {
            authorizePermission("settings_read") {
                get("") {
                    val list = service.list()
                    call.respond(HttpStatusCode.OK, list)
                }
            }
        }

        route("/base-currency") {
            authorizePermission("settings_read") {
                get("") {
                    val curr = service.getBaseCurrency()
                    if (curr == null) {
                        call.respond(HttpStatusCode.NotFound, Message("Base currency not set"))
                    } else {
                        call.respond(HttpStatusCode.OK, curr)
                    }
                }
            }
            authorizePermission("settings_update") {
                put("") {
                    val req = call.receive<SetBaseCurrencyRequest>()
                    if (req.acronym.isNullOrBlank()) {
                        call.respond(HttpStatusCode.BadRequest, Message("Acronym is required"))
                        return@put
                    }
                    val ok = service.setBaseCurrencyByAcronym(req.acronym)
                    if (!ok) {
                        call.respond(HttpStatusCode.BadRequest, Message("Unknown currency acronym: ${req.acronym}"))
                        return@put
                    }
                    val curr = service.getBaseCurrency()
                    call.respond(HttpStatusCode.OK, curr ?: Message("Base currency updated"))
                }
            }
        }
    }
}
