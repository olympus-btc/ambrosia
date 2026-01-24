package pos.ambrosia.utils

// Custom exceptions for specific error scenarios
class InvalidCredentialsException(message: String = "Invalid credentials") :
        IllegalArgumentException(message)

class AdminOnlyException(message: String = "Admin privileges required") :
        SecurityException(message)

class UnauthorizedApiException(message: String = "Unauthorized API access") :
        SecurityException(message)

// Phoenix Lightning node exceptions
class PhoenixConnectionException(message: String = "Unable to connect to Phoenix Lightning node") :
        RuntimeException(message)

class PhoenixNodeInfoException(
        message: String = "Failed to retrieve node information from Phoenix"
) : RuntimeException(message)

class PhoenixBalanceException(
        message: String = "Failed to retrieve balance information from Phoenix"
) : RuntimeException(message)

class PhoenixServiceException(message: String = "Phoenix Lightning node service error") :
        RuntimeException(message)

class InvalidTokenException(message: String = "Invalid token") : Exception(message)

class WalletOnlyException(message: String = "Wallet access required") : SecurityException(message)

class PermissionDeniedException(message: String = "Permission required") : SecurityException(message)

class PrintTicketException(message: String = "Error processing print job") : RuntimeException(message)

class DuplicateUserNameException(message: String = "User name already exists") :
        IllegalStateException(message)

class LastUserDeletionException(message: String = "Cannot delete the last user") :
        IllegalStateException(message)
