package pos.ambrosia.utils

import io.ktor.server.application.ApplicationCall
import pos.ambrosia.services.ActiveLightningBackend

private const val DEPLOYMENT_ENVIRONMENT_VARIABLE = "AMBROSIA_DEPLOYMENT"

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

fun ApplicationCall.isLocalPhoenixdLogAvailable(): Boolean = isLocalPhoenixd() && !ActiveLightningBackend.isNwcActive()

fun ApplicationCall.deploymentModeName(): String =
    System.getenv(DEPLOYMENT_ENVIRONMENT_VARIABLE)?.takeIf { deploymentName -> deploymentName.isNotBlank() }
        ?: when {
            isDockerMode() -> "docker"
            isSystemdManaged() -> "systemd"
            else -> "manual"
        }

fun ApplicationCall.lightningBackendName(): String =
    when {
        ActiveLightningBackend.isNwcActive() || isNwcMode() -> "nwc"
        isPhoenixdRemote() -> "remote phoenixd"
        else -> "local phoenixd"
    }
