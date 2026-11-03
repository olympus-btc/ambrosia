package pos.ambrosia.utils

import io.ktor.server.application.ApplicationCall

fun ApplicationCall.isDockerMode(): Boolean =
    application.environment.config
        .propertyOrNull("docker")
        ?.getString()
        ?.toBoolean() ?: false
