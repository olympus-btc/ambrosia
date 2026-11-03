package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.auth.authenticate
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.models.Config
import pos.ambrosia.models.PublicConfig
import pos.ambrosia.services.ConfigService
import pos.ambrosia.utils.authorizePermission
import pos.ambrosia.utils.getCurrentUser
import java.time.ZoneId

private fun areTipPercentagesValid(serializedPercentages: String): Boolean {
    val percentageEntries = serializedPercentages.split(",").map(String::trim)
    if (percentageEntries.isEmpty() || percentageEntries.any { it.isEmpty() }) return false

    val parsedPercentages = percentageEntries.map { it.toDoubleOrNull() ?: return false }
    return parsedPercentages.all { it.isFinite() && it > 0.0 && it <= 100.0 } &&
        parsedPercentages.distinct().size == parsedPercentages.size
}

private val customTipTypes = setOf("percentage", "fixed")

private fun isPriceStepValid(priceStep: Double): Boolean = priceStep.isFinite() && priceStep > 0.0 && priceStep <= 1000.0

fun Application.configureConfig() {
    val configService = ConfigService()
    routing { route("/config") { config(configService) } }
}

fun Route.config(configService: ConfigService) {
    authenticate("auth-jwt", optional = true) {
        get("") {
            val config = configService.getConfig()
            if (config == null) {
                call.respond(HttpStatusCode.NotFound, "Config not found")
                return@get
            }
            if (call.getCurrentUser() == null) {
                call.respond(
                    HttpStatusCode.OK,
                    PublicConfig(
                        businessType = config.businessType,
                        businessName = config.businessName,
                        businessLogoUrl = config.businessLogoUrl,
                    ),
                )
                return@get
            }
            call.respond(HttpStatusCode.OK, config)
        }
    }
    authorizePermission("settings_update") {
        put("") {
            val config = call.receive<Config>()
            if (config.timezone !in ZoneId.getAvailableZoneIds()) {
                call.respond(HttpStatusCode.BadRequest, "Invalid timezone: ${config.timezone}")
                return@put
            }
            if (!areTipPercentagesValid(config.tipPercentages)) {
                call.respond(HttpStatusCode.BadRequest, "Invalid tip percentages")
                return@put
            }
            if (config.customTipDefaultType !in customTipTypes) {
                call.respond(HttpStatusCode.BadRequest, "Invalid custom tip default type")
                return@put
            }
            if (!isPriceStepValid(config.priceStep)) {
                call.respond(HttpStatusCode.BadRequest, "Invalid price step")
                return@put
            }
            val isUpdated = configService.updateConfig(config)
            if (!isUpdated) {
                call.respond(HttpStatusCode.NotFound, "Failed to update config")
                return@put
            }
            call.respond(HttpStatusCode.OK, mapOf("message" to "Config updated successfully"))
        }
    }
}
