package pos.ambrosia.api

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.sql.Connection
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.models.Config
import pos.ambrosia.models.InitialSetupRequest
import pos.ambrosia.models.InitialSetupStatus
import pos.ambrosia.models.Role
import pos.ambrosia.models.User
import pos.ambrosia.services.ConfigService
import pos.ambrosia.services.PermissionsService
import pos.ambrosia.services.RolesService
import pos.ambrosia.services.UsersService
import pos.ambrosia.services.CurrencyService
import pos.ambrosia.logger

fun Application.configureInitialSetup() {
  val connection: Connection = DatabaseConnection.getConnection()
  routing {
    route("/initial-setup") { initialSetupRoutes(connection) }
  }
}

private fun Route.initialSetupRoutes(connection: Connection) {
  get("") {
    val configService = ConfigService(connection)
    val config = configService.getConfig()
    val needsBusinessType = config != null && !config.businessTypeConfirmed
    call.respond(
      HttpStatusCode.OK,
      InitialSetupStatus(initialized = config != null, needsBusinessType = needsBusinessType),
    )
  }

  post("") {
    val req = call.receive<InitialSetupRequest>()

    val configService = ConfigService(connection)
    val existingConfig = configService.getConfig()
    if (existingConfig != null) {
      if (!existingConfig.businessTypeConfirmed) {
        val businessType = req.businessType
        if (businessType != "store" && businessType != "restaurant") {
          call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Invalid business type"))
          return@post
        }

        val saved = configService.updateConfig(
          existingConfig.copy(businessType = businessType, businessTypeConfirmed = true),
        )
        if (!saved) {
          call.respond(HttpStatusCode.InternalServerError, mapOf("message" to "Failed to update business type"))
          return@post
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
    val rolesService = RolesService(env, connection)
    val usersService = UsersService(env, connection)
    val permissionsService = PermissionsService(env, connection)
    val currencyService = CurrencyService(connection)

    val currency = currencyService.getByAcronym(businessCurrency)
    if (currency == null) {
      call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Unknown currency acronym: ${businessCurrency}"))
      return@post
    }
    

    try {
      connection.autoCommit = false

      val roleId = rolesService.addRole(Role(role = "Admin", password = userPassword, isAdmin = true))
        ?: throw IllegalStateException("Failed to create admin role")

      permissionsService.assignAllEnabledToRole(roleId)

      val userId = usersService.addUser(User(name = userName, pin = userPin, role = roleId))
        ?: throw IllegalStateException("Failed to create user")

      val saved = configService.updateConfig(
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
      if (!saved) throw IllegalStateException("Failed to save config")

      if (!currencyService.setBaseCurrencyById(currency.id!!)) {
        throw IllegalStateException("Failed to set base currency")
      }

      connection.autoCommit = false
      connection.commit()
      call.respond(HttpStatusCode.Created, mapOf("message" to "Initial setup completed", "userId" to userId, "roleId" to roleId))
    } catch (e: Exception) {
      logger.error("Initial setup failed: ${e.message}")
      try { connection.rollback() } catch (_: Exception) {}
      call.respond(HttpStatusCode.InternalServerError, mapOf("message" to (e.message ?: "Setup failed")))
    } finally {
      try { connection.autoCommit = true } catch (_: Exception) {}
    }
  }
}
