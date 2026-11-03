package pos.ambrosia

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.auth.HttpAuthHeader
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.auth.Authentication
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.jwt.jwt
import io.ktor.server.plugins.bodylimit.RequestBodyLimit
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.cors.routing.CORS
import io.ktor.server.plugins.defaultheaders.DefaultHeaders
import io.ktor.server.plugins.origin
import io.ktor.server.plugins.ratelimit.RateLimit
import io.ktor.server.request.path
import io.ktor.server.websocket.WebSockets
import io.ktor.server.websocket.pingPeriod
import io.ktor.server.websocket.timeout
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.slf4j.LoggerFactory
import pos.ambrosia.api.configureAdminNotifications
import pos.ambrosia.api.configureAdminNotificationsWebsocket
import pos.ambrosia.api.configureAuth
import pos.ambrosia.api.configureBackup
import pos.ambrosia.api.configureBackupProgressWebsocket
import pos.ambrosia.api.configureCategories
import pos.ambrosia.api.configureCheckout
import pos.ambrosia.api.configureClients
import pos.ambrosia.api.configureConfig
import pos.ambrosia.api.configureCurrency
import pos.ambrosia.api.configureDishes
import pos.ambrosia.api.configureFreelanceInvoices
import pos.ambrosia.api.configureFreelanceReports
import pos.ambrosia.api.configureHealth
import pos.ambrosia.api.configureIngredients
import pos.ambrosia.api.configureInitialSetup
import pos.ambrosia.api.configureOrders
import pos.ambrosia.api.configurePaymentWebsocket
import pos.ambrosia.api.configurePayments
import pos.ambrosia.api.configurePayoutAccounts
import pos.ambrosia.api.configurePermissions
import pos.ambrosia.api.configurePhoenixWebhook
import pos.ambrosia.api.configurePrinters
import pos.ambrosia.api.configureProductVariants
import pos.ambrosia.api.configureProducts
import pos.ambrosia.api.configureProjects
import pos.ambrosia.api.configureReports
import pos.ambrosia.api.configureRoles
import pos.ambrosia.api.configureRouting
import pos.ambrosia.api.configureSecrets
import pos.ambrosia.api.configureShifts
import pos.ambrosia.api.configureSpaces
import pos.ambrosia.api.configureStoreOrders
import pos.ambrosia.api.configureSuppliers
import pos.ambrosia.api.configureSystem
import pos.ambrosia.api.configureTables
import pos.ambrosia.api.configureTasks
import pos.ambrosia.api.configureTicketTemplates
import pos.ambrosia.api.configureTickets
import pos.ambrosia.api.configureTimeEntries
import pos.ambrosia.api.configureUploads
import pos.ambrosia.api.configureUsers
import pos.ambrosia.api.configureWallet
import pos.ambrosia.api.handler
import pos.ambrosia.config.AppConfig
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.db.tables.InvoiceEntity
import pos.ambrosia.db.tables.PayoutAccountEntity
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.services.AdminNotificationService
import pos.ambrosia.services.TokenService
import pos.ambrosia.utils.SecretsCipher
import pos.ambrosia.utils.UnauthorizedApiException
import javax.crypto.spec.SecretKeySpec
import kotlin.time.Duration.Companion.seconds

public val logger = LoggerFactory.getLogger("Server")

class Api {
    fun Application.module() {
        AppConfig.loadConfig()
        if (pendingDataImportWasApplied) {
            configurePendingImportCleanup()
        }
        configureUserPiiEncryptionBackfill()
        configurePayoutAccountPiiEncryptionBackfill()
        configureInvoicePayoutSnapshotEncryptionBackfill()
        handler()
        install(ContentNegotiation) { json() }
        configureCors()
        install(DefaultHeaders) {
            header("X-Content-Type-Options", "nosniff")
            header("X-Frame-Options", "DENY")
            header("Referrer-Policy", "strict-origin-when-cross-origin")
            header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        }
        install(WebSockets) {
            pingPeriod = 30.seconds
            timeout = 15.seconds
        }
        configureRateLimit()
        install(RequestBodyLimit) {
            bodyLimit { call -> requestBodyLimitFor(call.request.path()) }
        }
        configureAuthentication()
        configureRouting()
        configureAuth()
        configureAdminNotifications()
        configureAdminNotificationsWebsocket()
        configureUsers()
        configureRoles()
        configurePermissions()
        configureDishes()
        configureUploads()
        configureSpaces()
        configureTables()
        configureIngredients()
        configureSuppliers()
        configureOrders()
        configurePayments()
        configureTickets()
        configureReports()
        configureShifts()
        configureWallet()
        configureSecrets()
        configureBackup()
        configureBackupProgressWebsocket()
        configurePrinters()
        configureConfig()
        configureTicketTemplates()
        configureProducts()
        configureProductVariants()
        configureStoreOrders()
        configureCheckout()
        configureCategories()
        configureClients()
        configurePayoutAccounts()
        configureProjects()
        configureTasks()
        configureFreelanceInvoices()
        configureCurrency()
        configureTimeEntries()
        configureFreelanceReports()
        configureInitialSetup()
        if (environment.config.propertyOrNull("nwc-uri") == null) {
            configurePhoenixWebhook()
        }
        configurePaymentWebsocket()
        configureHealth()
        configureSystem()
    }
}

fun Application.configureRateLimit() {
    val requestsPerMinute =
        environment.config
            .property("rate-limit.requestsPerMinute")
            .getString()
            .toInt()
    install(RateLimit) {
        global {
            rateLimiter(limit = requestsPerMinute, refillPeriod = 60.seconds)
            requestKey { call -> call.request.origin.remoteAddress }
        }
    }
}

fun Application.configureCors() {
    install(CORS) {
        allowCredentials = true
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Authorization)
    }
}

internal const val DEFAULT_MAX_REQUEST_BODY_BYTES = 2L * 1024 * 1024
internal const val UPLOAD_MAX_REQUEST_BODY_BYTES = 20L * 1024 * 1024
internal const val BACKUP_IMPORT_MAX_REQUEST_BODY_BYTES = 1024L * 1024 * 1024

internal fun requestBodyLimitFor(path: String): Long =
    when (path) {
        "/uploads" -> UPLOAD_MAX_REQUEST_BODY_BYTES
        "/backup/import" -> BACKUP_IMPORT_MAX_REQUEST_BODY_BYTES
        else -> DEFAULT_MAX_REQUEST_BODY_BYTES
    }

fun Application.configureAuthentication() {
    val applicationConfig = environment.config

    install(Authentication) {
        jwt("auth-jwt") {
            authHeader { call ->
                try {
                    val accessToken = call.request.cookies["accessToken"]
                    if (accessToken != null) {
                        HttpAuthHeader.Single("Bearer", accessToken)
                    } else {
                        null
                    }
                } catch (cause: Throwable) {
                    null
                }
            }
            verifier(
                JWT
                    .require(Algorithm.HMAC256(applicationConfig.property("secret").getString()))
                    .withIssuer(applicationConfig.property("jwt.issuer").getString())
                    .withAudience(applicationConfig.property("jwt.audience").getString())
                    .withClaim("realm", "Ambrosia-Server")
                    .build(),
            )
            validate { credential ->
                if (credential.payload.getClaim("userId").asString() != "") {
                    JWTPrincipal(credential.payload)
                } else {
                    null
                }
            }
            challenge { _, _ -> throw UnauthorizedApiException() }
        }

        jwt("auth-jwt-wallet") {
            authHeader { call ->
                try {
                    val walletAccessToken = call.request.cookies["walletAccessToken"]
                    if (walletAccessToken != null) {
                        HttpAuthHeader.Single("Bearer", walletAccessToken)
                    } else {
                        null
                    }
                } catch (cause: Throwable) {
                    null
                }
            }
            verifier(
                JWT
                    .require(Algorithm.HMAC256(applicationConfig.property("secret").getString()))
                    .withIssuer(applicationConfig.property("jwt.issuer").getString())
                    .withAudience(applicationConfig.property("jwt.audience").getString())
                    .withClaim("realm", "Ambrosia-Server")
                    .build(),
            )
            validate { credential ->
                val scope = credential.payload.getClaim("scope").asString()
                val userId = credential.payload.getClaim("userId").asString()
                val walletAccessToken = request.cookies["walletAccessToken"]
                val tokenService = TokenService(application.environment)
                val isValidWalletSession =
                    scope == "wallet_access" &&
                        userId.isNotEmpty() &&
                        walletAccessToken != null &&
                        tokenService.isWalletTokenValid(userId, walletAccessToken)
                if (isValidWalletSession) JWTPrincipal(credential.payload) else null
            }
        }
    }
}

fun Application.configurePendingImportCleanup() {
    val tokenService = TokenService(environment)
    tokenService.revokeAllRefreshTokens()
    tokenService.revokeAllWalletTokens()
    AdminNotificationService().revokeAllPushSubscriptions()
    logger.info("Cleared device sessions and push subscriptions after a data import")
}

private fun Application.piiFieldEncryptionKey(): SecretKeySpec =
    SecretsCipher.deriveFieldEncryptionKey(environment.config.property("secret").getString())

fun Application.configureUserPiiEncryptionBackfill() {
    val fieldEncryptionKey = piiFieldEncryptionKey()

    transaction {
        UserEntity.all().forEach { user ->
            user.email?.let { storedEmail ->
                if (!isAlreadyEncrypted(storedEmail, fieldEncryptionKey)) {
                    user.email = SecretsCipher.encrypt(storedEmail, fieldEncryptionKey)
                }
            }
            user.phone?.let { storedPhone ->
                if (!isAlreadyEncrypted(storedPhone, fieldEncryptionKey)) {
                    user.phone = SecretsCipher.encrypt(storedPhone, fieldEncryptionKey)
                }
            }
        }
    }
}

fun Application.configurePayoutAccountPiiEncryptionBackfill() {
    val fieldEncryptionKey = piiFieldEncryptionKey()

    transaction {
        PayoutAccountEntity.all().forEach { payoutAccount ->
            payoutAccount.accountHolder?.let { storedAccountHolder ->
                if (!isAlreadyEncrypted(storedAccountHolder, fieldEncryptionKey)) {
                    payoutAccount.accountHolder = SecretsCipher.encrypt(storedAccountHolder, fieldEncryptionKey)
                }
            }
            payoutAccount.bankName?.let { storedBankName ->
                if (!isAlreadyEncrypted(storedBankName, fieldEncryptionKey)) {
                    payoutAccount.bankName = SecretsCipher.encrypt(storedBankName, fieldEncryptionKey)
                }
            }
            payoutAccount.accountNumber?.let { storedAccountNumber ->
                if (!isAlreadyEncrypted(storedAccountNumber, fieldEncryptionKey)) {
                    payoutAccount.accountNumber = SecretsCipher.encrypt(storedAccountNumber, fieldEncryptionKey)
                }
            }
            payoutAccount.swift?.let { storedSwift ->
                if (!isAlreadyEncrypted(storedSwift, fieldEncryptionKey)) {
                    payoutAccount.swift = SecretsCipher.encrypt(storedSwift, fieldEncryptionKey)
                }
            }
            payoutAccount.iban?.let { storedIban ->
                if (!isAlreadyEncrypted(storedIban, fieldEncryptionKey)) {
                    payoutAccount.iban = SecretsCipher.encrypt(storedIban, fieldEncryptionKey)
                }
            }
            payoutAccount.clabe?.let { storedClabe ->
                if (!isAlreadyEncrypted(storedClabe, fieldEncryptionKey)) {
                    payoutAccount.clabe = SecretsCipher.encrypt(storedClabe, fieldEncryptionKey)
                }
            }
            payoutAccount.lightningAddress?.let { storedLightningAddress ->
                if (!isAlreadyEncrypted(storedLightningAddress, fieldEncryptionKey)) {
                    payoutAccount.lightningAddress = SecretsCipher.encrypt(storedLightningAddress, fieldEncryptionKey)
                }
            }
        }
    }
}

fun Application.configureInvoicePayoutSnapshotEncryptionBackfill() {
    val fieldEncryptionKey = piiFieldEncryptionKey()

    transaction {
        InvoiceEntity.all().forEach { invoice ->
            invoice.payoutSnapshot?.let { storedPayoutSnapshot ->
                if (!isAlreadyEncrypted(storedPayoutSnapshot, fieldEncryptionKey)) {
                    invoice.payoutSnapshot = SecretsCipher.encrypt(storedPayoutSnapshot, fieldEncryptionKey)
                }
            }
        }
    }
}

private fun isAlreadyEncrypted(
    storedValue: String,
    fieldEncryptionKey: SecretKeySpec,
): Boolean = runCatching { SecretsCipher.decrypt(storedValue, fieldEncryptionKey) }.isSuccess
