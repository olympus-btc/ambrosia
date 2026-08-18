package pos.ambrosia.api

import com.auth0.jwt.JWT
import io.ktor.http.Cookie
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationStopping
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.plugins.origin
import io.ktor.server.request.header
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import kotlinx.io.files.Path
import pos.ambrosia.config.replaceConfFileProperty
import pos.ambrosia.datadir
import pos.ambrosia.logger
import pos.ambrosia.models.IncomingPaymentWithRate
import pos.ambrosia.models.Message
import pos.ambrosia.models.OutgoingPaymentWithRate
import pos.ambrosia.models.RolePassword
import pos.ambrosia.models.UpdateNwcUriRequest
import pos.ambrosia.models.WalletAuthResponse
import pos.ambrosia.models.WalletInvoiceRate
import pos.ambrosia.models.WalletPasswordChangeRequest
import pos.ambrosia.models.phoenix.CloseChannelRequest
import pos.ambrosia.models.phoenix.CreateInvoiceRequest
import pos.ambrosia.models.phoenix.CsvExport
import pos.ambrosia.models.phoenix.DecodeInvoiceRequest
import pos.ambrosia.models.phoenix.PayInvoiceRequest
import pos.ambrosia.models.phoenix.PayOfferRequest
import pos.ambrosia.models.phoenix.PayOnchainRequest
import pos.ambrosia.services.ActiveLightningBackend
import pos.ambrosia.services.AuthService
import pos.ambrosia.services.LightningBackend
import pos.ambrosia.services.NwcService
import pos.ambrosia.services.PaymentService
import pos.ambrosia.services.PhoenixService
import pos.ambrosia.services.RefundService
import pos.ambrosia.services.RolesService
import pos.ambrosia.services.TokenService
import pos.ambrosia.services.WalletAdminNotificationService
import pos.ambrosia.services.WalletRateService
import pos.ambrosia.utils.Bolt11Decoder
import pos.ambrosia.utils.InvalidCredentialsException
import pos.ambrosia.utils.NwcConnectionException
import pos.ambrosia.utils.UnsupportedBackendOperationException
import pos.ambrosia.utils.authenticateAdmin
import pos.ambrosia.utils.getCurrentUser

fun Application.configureWallet() {
    val phoenixService = PhoenixService(environment)
    val walletAdminNotificationService =
        WalletAdminNotificationService(createConfiguredAdminNotificationService(environment))
    val nwcUri = environment.config.propertyOrNull("nwc-uri")?.getString()
    val backend: LightningBackend =
        if (nwcUri != null) {
            NwcService.create(nwcUri, this) { paymentNotification ->
                walletAdminNotificationService.notifyIncomingPaymentReceived(paymentNotification)
            }
        } else {
            phoenixService
        }
    ActiveLightningBackend.set(backend)
    monitor.subscribe(ApplicationStopping) { ActiveLightningBackend.closeActive() }

    val authService = AuthService(environment)
    val tokenService = TokenService(environment)
    val rolesService = RolesService(environment)
    val walletRateService = WalletRateService()
    val paymentService = PaymentService()
    val refundService = RefundService(ActiveLightningBackend)

    routing {
        route("/wallet") {
            wallet(
                tokenService,
                authService,
                rolesService,
                paymentService,
                walletRateService,
                refundService,
                walletAdminNotificationService,
            )
        }
    }
}

fun Route.wallet(
    tokenService: TokenService,
    authService: AuthService,
    rolesService: RolesService,
    paymentService: PaymentService,
    walletRateService: WalletRateService,
    refundService: RefundService,
    walletAdminNotificationService: WalletAdminNotificationService,
) {
    authenticate("auth-jwt") {
        post("/invoice") {
            val createInvoiceRequest = call.receive<CreateInvoiceRequest>()
            val invoice = ActiveLightningBackend.createInvoice(createInvoiceRequest)
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
            val isAuthenticated = authService.authenticateByRole(userInfo.userId, rolePassword.password.toCharArray())
            if (isAuthenticated == true) {
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
            call.getCurrentUser()?.let { userInfo -> tokenService.revokeWalletToken(userInfo.userId) }
            call.response.cookies.append("walletAccessToken", "", maxAge = 0)
            call.respond(HttpStatusCode.OK, mapOf("status" to "ok"))
        }
    }
    authenticate("auth-jwt-wallet") {
        post("/password") {
            val passwordChangeRequest = call.receive<WalletPasswordChangeRequest>()
            if (passwordChangeRequest.currentPassword.isBlank() || passwordChangeRequest.newPassword.isBlank()) {
                call.respond(HttpStatusCode.BadRequest, Message("Current and new passwords are required"))
                return@post
            }
            val actorUserId = call.walletActorUserId() ?: throw InvalidCredentialsException()
            val currentPasswordIsValid =
                authService.authenticateByRole(actorUserId, passwordChangeRequest.currentPassword.toCharArray())
            if (!currentPasswordIsValid) {
                call.respond(HttpStatusCode.Unauthorized, Message("Current password is incorrect"))
                return@post
            }
            val passwordWasUpdated =
                rolesService.updateWalletPasswordForUser(actorUserId, passwordChangeRequest.newPassword.toCharArray())
            if (!passwordWasUpdated) {
                call.respond(HttpStatusCode.BadRequest, Message("Unable to update wallet password"))
                return@post
            }
            call.respond(HttpStatusCode.OK, Message("Wallet password updated"))
        }
        post("/updatenwcuri") {
            val updateNwcUriRequest = call.receive<UpdateNwcUriRequest>()
            val trimmedNwcUri = updateNwcUriRequest.nwcUri.trim()
            if (trimmedNwcUri.isBlank()) {
                call.respond(HttpStatusCode.BadRequest, Message("Missing nwcUri"))
                return@post
            }
            if (!ActiveLightningBackend.isNwcActive()) {
                throw UnsupportedBackendOperationException(
                    message = "Switching Lightning backend providers is not supported yet",
                    code = "provider_switch_not_supported",
                )
            }
            try {
                ActiveLightningBackend.reinitializeNwcBackend(trimmedNwcUri, call.application)
            } catch (exception: Exception) {
                throw NwcConnectionException(code = "nwc_reconfigure_failed")
            }
            replaceConfFileProperty(Path(datadir, "ambrosia.conf"), "nwc-uri", trimmedNwcUri)
            call.respond(HttpStatusCode.OK, Message("NWC backend reconfigured"))
        }
        post("/createinvoice") {
            val createInvoiceRequest = call.receive<CreateInvoiceRequest>()
            val invoice = ActiveLightningBackend.createInvoice(createInvoiceRequest)
            if (createInvoiceRequest.exchangeRate != null && createInvoiceRequest.exchangeRateCurrency != null) {
                walletRateService.saveInvoiceRate(
                    WalletInvoiceRate(
                        paymentHash = invoice.paymentHash,
                        satoshiAmount = createInvoiceRequest.amountSat,
                        exchangeRate = createInvoiceRequest.exchangeRate,
                        exchangeRateCurrency = createInvoiceRequest.exchangeRateCurrency,
                        fiatAmount = createInvoiceRequest.fiatAmount,
                    ),
                )
            }
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
            val payInvoiceRequest = call.receive<PayInvoiceRequest>()
            val actorUserId = call.walletActorUserId()
            val payInvoiceResult =
                try {
                    ActiveLightningBackend.payInvoice(payInvoiceRequest)
                } catch (error: Exception) {
                    walletAdminNotificationService.notifyPaymentFailed(
                        actorUserId,
                        "lightning_invoice",
                        payInvoiceRequest.amountSat,
                        error,
                    )
                    throw error
                }
            if (payInvoiceRequest.exchangeRate != null && payInvoiceRequest.exchangeRateCurrency != null) {
                val fiatAmount =
                    (payInvoiceResult.recipientAmountSat.toDouble() / 100_000_000) * payInvoiceRequest.exchangeRate
                walletRateService.saveInvoiceRate(
                    WalletInvoiceRate(
                        paymentHash = payInvoiceResult.paymentHash,
                        satoshiAmount = payInvoiceResult.recipientAmountSat,
                        exchangeRate = payInvoiceRequest.exchangeRate,
                        exchangeRateCurrency = payInvoiceRequest.exchangeRateCurrency,
                        fiatAmount = fiatAmount,
                    ),
                )
            }
            walletAdminNotificationService.notifyInvoicePaymentSent(actorUserId, payInvoiceRequest, payInvoiceResult)
            call.respond(HttpStatusCode.OK, payInvoiceResult)
        }
        post("/payoffer") {
            val payOfferRequest = call.receive<PayOfferRequest>()
            val actorUserId = call.walletActorUserId()
            val payOfferResult =
                try {
                    ActiveLightningBackend.payOffer(payOfferRequest)
                } catch (error: Exception) {
                    walletAdminNotificationService.notifyPaymentFailed(
                        actorUserId,
                        "bolt12_offer",
                        payOfferRequest.amountSat,
                        error,
                    )
                    throw error
                }
            walletAdminNotificationService.notifyOfferPaymentSent(actorUserId, payOfferRequest, payOfferResult)
            call.respond(HttpStatusCode.OK, payOfferResult)
        }
        post("/payonchain") {
            val payOnchainRequest = call.receive<PayOnchainRequest>()
            val actorUserId = call.walletActorUserId()
            val payOnchainResult =
                try {
                    ActiveLightningBackend.payOnchain(payOnchainRequest)
                } catch (error: Exception) {
                    walletAdminNotificationService.notifyPaymentFailed(
                        actorUserId,
                        "onchain",
                        payOnchainRequest.amountSat,
                        error,
                    )
                    throw error
                }
            walletAdminNotificationService.notifyOnchainPaymentSent(actorUserId, payOnchainRequest, payOnchainResult)
            call.respond(HttpStatusCode.OK, payOnchainResult)
        }
        post("/bumpfee") {
            val actorUserId = call.walletActorUserId()
            val feerateSatByte = call.receive<Int>()
            val bumpOnchainFeesResult = ActiveLightningBackend.bumpOnchainFees(feerateSatByte)
            walletAdminNotificationService.notifyFeesBumped(actorUserId, feerateSatByte.toLong(), bumpOnchainFeesResult)
            call.respond(HttpStatusCode.OK, bumpOnchainFeesResult)
        }
        post("/export") {
            val csvExportRequest = call.receive<CsvExport>()
            val csvExportResult = ActiveLightningBackend.csvExport(csvExportRequest)
            call.respond(HttpStatusCode.OK, csvExportResult)
        }
        get("/getinfo") {
            val nodeInfo = ActiveLightningBackend.getNodeInfo()
            call.respond(HttpStatusCode.OK, nodeInfo)
        }
        get("/getbalance") {
            val balance = ActiveLightningBackend.getBalance()
            call.respond(HttpStatusCode.OK, balance)
        }
        post("/closechannel") {
            val closeChannelRequest = call.receive<CloseChannelRequest>()
            val actorUserId = call.walletActorUserId()
            val closeChannelResult = ActiveLightningBackend.closeChannel(closeChannelRequest)
            walletAdminNotificationService.notifyChannelClosed(actorUserId, closeChannelRequest, closeChannelResult)
            call.respond(HttpStatusCode.OK, closeChannelResult)
        }
        get("/seed") {
            val seed = ActiveLightningBackend.getSeed()
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

                val payments = ActiveLightningBackend.listIncomingPayments(from, to, limit, offset, all, externalId)
                val hashes = payments.map { it.paymentHash }
                val salesPaymentRates = paymentService.getExchangeRatesByPaymentHashes(hashes)
                val walletInvoiceRates = walletRateService.getRatesByPaymentHashes(hashes.filter { it !in salesPaymentRates })
                val bitcoinPaymentDataByHash = salesPaymentRates + walletInvoiceRates
                val refundedHashes = refundService.getRefundedOrderPaymentHashes(hashes)
                val enriched =
                    payments.map { payment ->
                        val bitcoinPaymentData = bitcoinPaymentDataByHash[payment.paymentHash]
                        IncomingPaymentWithRate(
                            type = payment.type,
                            subType = payment.subType,
                            paymentHash = payment.paymentHash,
                            preimage = payment.preimage,
                            externalId = payment.externalId,
                            description = payment.description,
                            invoice = payment.invoice,
                            isPaid = payment.isPaid,
                            isExpired = payment.isExpired,
                            requestedSat = payment.requestedSat,
                            receivedSat = payment.receivedSat,
                            fees = payment.fees,
                            payerKey = payment.payerKey,
                            expiresAt = payment.expiresAt,
                            completedAt = payment.completedAt,
                            createdAt = payment.createdAt,
                            exchangeRateAtPayment = bitcoinPaymentData?.exchangeRateAtPayment,
                            exchangeRateCurrency = bitcoinPaymentData?.exchangeRateCurrency,
                            fiatAmountAtPayment = bitcoinPaymentData?.fiatAmountAtPayment,
                            refunded = payment.paymentHash in refundedHashes,
                        )
                    }
                call.respond(HttpStatusCode.OK, enriched)
            }

            get("/incoming/{paymentHash}") {
                val paymentHash =
                    call.parameters["paymentHash"] ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing paymentHash")
                val payment = ActiveLightningBackend.getIncomingPayment(paymentHash)
                call.respond(HttpStatusCode.OK, payment)
            }

            get("/outgoing") {
                val from = call.request.queryParameters["from"]?.toLongOrNull() ?: 0L
                val to = call.request.queryParameters["to"]?.toLongOrNull()
                val limit = call.request.queryParameters["limit"]?.toIntOrNull() ?: 20
                val offset = call.request.queryParameters["offset"]?.toIntOrNull() ?: 0
                val all = call.request.queryParameters["all"]?.toBoolean() ?: false

                val payments = ActiveLightningBackend.listOutgoingPayments(from, to, limit, offset, all)
                val hashes = payments.mapNotNull { it.paymentHash }
                val salesPaymentRates = paymentService.getExchangeRatesByPaymentHashes(hashes)
                val walletInvoiceRates = walletRateService.getRatesByPaymentHashes(hashes.filter { it !in salesPaymentRates })
                val bitcoinDataByHash = salesPaymentRates + walletInvoiceRates
                val refundedHashes = refundService.getRefundedPaymentHashes(hashes)
                val enriched =
                    payments.map { payment ->
                        val bitcoinData = payment.paymentHash?.let { bitcoinDataByHash[it] }
                        OutgoingPaymentWithRate(
                            type = payment.type,
                            subType = payment.subType,
                            paymentId = payment.paymentId,
                            paymentHash = payment.paymentHash,
                            txId = payment.txId,
                            preimage = payment.preimage,
                            isPaid = payment.isPaid,
                            sent = payment.sent,
                            fees = payment.fees,
                            invoice = payment.invoice,
                            description = payment.description,
                            completedAt = payment.completedAt,
                            createdAt = payment.createdAt,
                            exchangeRateAtPayment = bitcoinData?.exchangeRateAtPayment,
                            exchangeRateCurrency = bitcoinData?.exchangeRateCurrency,
                            fiatAmountAtPayment = bitcoinData?.fiatAmountAtPayment,
                            refunded = payment.paymentHash in refundedHashes,
                        )
                    }
                call.respond(HttpStatusCode.OK, enriched)
            }

            get("/outgoing/{paymentId}") {
                val paymentId =
                    call.parameters["paymentId"] ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing paymentId")
                val payment = ActiveLightningBackend.getOutgoingPayment(paymentId)
                call.respond(HttpStatusCode.OK, payment)
            }

            get("/outgoingbyhash/{paymentHash}") {
                val paymentHash =
                    call.parameters["paymentHash"] ?: return@get call.respond(HttpStatusCode.BadRequest, "Missing paymentHash")
                val payment = ActiveLightningBackend.getOutgoingPaymentByHash(paymentHash)
                call.respond(HttpStatusCode.OK, payment)
            }
        }
    }
}

private fun io.ktor.server.application.ApplicationCall.walletActorUserId(): String? =
    principal<JWTPrincipal>()?.getClaim("userId", String::class)
