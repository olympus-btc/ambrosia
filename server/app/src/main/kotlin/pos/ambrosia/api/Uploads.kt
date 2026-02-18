package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.http.content.PartData
import io.ktor.http.content.forEachPart
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCall
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.http.content.staticFiles
import io.ktor.server.plugins.origin
import io.ktor.server.request.receiveMultipart
import io.ktor.server.response.respond
import io.ktor.server.routing.post
import io.ktor.server.routing.routing
import pos.ambrosia.datadir
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.services.ConfigService
import pos.ambrosia.services.UploadService
import java.nio.file.Path
import java.nio.file.Paths

fun Application.configureUploads() {
    val uploadRoot: Path = Paths.get(datadir.toString(), "uploads")
    val uploadService = UploadService(uploadRoot)
    val connection = DatabaseConnection.getConnection()
    val configService = ConfigService(connection)

    routing {
        staticFiles("/uploads", uploadRoot.toFile())
        authenticate("auth-jwt", optional = true) {
            post("/uploads") {
                val configExists = configService.getConfig() != null
                if (configExists && call.principal<JWTPrincipal>() == null) {
                    call.respond(HttpStatusCode.Unauthorized, mapOf("message" to "Unauthorized"))
                    return@post
                }

                val multipart = call.receiveMultipart()
                val uploads = mutableListOf<Map<String, String>>()

                multipart.forEachPart { part ->
                    when (part) {
                        is PartData.FileItem -> {
                            val savedUpload = uploadService.saveFile(part.originalFileName, part.provider)
                            val absoluteUrl = buildAbsoluteUrl(call, savedUpload.relativePath)
                            uploads.add(
                                mapOf(
                                    "path" to savedUpload.relativePath,
                                    "url" to absoluteUrl,
                                ),
                            )
                        }

                        else -> {}
                    }
                    part.dispose()
                }

                if (uploads.isEmpty()) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("message" to "No files uploaded"))
                    return@post
                }

                call.respond(HttpStatusCode.Created, mapOf("uploads" to uploads))
            }
        }
    }
}

private fun buildAbsoluteUrl(
    call: ApplicationCall,
    relativePath: String,
): String {
    val origin = call.request.origin
    val defaultPorts = mapOf("http" to 80, "https" to 443)
    val portPart = if (defaultPorts[origin.scheme] == origin.serverPort) "" else ":${origin.serverPort}"
    return "${origin.scheme}://${origin.serverHost}$portPart$relativePath"
}
