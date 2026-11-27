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
import pos.ambrosia.utils.MalformedSecretsEnvelopeException
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
import pos.ambrosia.utils.RequestValidationException
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
        exception<ResourceNotFoundException> { applicationCall, thrownException ->
            logger.warn("Resource not found: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.NotFound, Message(thrownException.message ?: "Resource not found"))
        }
        exception<InvalidTimeEntryException> { applicationCall, thrownException ->
            logger.warn("Invalid time entry: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.BadRequest, Message(thrownException.message ?: "Invalid time entry"))
        }
        exception<TimeEntryLockedException> { applicationCall, thrownException ->
            logger.warn("Locked time entry mutation rejected: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.Conflict, Message(thrownException.message ?: "Time entry is locked"))
        }
        exception<LightningBackendUnavailableException> { applicationCall, thrownException ->
            logger.warn("Payout account rejected without a Lightning backend: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.Conflict, Message(thrownException.message ?: "Lightning backend is not available"))
        }
        exception<PayloadTooLargeException> { applicationCall, thrownException ->
            logger.warn("Rejected an oversized request body: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.PayloadTooLarge, Message(thrownException.message ?: "Request body too large"))
        }
        exception<UnsupportedUploadTypeException> { applicationCall, thrownException ->
            logger.warn("Rejected upload with an unsupported type: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.BadRequest, Message(thrownException.message ?: "Unsupported file type"))
        }
        exception<RequestValidationException> { applicationCall, thrownException ->
            logger.warn("Rejected request with an invalid field: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.BadRequest, Message(thrownException.message ?: "Invalid request"))
        }
        exception<SecretsLockedException> { applicationCall, thrownException ->
            logger.warn("Locked secrets access rejected: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.Conflict, Message(thrownException.message ?: "Secrets are locked"))
        }
        exception<MalformedSecretsEnvelopeException> { applicationCall, thrownException ->
            logger.error("Malformed secrets envelope on decrypt: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.InternalServerError, Message(thrownException.message ?: "Database operation failed"))
        }
        exception<InvalidCredentialsException> { applicationCall, thrownException ->
            logger.warn("Invalid login attempt: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.Unauthorized, Message(thrownException.message ?: "Invalid credentials"))
        }
        exception<MissingRoleException> { applicationCall, thrownException ->
            logger.warn("Login attempt with missing role: ${thrownException.message}")
            applicationCall.respond(
                HttpStatusCode.Unauthorized,
                Message(thrownException.message ?: "No assigned role for this user, contact Admin"),
            )
        }
        exception<InvalidTokenException> { applicationCall, thrownException ->
            logger.warn("Invalid token: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.Unauthorized, Message("Invalid token"))
        }
        exception<UnauthorizedApiException> { applicationCall, _ ->
            logger.warn("Unauthorized API access attempt")
            applicationCall.respond(HttpStatusCode.Unauthorized, Message("Unauthorized API access"))
        }
        exception<DuplicateUserNameException> { applicationCall, thrownException ->
            logger.warn("Duplicate user name: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.Conflict, Message("User name already exists"))
        }
        exception<LastUserDeletionException> { applicationCall, thrownException ->
            logger.warn("Attempt to delete last user: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.Conflict, Message("Cannot delete the last user"))
        }
        exception<LastAdminRemovalException> { applicationCall, thrownException ->
            logger.warn("Attempt to remove last admin user: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.Conflict, Message("Cannot remove the last admin user"))
        }
        exception<PendingImportAlreadyStagedException> { applicationCall, thrownException ->
            logger.warn("Rejected a new import while a previous one is still pending: ${thrownException.message}")
            applicationCall.respond(
                HttpStatusCode.Conflict,
                Message("A previous import is already staged and waiting for a server restart"),
            )
        }
        exception<AdminOnlyException> { applicationCall, _ ->
            logger.warn("Non-admin user attempted to access admin-only endpoint")
            applicationCall.respond(HttpStatusCode.Forbidden, Message("Admin privileges required"))
        }
        exception<PermissionDeniedException> { applicationCall, _ ->
            logger.warn("User attempted to access endpoint without required permission")
            applicationCall.respond(HttpStatusCode.Forbidden, Message("Permission required"))
        }
        exception<InvalidCurrentUserPinException> { applicationCall, thrownException ->
            logger.warn("Current user PIN verification failed: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.Forbidden, Message(thrownException.message ?: "Invalid current user PIN"))
        }
        exception<InitialSetupException> { applicationCall, thrownException ->
            logger.error("Initial setup failed: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.BadRequest, Message(thrownException.message ?: "Initial setup failed"))
        }
        exception<WalletOnlyException> { applicationCall, _ ->
            logger.warn("Wallet-only endpoint accessed without wallet token")
            applicationCall.respond(HttpStatusCode.Forbidden, Message("Wallet access required"))
        }
        exception<PrintTicketException> { applicationCall, thrownException ->
            logger.error("Print ticket error: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.ServiceUnavailable, Message("Error processing print job"))
        }
        exception<PhoenixConnectionException> { applicationCall, thrownException ->
            logger.error("Phoenix Lightning node connection error: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.ServiceUnavailable, Message("Lightning node is unavailable"))
        }
        exception<PhoenixNodeInfoException> { applicationCall, thrownException ->
            logger.error("Phoenix node info error: ${thrownException.message}")
            applicationCall.respond(
                HttpStatusCode.ServiceUnavailable,
                Message("Unable to retrieve node information"),
            )
        }
        exception<PhoenixBalanceException> { applicationCall, thrownException ->
            logger.error("Phoenix balance error: ${thrownException.message}")
            applicationCall.respond(
                HttpStatusCode.ServiceUnavailable,
                Message("Unable to retrieve balance information"),
            )
        }
        exception<PhoenixChannelNotAvailableException> { applicationCall, thrownException ->
            logger.warn("Close channel rejected — channel not available: ${thrownException.message}")
            applicationCall.respondWalletError(
                HttpStatusCode.UnprocessableEntity,
                thrownException.message ?: "Channel is not in a closeable state",
                thrownException.code,
                thrownException.source,
            )
        }
        exception<PhoenixServiceException> { applicationCall, thrownException ->
            logger.error("Phoenix service error [${thrownException.category}]: ${thrownException.message}")
            val statusCode = thrownException.statusCode?.let(HttpStatusCode::fromValue) ?: HttpStatusCode.ServiceUnavailable
            applicationCall.respondWalletError(
                statusCode,
                thrownException.message ?: "Lightning node service error",
                thrownException.code,
                thrownException.source,
                thrownException.category,
            )
        }
        exception<NwcConnectionException> { applicationCall, thrownException ->
            logger.error("NWC relay connection error: ${thrownException.message}")
            applicationCall.respondWalletError(
                HttpStatusCode.ServiceUnavailable,
                "NWC wallet relay is unavailable",
                thrownException.code,
                thrownException.source,
            )
        }
        exception<NwcServiceException> { applicationCall, thrownException ->
            logger.error("NWC service error: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.ServiceUnavailable, Message("NWC wallet service error"))
        }
        exception<UnsupportedBackendOperationException> { applicationCall, thrownException ->
            logger.warn("Unsupported backend operation: ${thrownException.message}")
            applicationCall.respondWalletError(
                HttpStatusCode.NotImplemented,
                thrownException.message ?: "Operation not supported by current Lightning backend",
                thrownException.code,
                thrownException.source,
            )
        }
        exception<PaymentNotConfirmedException> { applicationCall, thrownException ->
            logger.info("Payment not yet confirmed: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.Accepted, mapOf("status" to "pending"))
        }
        exception<ProductIsBundleComponentException> { applicationCall, thrownException ->
            logger.warn("Attempt to delete product used as bundle component: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.Conflict, Message(thrownException.message ?: "Product is used as a bundle component"))
        }
        exception<OrderAlreadyRefundedException> { applicationCall, thrownException ->
            logger.warn("Refund attempt on already-refunded order: ${thrownException.message}")
            applicationCall.respondWalletError(
                HttpStatusCode.Conflict,
                thrownException.message ?: "Order has already been refunded",
                thrownException.code,
                thrownException.source,
            )
        }
        exception<OrderNotRefundableException> { applicationCall, thrownException ->
            logger.warn("Refund rejected: ${thrownException.message}")
            applicationCall.respondWalletError(
                HttpStatusCode.Conflict,
                thrownException.message ?: "Order cannot be refunded",
                thrownException.code,
                thrownException.source,
            )
        }
        exception<DatabaseException> { applicationCall, thrownException ->
            logger.error("Database operation failed: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.InternalServerError, Message(thrownException.message ?: "Database operation failed"))
        }

        // --- Generic and SQL Exceptions Last ---
        exception<ExposedSQLException> { applicationCall, thrownException ->
            when {
                thrownException.message?.contains("UNIQUE constraint failed: products.SKU", ignoreCase = true) == true -> {
                    logger.warn("Duplicate product SKU: ${thrownException.message}")
                    applicationCall.respond(HttpStatusCode.Conflict, Message("SKU already exists"))
                }

                thrownException.message?.contains("UNIQUE constraint failed: product_variants.sku", ignoreCase = true) == true -> {
                    logger.warn("Duplicate variant SKU: ${thrownException.message}")
                    applicationCall.respond(HttpStatusCode.Conflict, Message("Variant SKU already exists"))
                }

                else -> {
                    logger.error("Database operation failed: ${thrownException.message}", thrownException)
                    applicationCall.respond(HttpStatusCode.InternalServerError, Message("Database operation failed"))
                }
            }
        }
        exception<SQLException> { applicationCall, thrownException ->
            logger.error("Database connection error: ${thrownException.message}", thrownException)
            applicationCall.respond(HttpStatusCode.InternalServerError, Message("Error connecting to the database"))
        }
        exception<IllegalArgumentException> { applicationCall, thrownException ->
            logger.warn("Rejected request with an invalid argument: ${thrownException.message}")
            applicationCall.respond(HttpStatusCode.BadRequest, Message(thrownException.message ?: "Invalid request"))
        }
        exception<Exception> { applicationCall, thrownException ->
            logger.error("Unhandled exception: ${thrownException.message}", thrownException)
            applicationCall.respond(HttpStatusCode.InternalServerError, Message("Internal server error"))
        }
        exception<Throwable> { applicationCall, thrownException ->
            logger.error("Unhandled Throwable: ${thrownException.message}", thrownException)
            applicationCall.respondText(
                text = thrownException.message ?: "",
                status = defaultExceptionStatusCode(thrownException) ?: HttpStatusCode.InternalServerError,
            )
        }
    }
}
