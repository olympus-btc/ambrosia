package pos.ambrosia.api

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.engine.defaultExceptionStatusCode
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import java.sql.SQLException
import pos.ambrosia.logger
import pos.ambrosia.models.Message
import pos.ambrosia.utils.AdminOnlyException
import pos.ambrosia.utils.PermissionDeniedException
import pos.ambrosia.utils.InvalidCredentialsException
import pos.ambrosia.utils.InvalidTokenException
import pos.ambrosia.utils.PhoenixBalanceException
import pos.ambrosia.utils.PhoenixConnectionException
import pos.ambrosia.utils.PhoenixNodeInfoException
import pos.ambrosia.utils.PhoenixServiceException
import pos.ambrosia.utils.UnauthorizedApiException
import pos.ambrosia.utils.DuplicateUserNameException
import pos.ambrosia.utils.LastUserDeletionException

fun Application.Handler() {
  install(StatusPages) {
    exception<SQLException> { call, cause ->
      logger.error("Database connection error: ${cause.message}", cause)
      call.respond(HttpStatusCode.InternalServerError, Message("Error connecting to the database"))
    }
    exception<Throwable> { call, cause ->
      logger.error("Unhandled Throwable: ${cause.message}", cause)
      call.respondText(
        text = cause.message ?: "",
        status = defaultExceptionStatusCode(cause) ?: HttpStatusCode.InternalServerError
      )
    }
    exception<InvalidCredentialsException> { call, cause ->
      logger.warn("Invalid login attempt: ${cause.message}")
      call.respond(HttpStatusCode.Unauthorized, Message("Invalid credentials"))
    }
    exception<InvalidTokenException> { call, cause ->
      logger.warn("Invalid token: ${cause.message}")
      call.respond(HttpStatusCode.Unauthorized, Message("Invalid token"))
    }
    exception<DuplicateUserNameException> { call, cause ->
      logger.warn("Duplicate user name: ${cause.message}")
      call.respond(HttpStatusCode.Conflict, Message("User name already exists"))
    }
    exception<LastUserDeletionException> { call, cause ->
      logger.warn("Attempt to delete last user: ${cause.message}")
      call.respond(HttpStatusCode.Conflict, Message("Cannot delete the last user"))
    }
    exception<Exception> { call, cause ->
      logger.error("Unhandled exception: ${cause.message}")
      call.respond(HttpStatusCode.InternalServerError, Message("Internal server error"))
    }
    exception<UnauthorizedApiException> { call, _ ->
      logger.warn("Unauthorized API access attempt")
      call.respond(HttpStatusCode.Unauthorized, Message("Unauthorized API access"))
    }
    exception<AdminOnlyException> { call, _ ->
      logger.warn("Non-admin user attempted to access admin-only endpoint")
      call.respond(HttpStatusCode.Forbidden, Message("Admin privileges required"))
    }
    exception<PermissionDeniedException> { call, _ ->
      logger.warn("User attempted to access endpoint without required permission")
      call.respond(HttpStatusCode.Forbidden, Message("Permission required"))
    }
    exception<PhoenixConnectionException> { call, cause ->
      logger.error("Phoenix Lightning node connection error: ${cause.message}")
      call.respond(HttpStatusCode.ServiceUnavailable, Message("Lightning node is unavailable"))
    }
    exception<PhoenixNodeInfoException> { call, cause ->
      logger.error("Phoenix node info error: ${cause.message}")
      call.respond(
        HttpStatusCode.ServiceUnavailable,
        Message("Unable to retrieve node information")
      )
    }
    exception<PhoenixBalanceException> { call, cause ->
      logger.error("Phoenix balance error: ${cause.message}")
      call.respond(
        HttpStatusCode.ServiceUnavailable,
        Message("Unable to retrieve balance information")
      )
    }
    exception<PhoenixServiceException> { call, cause ->
      logger.error("Phoenix service error: ${cause.message}")
      call.respond(HttpStatusCode.ServiceUnavailable, Message("Lightning node service error"))
    }
  }
}
