package pos.ambrosia.utils

class InvalidCredentialsException(
    message: String = "Invalid credentials",
) : IllegalArgumentException(message)

class InvalidCurrentUserPinException(
    message: String = "Invalid current user PIN",
) : IllegalArgumentException(message)

class AdminOnlyException(
    message: String = "Admin privileges required",
) : SecurityException(message)

class UnauthorizedApiException(
    message: String = "Unauthorized API access",
) : SecurityException(message)

class PhoenixConnectionException(
    message: String = "Unable to connect to Phoenix Lightning node",
) : RuntimeException(message)

class PhoenixNodeInfoException(
    message: String = "Failed to retrieve node information from Phoenix",
) : RuntimeException(message)

class PhoenixBalanceException(
    message: String = "Failed to retrieve balance information from Phoenix",
) : RuntimeException(message)

class PhoenixChannelNotAvailableException(
    message: String = "Channel is not in a closeable state (currently syncing or offline)",
    val code: String = "channel_not_available",
    val source: String = "phoenixd",
) : RuntimeException(message)

class PhoenixServiceException(
    message: String = "Phoenix Lightning node service error",
    val code: String = "unknown",
    val category: String = "unknown",
    val statusCode: Int? = null,
    val source: String = "phoenixd",
    val upstreamMessage: String? = null,
    val diagnosticLogged: Boolean = false,
) : RuntimeException(message)

class InvalidTokenException(
    message: String = "Invalid token",
) : Exception(message)

class WalletOnlyException(
    message: String = "Wallet access required",
) : SecurityException(message)

class PermissionDeniedException(
    message: String = "Permission required",
) : SecurityException(message)

class PrintTicketException(
    message: String = "Error processing print job",
) : RuntimeException(message)

class NwcConnectionException(
    message: String = "Unable to connect to NWC relay",
    val code: String = "nwc_connection_failed",
    val source: String = "ambrosia",
) : RuntimeException(message)

class NwcServiceException(
    message: String = "NWC wallet service error",
) : RuntimeException(message)

class UnsupportedBackendOperationException(
    message: String = "Operation not supported by current Lightning backend",
    val code: String = "unsupported_operation",
    val source: String = "ambrosia",
) : RuntimeException(message)

class DuplicateUserNameException(
    message: String = "User name already exists",
) : IllegalStateException(message)

class MissingRoleException(
    message: String = "No assigned role for this user, contact Admin",
) : Exception(message)

class LastUserDeletionException(
    message: String = "Cannot delete the last user",
) : IllegalStateException(message)

class LastAdminRemovalException(
    message: String = "Cannot remove the last admin user",
) : IllegalStateException(message)

class PendingImportAlreadyStagedException(
    message: String = "A previous import is already staged and waiting for a server restart",
) : IllegalStateException(message)

class ResourceNotFoundException(
    message: String = "Resource not found",
) : RuntimeException(message)

class InvalidTimeEntryException(
    message: String = "Invalid time entry",
) : IllegalArgumentException(message)

class TimeEntryLockedException(
    message: String = "Time entry is locked because it belongs to an invoice",
) : IllegalStateException(message)

class LightningBackendUnavailableException(
    message: String = "A Lightning address is required when no Lightning backend is active",
) : IllegalStateException(message)

class SecretsLockedException(
    message: String = "Secrets are locked — unlock the server before using this feature",
) : IllegalStateException(message)

class UnsupportedUploadTypeException(
    message: String = "Uploaded file does not match an allowed image type",
) : IllegalArgumentException(message)

class InitialSetupException(
    message: String = "Initial setup failed",
) : RuntimeException(message)

class DatabaseException(
    message: String = "Database operation failed",
) : RuntimeException(message)

class PaymentNotConfirmedException(
    message: String = "Payment not yet confirmed",
) : RuntimeException(message)

class ProductIsBundleComponentException(
    val bundleNames: List<String>,
) : IllegalStateException("Product is a component of bundles: ${bundleNames.joinToString(", ")}")

class OrderAlreadyRefundedException(
    message: String = "Order has already been refunded",
    val code: String = "already_refunded",
    val source: String = "ambrosia",
) : IllegalStateException(message)

class OrderNotRefundableException(
    message: String = "Order cannot be refunded",
    val code: String = "not_refundable",
    val source: String = "ambrosia",
) : IllegalStateException(message)
