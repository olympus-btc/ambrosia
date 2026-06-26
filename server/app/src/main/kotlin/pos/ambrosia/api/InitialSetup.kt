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
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.models.Config
import pos.ambrosia.models.InitialSetupRequest
import pos.ambrosia.models.InitialSetupStatus
import pos.ambrosia.models.Role
import pos.ambrosia.models.User
import pos.ambrosia.services.ConfigService
import pos.ambrosia.services.CurrencyService
import pos.ambrosia.services.PermissionsService
import pos.ambrosia.services.RolesService
import pos.ambrosia.services.UsersService
import pos.ambrosia.utils.InitialSetupException

fun Application.configureInitialSetup() {
    routing {
        route("/initial-setup") { initialSetupRoutes() }
    }
}

private fun Route.initialSetupRoutes() {
    get("") {
        val configService = ConfigService()
        val config = configService.getConfig()
        val needsBusinessType = config != null && !config.businessTypeConfirmed
        call.respond(
            HttpStatusCode.OK,
            InitialSetupStatus(initialized = config != null, needsBusinessType = needsBusinessType),
        )
    }

    post("") {
        val req = call.receive<InitialSetupRequest>()

        val configService = ConfigService()
        val existingConfig = configService.getConfig()
        if (existingConfig != null) {
            if (!existingConfig.businessTypeConfirmed) {
                val businessType = req.businessType
                if (businessType != "store" && businessType != "restaurant") {
                    call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Invalid business type"))
                    return@post
                }

                val saved =
                    configService.updateConfig(
                        existingConfig.copy(businessType = businessType, businessTypeConfirmed = true),
                    )
                if (!saved) {
                    throw InitialSetupException("Failed to update business type")
                }

                call.respond(HttpStatusCode.OK, mapOf("message" to "Business type updated"))
                return@post
            }

            call.respond(HttpStatusCode.Conflict, mapOf("message" to "Initial setup already completed"))
            return@post
        }

        val businessType = req.businessType
        val userName = req.userName?.trim()
        val userPassword = req.userPassword
        val userPin = req.userPin
        val businessName = req.businessName?.trim()
        val businessCurrency = req.businessCurrency

        if (
            businessType != "store" &&
            businessType != "restaurant"
        ) {
            call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Invalid business type"))
            return@post
        }
        if (userName.isNullOrEmpty() || userPassword.isNullOrEmpty() || userPin.isNullOrEmpty()) {
            call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Missing user data"))
            return@post
        }
        if (businessName.isNullOrEmpty() || businessCurrency.isNullOrEmpty()) {
            call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Missing business data"))
            return@post
        }

        val taxId = req.businessTaxId ?: req.businessRFC
        val logoUrl = req.businessLogoUrl ?: req.businessLogo

        val env = call.application.environment
        val rolesService = RolesService(env)
        val usersService = UsersService(env)
        val permissionsService = PermissionsService()
        val currencyService = CurrencyService()

        val currency =
            currencyService.getByAcronym(businessCurrency)
                ?: return@post call.respond(
                    HttpStatusCode.NotFound,
                    mapOf("message" to "Unknown currency acronym: $businessCurrency"),
                )

        val (userId, roleId) =
            transaction {
                val roleId =
                    rolesService.addRole(Role(role = "Admin", password = userPassword, isAdmin = true))
                        ?: throw InitialSetupException("Failed to create admin role")

                permissionsService.assignAllEnabledToRole(roleId)

                val userId =
                    usersService.addUser(User(name = userName, pin = userPin, role = roleId))
                        ?: throw InitialSetupException("Failed to create user")

                val saved =
                    configService.updateConfig(
                        Config(
                            businessType = businessType,
                            businessName = businessName,
                            businessAddress = req.businessAddress,
                            businessPhone = req.businessPhone,
                            businessEmail = req.businessEmail,
                            businessTaxId = taxId,
                            businessLogoUrl = logoUrl,
                            businessTypeConfirmed = true,
                        ),
                    )
                if (!saved) throw InitialSetupException("Failed to save config")

                val currencyId = currency.id ?: throw InitialSetupException("Currency ID missing")
                if (!currencyService.setBaseCurrencyById(currencyId)) {
                    throw InitialSetupException("Failed to set base currency")
                }

                userId to roleId
            }

        call.respond(
            HttpStatusCode.Created,
            mapOf("message" to "Initial setup completed", "userId" to userId, "roleId" to roleId),
        )
    }
}
