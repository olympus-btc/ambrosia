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
import pos.ambrosia.datadir
import pos.ambrosia.logger
import pos.ambrosia.models.Config
import pos.ambrosia.models.InitialSetupRequest
import pos.ambrosia.models.InitialSetupResponse
import pos.ambrosia.models.InitialSetupStatus
import pos.ambrosia.models.Role
import pos.ambrosia.models.User
import pos.ambrosia.services.ActiveLightningBackend
import pos.ambrosia.services.ConfigService
import pos.ambrosia.services.CurrencyService
import pos.ambrosia.services.PermissionsService
import pos.ambrosia.services.RolesService
import pos.ambrosia.services.UsersService
import pos.ambrosia.services.WalletAdminNotificationService
import pos.ambrosia.utils.InitialSetupException
import java.io.File
import java.time.ZoneId

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
        val initialSetupRequest = call.receive<InitialSetupRequest>()

        val configService = ConfigService()
        val existingConfig = configService.getConfig()
        if (existingConfig != null) {
            if (!existingConfig.businessTypeConfirmed) {
                val businessType = initialSetupRequest.businessType
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

        val businessType = initialSetupRequest.businessType
        val userName = initialSetupRequest.userName?.trim()
        val userPassword = initialSetupRequest.userPassword
        val userPin = initialSetupRequest.userPin
        val businessName = initialSetupRequest.businessName?.trim()
        val businessCurrency = initialSetupRequest.businessCurrency
        val timezone = initialSetupRequest.timezone

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
        if (businessName.isNullOrEmpty() || businessCurrency.isNullOrEmpty() || timezone.isNullOrEmpty()) {
            call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Missing business data"))
            return@post
        }
        if (timezone !in ZoneId.getAvailableZoneIds()) {
            call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Invalid timezone: $timezone"))
            return@post
        }

        val taxId = initialSetupRequest.businessTaxId ?: initialSetupRequest.businessRFC
        val logoUrl = initialSetupRequest.businessLogoUrl ?: initialSetupRequest.businessLogo

        val applicationEnvironment = call.application.environment
        val rolesService = RolesService(applicationEnvironment)
        val usersService = UsersService(applicationEnvironment)
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
                            businessAddress = initialSetupRequest.businessAddress,
                            businessPhone = initialSetupRequest.businessPhone,
                            businessEmail = initialSetupRequest.businessEmail,
                            businessTaxId = taxId,
                            businessLogoUrl = logoUrl,
                            businessTypeConfirmed = true,
                            timezone = timezone,
                        ),
                    )
                if (!saved) throw InitialSetupException("Failed to save config")

                val currencyId = currency.id ?: throw InitialSetupException("Currency ID missing")
                if (!currencyService.setBaseCurrencyById(currencyId)) {
                    throw InitialSetupException("Failed to set base currency")
                }

                userId to roleId
            }

        val nwcSaved =
            initialSetupRequest.nwcUri?.takeIf { it.isNotBlank() }?.let { uri ->
                try {
                    File(datadir.toString(), "ambrosia.conf").appendText("\nnwc-uri=$uri\n")
                    logger.info("NWC URI saved to ambrosia.conf — hot-reloading backend")
                    val walletAdminNotificationService =
                        WalletAdminNotificationService(createConfiguredAdminNotificationService(call.application.environment))
                    ActiveLightningBackend.reinitializeNwcBackend(uri, call.application) { paymentNotification ->
                        walletAdminNotificationService.notifyIncomingPaymentReceived(paymentNotification)
                    }
                    true
                } catch (exception: Exception) {
                    logger.error("Failed to save or activate NWC URI: ${exception.message}")
                    false
                }
            } ?: false

        call.respond(
            HttpStatusCode.Created,
            InitialSetupResponse(
                message = "Initial setup completed",
                userId = userId,
                roleId = roleId,
                nwcSaved = nwcSaved,
            ),
        )
    }
}
