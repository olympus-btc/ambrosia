package pos.ambrosia.utils

import io.ktor.server.application.ApplicationCall

fun ApplicationCall.isSystemdManaged(): Boolean = System.getenv("AMBROSIA_SERVICE_MANAGED") == "true"

fun ApplicationCall.canRestartSelf(): Boolean = isDockerMode() || isSystemdManaged()

fun ApplicationCall.isPhoenixdRemote(): Boolean =
    application.environment.config
        .propertyOrNull("phoenixd-remote")
        ?.getString()
        ?.toBoolean() ?: false

fun ApplicationCall.isNwcMode(): Boolean =
    application.environment.config
        .propertyOrNull("nwc-uri")
        ?.getString()
        ?.isNotBlank() ?: false

fun ApplicationCall.isLocalPhoenixd(): Boolean = !isPhoenixdRemote() && !isNwcMode()
