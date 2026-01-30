package pos.ambrosia.api

import com.auth0.jwt.JWT
import io.ktor.http.*
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.plugins.origin
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.util.date.GMTDate
import java.sql.Connection
import pos.ambrosia.utils.InvalidCredentialsException
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.models.Phoenix.CreateInvoiceRequest
import pos.ambrosia.models.Phoenix.PayInvoiceRequest
import pos.ambrosia.models.Phoenix.PayOfferRequest
import pos.ambrosia.models.Phoenix.PayOnchainRequest
import pos.ambrosia.models.Phoenix.CloseChannelRequest
import pos.ambrosia.services.PhoenixService
import pos.ambrosia.services.AuthService
import pos.ambrosia.services.TokenService
import pos.ambrosia.utils.authenticateAdmin
import pos.ambrosia.utils.getCurrentUser
import pos.ambrosia.models.RolePassword
import pos.ambrosia.models.WalletAuthResponse

fun Application.configureWallet() {
  val connection: Connection = DatabaseConnection.getConnection()
  val phoenixService = PhoenixService(environment)
  val authService = AuthService(environment, connection)
  val tokenService = TokenService(environment, connection)

  routing { route("/wallet") { wallet(phoenixService, tokenService, authService) } }
}

fun Route.wallet(phoenixService: PhoenixService, tokenService: TokenService, authService: AuthService) {
  authenticate("auth-jwt") {
    post("/createinvoice") {
      val request = call.receive<CreateInvoiceRequest>()
      val invoice = phoenixService.createInvoice(request)
      call.respond(HttpStatusCode.OK, invoice)
    }
  }
  authenticateAdmin {
    post("/auth") {
      val isSecureRequest = call.request.origin.scheme == "https" ||
        call.request.header("X-Forwarded-Proto") == "https"
      val rolePassword = call.receive<RolePassword>()
      val userInfo = call.getCurrentUser() ?: throw InvalidCredentialsException()
      val result = authService.authenticateByRole(userInfo.userId, rolePassword.password.toCharArray())
      if (result == true) {
        val token = tokenService.generateWalletAccessToken(userInfo.userId)
        val decoded = JWT.decode(token)
        val expiresAt = decoded.expiresAt?.time ?: System.currentTimeMillis()
        call.response.cookies.append(
          Cookie(
            name = "walletAccessToken", 
            value = token, 
            httpOnly = true, 
            secure = isSecureRequest, 
            path = "/",
            expires = GMTDate(expiresAt)
          )
        )
        call.respond(HttpStatusCode.OK, WalletAuthResponse("Login successful", expiresAt))
      } else {
        call.respond(HttpStatusCode.Unauthorized)
      }
    }
    post("/logout") {
      call.response.cookies.append("walletAccessToken", "", maxAge = 0)
      call.respond(HttpStatusCode.OK, mapOf("status" to "ok"))
    }
  }
  authenticate("auth-jwt-wallet") {
    // Get wallet/node info
    get("/getinfo") {
      val nodeInfo = phoenixService.getNodeInfo()
      call.respond(HttpStatusCode.OK, nodeInfo)
    }
    // Get wallet balance
    get("/getbalance") {
      val balance = phoenixService.getBalance()
      call.respond(HttpStatusCode.OK, balance)
    }
    get("/seed") {
      val seed = phoenixService.getSeed()
      call.respond(HttpStatusCode.OK, seed)
    }
    post("/payinvoice") {
      val request = call.receive<PayInvoiceRequest>()
      val result = phoenixService.payInvoice(request)
      call.respond(HttpStatusCode.OK, result)
    }
    post("/payoffer") {
      val request = call.receive<PayOfferRequest>()
      val result = phoenixService.payOffer(request)
      call.respond(HttpStatusCode.OK, result)
    }
    post("/payonchain") {
      val request = call.receive<PayOnchainRequest>()
      val result = phoenixService.payOnchain(request)
      call.respond(HttpStatusCode.OK, result)
    }
    post("/bumpfee") {
      val feerateSatByte = call.receive<Int>()
      val result = phoenixService.bumpOnchainFees(feerateSatByte)
      call.respond(HttpStatusCode.OK, result)
    }
    post("/closechannel") {
      val request = call.receive<CloseChannelRequest>()
      val result = phoenixService.closeChannel(request)
      call.respond(HttpStatusCode.OK, result)
    }
    // Payments endpoints
    route("/payments") {
      // List incoming payments
      get("/incoming") {
        val from = call.request.queryParameters["from"]?.toLongOrNull() ?: 0L
        val to = call.request.queryParameters["to"]?.toLongOrNull()
        val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
        val offset = call.request.queryParameters["offset"]?.toIntOrNull() ?: 0
        val all = call.request.queryParameters["all"]?.toBoolean() ?: false
        val externalId = call.request.queryParameters["externalId"]

        val payments = phoenixService.listIncomingPayments(from, to, limit, offset, all, externalId)
        call.respond(HttpStatusCode.OK, payments)
      }

      // Get specific incoming payment
      get("/incoming/{paymentHash}") {
        val paymentHash =
          call.parameters["paymentHash"] ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing paymentHash")
        val payment = phoenixService.getIncomingPayment(paymentHash)
        call.respond(HttpStatusCode.OK, payment)
      }

      // List outgoing payments
      get("/outgoing") {
        val from = call.request.queryParameters["from"]?.toLongOrNull() ?: 0L
        val to = call.request.queryParameters["to"]?.toLongOrNull()
        val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
        val offset = call.request.queryParameters["offset"]?.toIntOrNull() ?: 0
        val all = call.request.queryParameters["all"]?.toBoolean() ?: false

        val payments = phoenixService.listOutgoingPayments(from, to, limit, offset, all)
        call.respond(HttpStatusCode.OK, payments)
      }

      // Get specific outgoing payment by ID
      get("/outgoing/{paymentId}") {
        val paymentId =
          call.parameters["paymentId"] ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing paymentId")
        val payment = phoenixService.getOutgoingPayment(paymentId)
        call.respond(HttpStatusCode.OK, payment)
      }

      // Get specific outgoing payment by hash
      get("/outgoingbyhash/{paymentHash}") {
        val paymentHash =
          call.parameters["paymentHash"] ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing paymentHash")
        val payment = phoenixService.getOutgoingPaymentByHash(paymentHash)
        call.respond(HttpStatusCode.OK, payment)
      }
    }
  }
}
