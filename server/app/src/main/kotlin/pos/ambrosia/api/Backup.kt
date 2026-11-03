package pos.ambrosia.api

import io.ktor.http.ContentDisposition
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.PartData
import io.ktor.http.content.forEachPart
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCall
import io.ktor.server.auth.authenticate
import io.ktor.server.auth.jwt.JWTPrincipal
import io.ktor.server.auth.principal
import io.ktor.server.request.contentLength
import io.ktor.server.request.receive
import io.ktor.server.request.receiveMultipart
import io.ktor.server.response.header
import io.ktor.server.response.respond
import io.ktor.server.response.respondOutputStream
import io.ktor.server.routing.Route
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import io.ktor.utils.io.ByteReadChannel
import io.ktor.utils.io.readAvailable
import kotlinx.coroutines.runBlocking
import pos.ambrosia.logger
import pos.ambrosia.models.BackupProgressPhase
import pos.ambrosia.models.RolePassword
import pos.ambrosia.scheduleProcessRestart
import pos.ambrosia.services.AuthService
import pos.ambrosia.services.BackupService
import pos.ambrosia.services.ConfigService
import pos.ambrosia.services.TokenService
import pos.ambrosia.utils.InvalidCredentialsException
import pos.ambrosia.utils.canRestartSelf
import java.nio.file.Files
import java.nio.file.Path
import java.time.LocalDate
import java.util.UUID

private const val BACKUP_OPERATION_ID_HEADER = "X-Backup-Operation-Id"
const val COPY_BUFFER_SIZE_BYTES = 8192

fun Application.configureBackup() {
    val authService = AuthService(environment)
    val backupService = BackupService()
    val configService = ConfigService()
    val tokenService = TokenService(environment)

    routing {
        route("/backup") {
            backup(authService, backupService, configService, tokenService)
        }
    }
}

fun Route.backup(
    authService: AuthService,
    backupService: BackupService,
    configService: ConfigService,
    tokenService: TokenService,
) {
    authenticate("auth-jwt-wallet") {
        post("/progress-token") {
            val userId = call.backupActorUserId() ?: throw InvalidCredentialsException()
            val operationId = UUID.randomUUID().toString()
            val progressToken = tokenService.generateBackupProgressToken(userId, operationId)
            call.respond(HttpStatusCode.OK, mapOf("operationId" to operationId, "token" to progressToken))
        }

        post("/confirm-pending-import") {
            call.backupActorUserId() ?: throw InvalidCredentialsException()
            backupService.stagedOperationId()?.let { operationId ->
                backupService.writeConfirmationToken(tokenService.generateBackupConfirmationToken(operationId))
                if (call.canRestartSelf()) scheduleProcessRestart()
            }
            call.respond(HttpStatusCode.OK)
        }

        post("/export") {
            val userId = call.backupActorUserId() ?: throw InvalidCredentialsException()
            val rolePassword = call.receive<RolePassword>()
            val isAuthenticated = authService.authenticateByRole(userId, rolePassword.password.toCharArray())
            if (isAuthenticated != true) {
                call.respond(HttpStatusCode.Unauthorized)
                return@post
            }

            val operationId = call.request.headers[BACKUP_OPERATION_ID_HEADER]
            val onExportProgress = backupProgressReporter(operationId)

            try {
                onExportProgress(BackupProgressPhase.PREPARING, 0L, null)
                val businessName = configService.getConfig()?.businessName ?: "ambrosia"
                val fileName = buildBackupFileName(businessName)
                val databaseSnapshot = backupService.prepareExportSnapshot()
                val totalExportBytes = backupService.calculateExportTotalBytes(databaseSnapshot)

                call.response.header(
                    HttpHeaders.ContentDisposition,
                    ContentDisposition.Attachment.withParameter(ContentDisposition.Parameters.FileName, fileName).toString(),
                )
                call.response.header("X-Backup-Total-Bytes", totalExportBytes.toString())
                call.respondOutputStream(ContentType.Application.OctetStream, HttpStatusCode.OK) {
                    backupService.exportBackup(
                        businessName,
                        rolePassword.password.toCharArray(),
                        databaseSnapshot,
                        this,
                        onExportProgress,
                    )
                }
            } finally {
                operationId?.let { BackupProgressNotifier.unregister(it) }
            }
        }

        post("/import") {
            val userId = call.backupActorUserId() ?: throw InvalidCredentialsException()

            val formFields = mutableMapOf<String, String>()
            var temporaryBackupFile: Path? = null
            var bytesUploaded = 0L
            try {
                call.receiveMultipart().forEachPart { part ->
                    when (part) {
                        is PartData.FormItem -> {
                            part.name?.let { fieldName -> formFields[fieldName] = part.value }
                        }

                        is PartData.FileItem -> {
                            if (part.name == "backup") {
                                val onImportProgress = backupProgressReporter(formFields["operationId"])
                                val totalUploadBytes = call.request.contentLength()
                                temporaryBackupFile =
                                    receiveChannelToTempFile(part.provider) { bytesReceived ->
                                        bytesUploaded += bytesReceived
                                        onImportProgress(BackupProgressPhase.UPLOADING, bytesUploaded, totalUploadBytes)
                                    }
                            }
                        }

                        else -> {}
                    }
                    part.release()
                }

                val rolePassword = formFields["rolePassword"]
                val backupPassword = formFields["backupPassword"]
                val backupFile = temporaryBackupFile
                if (rolePassword.isNullOrEmpty() || backupPassword.isNullOrEmpty() || backupFile == null) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Missing password or backup file"))
                    return@post
                }

                val isAuthenticated = authService.authenticateByRole(userId, rolePassword.toCharArray())
                if (isAuthenticated != true) {
                    call.respond(HttpStatusCode.Unauthorized)
                    return@post
                }

                val importedManifest =
                    Files.newInputStream(backupFile).use { backupInputStream ->
                        backupService.importBackup(
                            backupInputStream,
                            backupPassword.toCharArray(),
                            backupProgressReporter(formFields["operationId"]),
                        )
                    }

                call.respond(
                    HttpStatusCode.OK,
                    mapOf("message" to "Backup imported", "businessName" to importedManifest.businessName),
                )
            } catch (invalidBackup: IllegalArgumentException) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    mapOf("message" to (invalidBackup.message ?: "Invalid backup file")),
                )
            } catch (unsafeBackup: SecurityException) {
                logger.warn("Rejected backup import with an unsafe path: ${unsafeBackup.message}")
                call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Invalid backup file"))
            } finally {
                temporaryBackupFile?.let { Files.deleteIfExists(it) }
                formFields["operationId"]?.let { BackupProgressNotifier.unregister(it) }
            }
        }
    }
}

private fun buildBackupFileName(businessName: String): String {
    val sanitizedBusinessName = businessName.replace(Regex("[^A-Za-z0-9-]+"), "-").trim('-').ifBlank { "ambrosia" }
    val today = LocalDate.now().toString()
    return "ambrosia-backup-$sanitizedBusinessName-$today.zip"
}

private fun ApplicationCall.backupActorUserId(): String? = principal<JWTPrincipal>()?.getClaim("userId", String::class)

fun receiveChannelToTempFile(
    channelProvider: () -> ByteReadChannel,
    onBytesReceived: (Long) -> Unit,
): Path {
    val temporaryFile = Files.createTempFile("ambrosia-import-upload-", ".zip")
    val uploadChannel = channelProvider()
    Files.newOutputStream(temporaryFile).use { temporaryFileOutputStream ->
        val buffer = ByteArray(COPY_BUFFER_SIZE_BYTES)
        runBlocking {
            while (true) {
                val bytesRead = uploadChannel.readAvailable(buffer, 0, buffer.size)
                if (bytesRead < 0) break
                temporaryFileOutputStream.write(buffer, 0, bytesRead)
                onBytesReceived(bytesRead.toLong())
            }
        }
    }
    uploadChannel.cancel(null)
    return temporaryFile
}
