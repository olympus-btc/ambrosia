package pos.ambrosia.utils

class InvalidCredentialsException(
    message: String = "Invalid credentials",
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

class PhoenixServiceException(
    message: String = "Phoenix Lightning node service error",
    val code: String = "unknown",
    val statusCode: Int? = null,
    val source: String = "phoenixd",
    val upstreamMessage: String? = null,
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

class ResourceNotFoundException(
    message: String = "Resource not found",
) : RuntimeException(message)

class InitialSetupException(
    message: String = "Initial setup failed",
) : RuntimeException(message)

class DatabaseException(
    message: String = "Database operation failed",
) : RuntimeException(message)
