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
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.cors.routing.CORS
import io.ktor.server.plugins.origin
import io.ktor.server.websocket.WebSockets
import io.ktor.server.websocket.pingPeriod
import io.ktor.server.websocket.timeout
import org.slf4j.LoggerFactory
import pos.ambrosia.api.configureAuth
import pos.ambrosia.api.configureCategories
import pos.ambrosia.api.configureConfig
import pos.ambrosia.api.configureCurrency
import pos.ambrosia.api.configureDishes
import pos.ambrosia.api.configureHealth
import pos.ambrosia.api.configureIngredients
import pos.ambrosia.api.configureInitialSetup
import pos.ambrosia.api.configureOrders
import pos.ambrosia.api.configurePaymentWebsocket
import pos.ambrosia.api.configurePayments
import pos.ambrosia.api.configurePermissions
import pos.ambrosia.api.configurePhoenixWebhook
import pos.ambrosia.api.configurePrinters
import pos.ambrosia.api.configureProducts
import pos.ambrosia.api.configureRoles
import pos.ambrosia.api.configureRouting
import pos.ambrosia.api.configureShifts
import pos.ambrosia.api.configureSpaces
import pos.ambrosia.api.configureStoreOrders
import pos.ambrosia.api.configureSuppliers
import pos.ambrosia.api.configureTables
import pos.ambrosia.api.configureTicketTemplates
import pos.ambrosia.api.configureTickets
import pos.ambrosia.api.configureUploads
import pos.ambrosia.api.configureUsers
import pos.ambrosia.api.configureWallet
import pos.ambrosia.api.handler
import pos.ambrosia.config.AppConfig
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.utils.UnauthorizedApiException
import kotlin.time.Duration.Companion.seconds

public val logger = LoggerFactory.getLogger("Server")

class Api {
    fun Application.module() {
        AppConfig.loadConfig() // Load the configuration
        val config = environment.config // Configure the application
        handler() // Install exception handlers
        install(ContentNegotiation) { json() }
        install(CORS) {
            allowCredentials = true
            anyHost()
            allowMethod(HttpMethod.Put)
            allowMethod(HttpMethod.Delete)
            allowHeader(HttpHeaders.ContentType)
            allowHeader(HttpHeaders.Authorization)
        }
        install(WebSockets) {
            pingPeriod = 30.seconds
            timeout = 15.seconds
        }

        install(Authentication) {
            jwt("auth-jwt") {
                // Configurar para leer el token desde cookies
                authHeader { call ->
                    try {
                        val token = call.request.cookies["accessToken"]
                        if (token != null) {
                            HttpAuthHeader.Single("Bearer", token)
                        } else {
                            null
                        }
                    } catch (cause: Throwable) {
                        null
                    }
                }
                verifier(
                    JWT
                        .require(Algorithm.HMAC256(config.property("secret").getString()))
                        .withIssuer(config.property("jwt.issuer").getString())
                        .withAudience(config.property("jwt.audience").getString())
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
                        val token = call.request.cookies["walletAccessToken"]
                        if (token != null) {
                            HttpAuthHeader.Single("Bearer", token)
                        } else {
                            null
                        }
                    } catch (cause: Throwable) {
                        null
                    }
                }
                verifier(
                    JWT
                        .require(Algorithm.HMAC256(config.property("secret").getString()))
                        .withIssuer(config.property("jwt.issuer").getString())
                        .withAudience(config.property("jwt.audience").getString())
                        .withClaim("realm", "Ambrosia-Server")
                        .build(),
                )
                validate { credential ->
                    if (credential.payload.getClaim("scope").asString() == "wallet_access") {
                        JWTPrincipal(credential.payload)
                    } else {
                        null
                    }
                }
            }
        }
        configureRouting()
        configureAuth()
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
        configureShifts()
        configureWallet()
        configurePrinters()
        configureConfig()
        configureTicketTemplates()
        configureProducts()
        configureStoreOrders()
        configureCategories()
        configureCurrency()
        configureInitialSetup()
        configurePhoenixWebhook()
        configurePaymentWebsocket()
        configureHealth()
    }
}
