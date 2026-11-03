package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCall
import io.ktor.server.application.install
import io.ktor.server.engine.defaultExceptionStatusCode
import io.ktor.server.plugins.PayloadTooLargeException
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import org.jetbrains.exposed.v1.exceptions.ExposedSQLException
import pos.ambrosia.logger
import pos.ambrosia.models.Message
import pos.ambrosia.models.WalletErrorResponse
import pos.ambrosia.utils.AdminOnlyException
import pos.ambrosia.utils.DatabaseException
import pos.ambrosia.utils.DuplicateUserNameException
import pos.ambrosia.utils.InitialSetupException
import pos.ambrosia.utils.InvalidCredentialsException
import pos.ambrosia.utils.InvalidCurrentUserPinException
import pos.ambrosia.utils.InvalidTimeEntryException
import pos.ambrosia.utils.InvalidTokenException
import pos.ambrosia.utils.LastAdminRemovalException
import pos.ambrosia.utils.LastUserDeletionException
import pos.ambrosia.utils.LightningBackendUnavailableException
import pos.ambrosia.utils.MissingRoleException
import pos.ambrosia.utils.NwcConnectionException
import pos.ambrosia.utils.NwcServiceException
import pos.ambrosia.utils.OrderAlreadyRefundedException
import pos.ambrosia.utils.OrderNotRefundableException
import pos.ambrosia.utils.PaymentNotConfirmedException
import pos.ambrosia.utils.PendingImportAlreadyStagedException
import pos.ambrosia.utils.PermissionDeniedException
import pos.ambrosia.utils.PhoenixBalanceException
import pos.ambrosia.utils.PhoenixChannelNotAvailableException
import pos.ambrosia.utils.PhoenixConnectionException
import pos.ambrosia.utils.PhoenixNodeInfoException
import pos.ambrosia.utils.PhoenixServiceException
import pos.ambrosia.utils.PrintTicketException
import pos.ambrosia.utils.ProductIsBundleComponentException
import pos.ambrosia.utils.ResourceNotFoundException
import pos.ambrosia.utils.SecretsLockedException
import pos.ambrosia.utils.TimeEntryLockedException
import pos.ambrosia.utils.UnauthorizedApiException
import pos.ambrosia.utils.UnsupportedBackendOperationException
import pos.ambrosia.utils.UnsupportedUploadTypeException
import pos.ambrosia.utils.WalletOnlyException
import java.sql.SQLException

private suspend fun ApplicationCall.respondWalletError(
    status: HttpStatusCode,
    message: String,
    code: String,
    source: String,
    category: String = "unknown",
) = respond(status, WalletErrorResponse(message = message, code = code, source = source, category = category))

fun Application.handler() {
    install(StatusPages) {
        // --- Specific Exceptions First ---
        exception<ResourceNotFoundException> { call, cause ->
            logger.warn("Resource not found: ${cause.message}")
            call.respond(HttpStatusCode.NotFound, Message(cause.message ?: "Resource not found"))
        }
        exception<InvalidTimeEntryException> { call, cause ->
            logger.warn("Invalid time entry: ${cause.message}")
            call.respond(HttpStatusCode.BadRequest, Message(cause.message ?: "Invalid time entry"))
        }
        exception<TimeEntryLockedException> { call, cause ->
            logger.warn("Locked time entry mutation rejected: ${cause.message}")
            call.respond(HttpStatusCode.Conflict, Message(cause.message ?: "Time entry is locked"))
        }
        exception<LightningBackendUnavailableException> { call, cause ->
            logger.warn("Payout account rejected without a Lightning backend: ${cause.message}")
            call.respond(HttpStatusCode.Conflict, Message(cause.message ?: "Lightning backend is not available"))
        }
        exception<PayloadTooLargeException> { call, cause ->
            logger.warn("Rejected an oversized request body: ${cause.message}")
            call.respond(HttpStatusCode.PayloadTooLarge, Message(cause.message ?: "Request body too large"))
        }
        exception<UnsupportedUploadTypeException> { call, cause ->
            logger.warn("Rejected upload with an unsupported type: ${cause.message}")
            call.respond(HttpStatusCode.BadRequest, Message(cause.message ?: "Unsupported file type"))
        }
        exception<SecretsLockedException> { call, cause ->
            logger.warn("Locked secrets access rejected: ${cause.message}")
            call.respond(HttpStatusCode.Conflict, Message(cause.message ?: "Secrets are locked"))
        }
        exception<InvalidCredentialsException> { call, cause ->
            logger.warn("Invalid login attempt: ${cause.message}")
            call.respond(HttpStatusCode.Unauthorized, Message(cause.message ?: "Invalid credentials"))
        }
        exception<MissingRoleException> { call, cause ->
            logger.warn("Login attempt with missing role: ${cause.message}")
            call.respond(
                HttpStatusCode.Unauthorized,
                Message(cause.message ?: "No assigned role for this user, contact Admin"),
            )
        }
        exception<InvalidTokenException> { call, cause ->
            logger.warn("Invalid token: ${cause.message}")
            call.respond(HttpStatusCode.Unauthorized, Message("Invalid token"))
        }
        exception<UnauthorizedApiException> { call, _ ->
            logger.warn("Unauthorized API access attempt")
            call.respond(HttpStatusCode.Unauthorized, Message("Unauthorized API access"))
        }
        exception<DuplicateUserNameException> { call, cause ->
            logger.warn("Duplicate user name: ${cause.message}")
            call.respond(HttpStatusCode.Conflict, Message("User name already exists"))
        }
        exception<LastUserDeletionException> { call, cause ->
            logger.warn("Attempt to delete last user: ${cause.message}")
            call.respond(HttpStatusCode.Conflict, Message("Cannot delete the last user"))
        }
        exception<LastAdminRemovalException> { call, cause ->
            logger.warn("Attempt to remove last admin user: ${cause.message}")
            call.respond(HttpStatusCode.Conflict, Message("Cannot remove the last admin user"))
        }
        exception<PendingImportAlreadyStagedException> { call, cause ->
            logger.warn("Rejected a new import while a previous one is still pending: ${cause.message}")
            call.respond(HttpStatusCode.Conflict, Message("A previous import is already staged and waiting for a server restart"))
        }
        exception<AdminOnlyException> { call, _ ->
            logger.warn("Non-admin user attempted to access admin-only endpoint")
            call.respond(HttpStatusCode.Forbidden, Message("Admin privileges required"))
        }
        exception<PermissionDeniedException> { call, _ ->
            logger.warn("User attempted to access endpoint without required permission")
            call.respond(HttpStatusCode.Forbidden, Message("Permission required"))
        }
        exception<InvalidCurrentUserPinException> { call, cause ->
            logger.warn("Current user PIN verification failed: ${cause.message}")
            call.respond(HttpStatusCode.Forbidden, Message(cause.message ?: "Invalid current user PIN"))
        }
        exception<InitialSetupException> { call, cause ->
            logger.error("Initial setup failed: ${cause.message}")
            call.respond(HttpStatusCode.BadRequest, Message(cause.message ?: "Initial setup failed"))
        }
        exception<WalletOnlyException> { call, _ ->
            logger.warn("Wallet-only endpoint accessed without wallet token")
            call.respond(HttpStatusCode.Forbidden, Message("Wallet access required"))
        }
        exception<PrintTicketException> { call, cause ->
            logger.error("Print ticket error: ${cause.message}")
            call.respond(HttpStatusCode.ServiceUnavailable, Message("Error processing print job"))
        }
        exception<PhoenixConnectionException> { call, cause ->
            logger.error("Phoenix Lightning node connection error: ${cause.message}")
            call.respond(HttpStatusCode.ServiceUnavailable, Message("Lightning node is unavailable"))
        }
        exception<PhoenixNodeInfoException> { call, cause ->
            logger.error("Phoenix node info error: ${cause.message}")
            call.respond(
                HttpStatusCode.ServiceUnavailable,
                Message("Unable to retrieve node information"),
            )
        }
        exception<PhoenixBalanceException> { call, cause ->
            logger.error("Phoenix balance error: ${cause.message}")
            call.respond(
                HttpStatusCode.ServiceUnavailable,
                Message("Unable to retrieve balance information"),
            )
        }
        exception<PhoenixChannelNotAvailableException> { call, cause ->
            logger.warn("Close channel rejected — channel not available: ${cause.message}")
            call.respondWalletError(
                HttpStatusCode.UnprocessableEntity,
                cause.message ?: "Channel is not in a closeable state",
                cause.code,
                cause.source,
            )
        }
        exception<PhoenixServiceException> { call, cause ->
            logger.error("Phoenix service error [${cause.category}]: ${cause.message}")
            val statusCode = cause.statusCode?.let(HttpStatusCode::fromValue) ?: HttpStatusCode.ServiceUnavailable
            call.respondWalletError(
                statusCode,
                cause.message ?: "Lightning node service error",
                cause.code,
                cause.source,
                cause.category,
            )
        }
        exception<NwcConnectionException> { call, cause ->
            logger.error("NWC relay connection error: ${cause.message}")
            call.respondWalletError(HttpStatusCode.ServiceUnavailable, "NWC wallet relay is unavailable", cause.code, cause.source)
        }
        exception<NwcServiceException> { call, cause ->
            logger.error("NWC service error: ${cause.message}")
            call.respond(HttpStatusCode.ServiceUnavailable, Message("NWC wallet service error"))
        }
        exception<UnsupportedBackendOperationException> { call, cause ->
            logger.warn("Unsupported backend operation: ${cause.message}")
            call.respondWalletError(
                HttpStatusCode.NotImplemented,
                cause.message ?: "Operation not supported by current Lightning backend",
                cause.code,
                cause.source,
            )
        }
        exception<PaymentNotConfirmedException> { call, cause ->
            logger.info("Payment not yet confirmed: ${cause.message}")
            call.respond(HttpStatusCode.Accepted, mapOf("status" to "pending"))
        }
        exception<ProductIsBundleComponentException> { call, cause ->
            logger.warn("Attempt to delete product used as bundle component: ${cause.message}")
            call.respond(HttpStatusCode.Conflict, Message(cause.message ?: "Product is used as a bundle component"))
        }
        exception<OrderAlreadyRefundedException> { call, cause ->
            logger.warn("Refund attempt on already-refunded order: ${cause.message}")
            call.respondWalletError(HttpStatusCode.Conflict, cause.message ?: "Order has already been refunded", cause.code, cause.source)
        }
        exception<OrderNotRefundableException> { call, cause ->
            logger.warn("Refund rejected: ${cause.message}")
            call.respondWalletError(HttpStatusCode.Conflict, cause.message ?: "Order cannot be refunded", cause.code, cause.source)
        }
        exception<DatabaseException> { call, cause ->
            logger.error("Database operation failed: ${cause.message}")
            call.respond(HttpStatusCode.InternalServerError, Message(cause.message ?: "Database operation failed"))
        }

        // --- Generic and SQL Exceptions Last ---
        exception<ExposedSQLException> { call, cause ->
            when {
                cause.message?.contains("UNIQUE constraint failed: products.SKU", ignoreCase = true) == true -> {
                    logger.warn("Duplicate product SKU: ${cause.message}")
                    call.respond(HttpStatusCode.Conflict, Message("SKU already exists"))
                }

                cause.message?.contains("UNIQUE constraint failed: product_variants.sku", ignoreCase = true) == true -> {
                    logger.warn("Duplicate variant SKU: ${cause.message}")
                    call.respond(HttpStatusCode.Conflict, Message("Variant SKU already exists"))
                }

                else -> {
                    logger.error("Database operation failed: ${cause.message}", cause)
                    call.respond(HttpStatusCode.InternalServerError, Message("Database operation failed"))
                }
            }
        }
        exception<SQLException> { call, cause ->
            logger.error("Database connection error: ${cause.message}", cause)
            call.respond(HttpStatusCode.InternalServerError, Message("Error connecting to the database"))
        }
        exception<Exception> { call, cause ->
            logger.error("Unhandled exception: ${cause.message}")
            call.respond(HttpStatusCode.InternalServerError, Message("Internal server error"))
        }
        exception<Throwable> { call, cause ->
            logger.error("Unhandled Throwable: ${cause.message}", cause)
            call.respondText(
                text = cause.message ?: "",
                status = defaultExceptionStatusCode(cause) ?: HttpStatusCode.InternalServerError,
            )
        }
    }
}
