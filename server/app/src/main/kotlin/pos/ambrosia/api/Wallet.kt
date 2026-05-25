package pos.ambrosia.api

import com.auth0.jwt.JWT
import io.ktor.http.Cookie
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationStopping
import io.ktor.server.auth.authenticate
import io.ktor.server.plugins.origin
import io.ktor.server.request.header
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.logger
import pos.ambrosia.models.RolePassword
import pos.ambrosia.models.WalletAuthResponse
import pos.ambrosia.models.phoenix.CloseChannelRequest
import pos.ambrosia.models.phoenix.CreateInvoiceRequest
import pos.ambrosia.models.phoenix.CsvExport
import pos.ambrosia.models.phoenix.DecodeInvoiceRequest
import pos.ambrosia.models.phoenix.PayInvoiceRequest
import pos.ambrosia.models.phoenix.PayOfferRequest
import pos.ambrosia.models.phoenix.PayOnchainRequest
import pos.ambrosia.services.AuthService
import pos.ambrosia.services.LightningBackend
import pos.ambrosia.services.NwcService
import pos.ambrosia.services.PhoenixService
import pos.ambrosia.services.TokenService
import pos.ambrosia.utils.Bolt11Decoder
import pos.ambrosia.utils.InvalidCredentialsException
import pos.ambrosia.utils.authenticateAdmin
import pos.ambrosia.utils.getCurrentUser
import java.sql.Connection
import java.util.concurrent.atomic.AtomicReference

private val walletBackendRef = AtomicReference<LightningBackend?>(null)

private fun getBackend(): LightningBackend = walletBackendRef.get() ?: error("Lightning backend not initialized")

fun Application.configureWallet() {
    val connection: Connection = DatabaseConnection.getConnection()
    val nwcUri = environment.config.propertyOrNull("nwc-uri")?.getString()
    val backend: LightningBackend =
        if (nwcUri != null) {
            NwcService.create(nwcUri, this)
        } else {
            PhoenixService(environment)
        }
    walletBackendRef.set(backend)
    monitor.subscribe(ApplicationStopping) {
        walletBackendRef
            .getAndSet(null)
            ?.runCatching { close() }
            ?.onFailure { logger.warn("Error closing Lightning backend on shutdown: {}", it.message) }
    }
    val authService = AuthService(environment, connection)
    val tokenService = TokenService(environment, connection)

    routing { route("/wallet") { wallet(tokenService, authService) } }
}

internal fun reinitializeNwcBackend(
    nwcUri: String,
    application: Application,
) {
    val newBackend = NwcService.create(nwcUri, application)
    val previous = walletBackendRef.getAndSet(newBackend)
    previous
        ?.runCatching { close() }
        ?.onFailure { logger.warn("Error closing previous Lightning backend: {}", it.message) }
    logger.info("NWC backend hot-reloaded — no restart required")
}

fun Route.wallet(
    tokenService: TokenService,
    authService: AuthService,
) {
    authenticate("auth-jwt") {
        post("/invoice") {
            val request = call.receive<CreateInvoiceRequest>()
            val invoice = getBackend().createInvoice(request)
            call.respond(HttpStatusCode.OK, invoice)
        }
    }
    authenticateAdmin {
        post("/auth") {
            val isSecureRequest =
                call.request.origin.scheme == "https" ||
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
                        extensions = mapOf("SameSite" to "Strict"),
                    ),
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
        post("/createinvoice") {
            val request = call.receive<CreateInvoiceRequest>()
            val invoice = getBackend().createInvoice(request)
            call.respond(HttpStatusCode.OK, invoice)
        }
        post("/decodeinvoice") {
            val decodeInvoiceRequest = call.receive<DecodeInvoiceRequest>()
            val decodedInvoice = Bolt11Decoder.decodeInvoice(decodeInvoiceRequest.invoice)
            if (decodedInvoice != null) {
                call.respond(
                    HttpStatusCode.OK,
                    pos.ambrosia.models.phoenix.DecodedInvoiceResponse(
                        amountSat = decodedInvoice.amountSat,
                        description = decodedInvoice.description,
                    ),
                )
            } else {
                call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Could not decode invoice"))
            }
        }
        post("/payinvoice") {
            val request = call.receive<PayInvoiceRequest>()
            val result = getBackend().payInvoice(request)
            call.respond(HttpStatusCode.OK, result)
        }
        post("/payoffer") {
            val request = call.receive<PayOfferRequest>()
            val result = getBackend().payOffer(request)
            call.respond(HttpStatusCode.OK, result)
        }
        post("/payonchain") {
            val request = call.receive<PayOnchainRequest>()
            val result = getBackend().payOnchain(request)
            call.respond(HttpStatusCode.OK, result)
        }
        post("/bumpfee") {
            val feerateSatByte = call.receive<Int>()
            val result = getBackend().bumpOnchainFees(feerateSatByte)
            call.respond(HttpStatusCode.OK, result)
        }
        post("/export") {
            val request = call.receive<CsvExport>()
            val result = getBackend().csvExport(request)
            call.respond(HttpStatusCode.OK, result)
        }
        // Get wallet/node info
        get("/getinfo") {
            val nodeInfo = getBackend().getNodeInfo()
            call.respond(HttpStatusCode.OK, nodeInfo)
        }
        // Get wallet balance
        get("/getbalance") {
            val balance = getBackend().getBalance()
            call.respond(HttpStatusCode.OK, balance)
        }
        post("/closechannel") {
            val request = call.receive<CloseChannelRequest>()
            val result = getBackend().closeChannel(request)
            call.respond(HttpStatusCode.OK, result)
        }
        get("/seed") {
            val seed = getBackend().getSeed()
            call.respond(HttpStatusCode.OK, seed)
        }

        route("/payments") {
            get("/incoming") {
                val from = call.request.queryParameters["from"]?.toLongOrNull() ?: 0L
                val to = call.request.queryParameters["to"]?.toLongOrNull()
                val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                val offset = call.request.queryParameters["offset"]?.toIntOrNull() ?: 0
                val all = call.request.queryParameters["all"]?.toBoolean() ?: false
                val externalId = call.request.queryParameters["externalId"]

                val payments = getBackend().listIncomingPayments(from, to, limit, offset, all, externalId)
                call.respond(HttpStatusCode.OK, payments)
            }

            get("/incoming/{paymentHash}") {
                val paymentHash =
                    call.parameters["paymentHash"] ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing paymentHash")
                val payment = getBackend().getIncomingPayment(paymentHash)
                call.respond(HttpStatusCode.OK, payment)
            }

            get("/outgoing") {
                val from = call.request.queryParameters["from"]?.toLongOrNull() ?: 0L
                val to = call.request.queryParameters["to"]?.toLongOrNull()
                val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                val offset = call.request.queryParameters["offset"]?.toIntOrNull() ?: 0
                val all = call.request.queryParameters["all"]?.toBoolean() ?: false

                val payments = getBackend().listOutgoingPayments(from, to, limit, offset, all)
                call.respond(HttpStatusCode.OK, payments)
            }

            get("/outgoing/{paymentId}") {
                val paymentId =
                    call.parameters["paymentId"] ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing paymentId")
                val payment = getBackend().getOutgoingPayment(paymentId)
                call.respond(HttpStatusCode.OK, payment)
            }

            get("/outgoingbyhash/{paymentHash}") {
                val paymentHash =
                    call.parameters["paymentHash"] ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing paymentHash")
                val payment = getBackend().getOutgoingPaymentByHash(paymentHash)
                call.respond(HttpStatusCode.OK, payment)
            }
        }
    }
}
