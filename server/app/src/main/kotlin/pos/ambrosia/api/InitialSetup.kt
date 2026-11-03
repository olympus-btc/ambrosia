package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.http.content.PartData
import io.ktor.http.content.forEachPart
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCall
import io.ktor.server.request.contentLength
import io.ktor.server.request.receive
import io.ktor.server.request.receiveMultipart
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.datadir
import pos.ambrosia.logger
import pos.ambrosia.models.BackupProgressPhase
import pos.ambrosia.models.Config
import pos.ambrosia.models.InitialSetupRequest
import pos.ambrosia.models.InitialSetupResponse
import pos.ambrosia.models.InitialSetupStatus
import pos.ambrosia.models.Role
import pos.ambrosia.models.TestPhoenixdConnectionRequest
import pos.ambrosia.models.User
import pos.ambrosia.scheduleProcessRestart
import pos.ambrosia.services.ActiveLightningBackend
import pos.ambrosia.services.BackupService
import pos.ambrosia.services.ConfigService
import pos.ambrosia.services.CurrencyService
import pos.ambrosia.services.PermissionsService
import pos.ambrosia.services.PhoenixService
import pos.ambrosia.services.RolesService
import pos.ambrosia.services.SecretsStore
import pos.ambrosia.services.TokenService
import pos.ambrosia.services.UsersService
import pos.ambrosia.services.WalletAdminNotificationService
import pos.ambrosia.utils.InitialSetupException
import pos.ambrosia.utils.canRestartSelf
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.time.ZoneId
import java.util.UUID

private const val ONBOARDING_PROGRESS_TOKEN_USER_ID = "onboarding"
private val VALID_BUSINESS_TYPES = setOf("store", "restaurant", "freelance")

private suspend fun ApplicationCall.respondConflictIfInitialSetupCompleted(configService: ConfigService): Boolean {
    if (configService.getConfig() == null) return false
    respond(HttpStatusCode.Conflict, mapOf("message" to "Initial setup already completed"))
    return true
}

fun Application.configureInitialSetup() {
    routing {
        route("/initial-setup") { initialSetupRoutes() }
    }
}

private fun Route.initialSetupRoutes() {
    get("") {
        val configService = ConfigService()
        val config = configService.getConfig()
        val needsBusinessType = config != null && !config.businessTypeConfirmed
        call.respond(
            HttpStatusCode.OK,
            InitialSetupStatus(initialized = config != null, needsBusinessType = needsBusinessType),
        )
    }

    post("") {
        val initialSetupRequest = call.receive<InitialSetupRequest>()

        val configService = ConfigService()
        val existingConfig = configService.getConfig()
        if (existingConfig != null) {
            if (!existingConfig.businessTypeConfirmed) {
                val businessType = initialSetupRequest.businessType
                if (businessType == null || businessType !in VALID_BUSINESS_TYPES) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Invalid business type"))
                    return@post
                }

                val saved =
                    configService.updateConfig(
                        existingConfig.copy(businessType = businessType, businessTypeConfirmed = true),
                    )
                if (!saved) {
                    throw InitialSetupException("Failed to update business type")
                }

                call.respond(HttpStatusCode.OK, mapOf("message" to "Business type updated"))
                return@post
            }

            call.respond(HttpStatusCode.Conflict, mapOf("message" to "Initial setup already completed"))
            return@post
        }

        val businessType = initialSetupRequest.businessType
        val userName = initialSetupRequest.userName?.trim()
        val userPassword = initialSetupRequest.userPassword
        val userPin = initialSetupRequest.userPin
        val businessName = initialSetupRequest.businessName?.trim()
        val businessCurrency = initialSetupRequest.businessCurrency
        val timezone = initialSetupRequest.timezone

        if (businessType == null || businessType !in VALID_BUSINESS_TYPES) {
            call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Invalid business type"))
            return@post
        }
        if (userName.isNullOrEmpty() || userPassword.isNullOrEmpty() || userPin.isNullOrEmpty()) {
            call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Missing user data"))
            return@post
        }
        if (businessName.isNullOrEmpty() || businessCurrency.isNullOrEmpty() || timezone.isNullOrEmpty()) {
            call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Missing business data"))
            return@post
        }
        if (timezone !in ZoneId.getAvailableZoneIds()) {
            call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Invalid timezone: $timezone"))
            return@post
        }

        val taxId = initialSetupRequest.businessTaxId ?: initialSetupRequest.businessRFC
        val logoUrl = initialSetupRequest.businessLogoUrl ?: initialSetupRequest.businessLogo

        val applicationEnvironment = call.application.environment
        val rolesService = RolesService(applicationEnvironment)
        val usersService = UsersService(applicationEnvironment)
        val permissionsService = PermissionsService()
        val currencyService = CurrencyService()

        val currency =
            currencyService.getByAcronym(businessCurrency)
                ?: return@post call.respond(
                    HttpStatusCode.NotFound,
                    mapOf("message" to "Unknown currency acronym: $businessCurrency"),
                )

        val (userId, roleId) =
            transaction {
                val roleId =
                    rolesService.addRole(Role(role = "Admin", password = userPassword, isAdmin = true))
                        ?: throw InitialSetupException("Failed to create admin role")

                permissionsService.assignAllEnabledToRole(roleId)

                val userId =
                    usersService.addUser(User(name = userName, pin = userPin, role = roleId))
                        ?: throw InitialSetupException("Failed to create user")

                val saved =
                    configService.updateConfig(
                        Config(
                            businessType = businessType,
                            businessName = businessName,
                            businessProfession = initialSetupRequest.businessProfession,
                            businessAddress = initialSetupRequest.businessAddress,
                            businessPhone = initialSetupRequest.businessPhone,
                            businessEmail = initialSetupRequest.businessEmail,
                            businessTaxId = taxId,
                            businessLogoUrl = logoUrl,
                            businessTypeConfirmed = true,
                            timezone = timezone,
                        ),
                    )
                if (!saved) throw InitialSetupException("Failed to save config")

                val currencyId = currency.id ?: throw InitialSetupException("Currency ID missing")
                if (!currencyService.setBaseCurrencyById(currencyId)) {
                    throw InitialSetupException("Failed to set base currency")
                }

                userId to roleId
            }

        val nwcSaved =
            initialSetupRequest.nwcUri?.takeIf { it.isNotBlank() }?.let { uri ->
                try {
                    SecretsStore.setSecret("nwc-uri", uri)
                    logger.info("NWC URI saved to ambrosia.conf — hot-reloading backend")
                    val walletAdminNotificationService =
                        WalletAdminNotificationService(createConfiguredAdminNotificationService(call.application.environment))
                    ActiveLightningBackend.reinitializeNwcBackend(uri, call.application) { paymentNotification ->
                        walletAdminNotificationService.notifyIncomingPaymentReceived(paymentNotification)
                    }
                    true
                } catch (exception: Exception) {
                    logger.error("Failed to save or activate NWC URI: ${exception.message}")
                    false
                }
            } ?: false

        val trimmedPhoenixdUrl = initialSetupRequest.phoenixdUrl?.trim()
        val phoenixdPassword = initialSetupRequest.phoenixdPassword
        val phoenixdRemoteSaved =
            if (
                initialSetupRequest.phoenixdRemote != true ||
                trimmedPhoenixdUrl.isNullOrBlank() ||
                phoenixdPassword.isNullOrBlank()
            ) {
                false
            } else {
                try {
                    File(datadir.toString(), "ambrosia.conf").appendText(
                        "\nphoenixd-remote=true\nphoenixd-url=$trimmedPhoenixdUrl\n",
                    )
                    SecretsStore.setSecret("phoenixd-password", phoenixdPassword)
                    logger.info("Remote phoenixd node saved to ambrosia.conf — hot-reloading backend")
                    ActiveLightningBackend.reinitializePhoenixBackend(trimmedPhoenixdUrl, phoenixdPassword)
                    true
                } catch (exception: Exception) {
                    logger.error("Failed to save or activate remote phoenixd node: ${exception.message}")
                    false
                }
            }

        call.respond(
            HttpStatusCode.Created,
            InitialSetupResponse(
                message = "Initial setup completed",
                userId = userId,
                roleId = roleId,
                nwcSaved = nwcSaved,
                phoenixdRemoteSaved = phoenixdRemoteSaved,
            ),
        )
    }

    post("/test-phoenixd-connection") {
        val configService = ConfigService()
        if (call.respondConflictIfInitialSetupCompleted(configService)) return@post

        val testConnectionRequest = call.receive<TestPhoenixdConnectionRequest>()
        val candidateNodeInfo =
            PhoenixService.testCandidateNodeConnection(
                testConnectionRequest.phoenixdUrl,
                testConnectionRequest.phoenixdPassword,
            )
        call.respond(HttpStatusCode.OK, candidateNodeInfo)
    }

    post("/restore") {
        val configService = ConfigService()
        if (call.respondConflictIfInitialSetupCompleted(configService)) return@post

        var backupPassword: String? = null
        var operationId: String? = null
        var temporaryBackupFile: Path? = null
        var bytesUploaded = 0L
        try {
            call.receiveMultipart().forEachPart { part ->
                when (part) {
                    is PartData.FormItem -> {
                        if (part.name == "password") backupPassword = part.value
                        if (part.name == "operationId") operationId = part.value
                    }

                    is PartData.FileItem -> {
                        if (part.name == "backup") {
                            val onRestoreProgress = backupProgressReporter(operationId)
                            val totalUploadBytes = call.request.contentLength()
                            temporaryBackupFile =
                                receiveChannelToTempFile(part.provider) { bytesReceived ->
                                    bytesUploaded += bytesReceived
                                    onRestoreProgress(BackupProgressPhase.UPLOADING, bytesUploaded, totalUploadBytes)
                                }
                        }
                    }

                    else -> {}
                }
                part.release()
            }

            val password = backupPassword
            val backupFile = temporaryBackupFile
            if (password.isNullOrEmpty() || backupFile == null) {
                call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Missing password or backup file"))
                return@post
            }

            val backupService = BackupService()
            val importedManifest =
                Files.newInputStream(backupFile).use { backupInputStream ->
                    backupService.importBackup(backupInputStream, password.toCharArray(), backupProgressReporter(operationId))
                }

            call.respond(
                HttpStatusCode.OK,
                mapOf("message" to "Backup restored", "businessName" to importedManifest.businessName),
            )
        } catch (invalidBackup: IllegalArgumentException) {
            call.respond(
                HttpStatusCode.BadRequest,
                mapOf("message" to (invalidBackup.message ?: "Invalid backup file")),
            )
        } catch (unsafeBackup: SecurityException) {
            logger.warn("Rejected backup restore with an unsafe path: ${unsafeBackup.message}")
            call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Invalid backup file"))
        } finally {
            temporaryBackupFile?.let { Files.deleteIfExists(it) }
            operationId?.let { BackupProgressNotifier.unregister(it) }
        }
    }

    post("/progress-token") {
        val configService = ConfigService()
        if (call.respondConflictIfInitialSetupCompleted(configService)) return@post

        val operationId = UUID.randomUUID().toString()
        val tokenService = TokenService(call.application.environment)
        val progressToken = tokenService.generateBackupProgressToken(ONBOARDING_PROGRESS_TOKEN_USER_ID, operationId)
        call.respond(HttpStatusCode.OK, mapOf("operationId" to operationId, "token" to progressToken))
    }

    post("/confirm-pending-restore") {
        val configService = ConfigService()
        if (call.respondConflictIfInitialSetupCompleted(configService)) return@post

        val backupService = BackupService()
        backupService.stagedOperationId()?.let { operationId ->
            val tokenService = TokenService(call.application.environment)
            backupService.writeConfirmationToken(tokenService.generateBackupConfirmationToken(operationId))
            if (call.canRestartSelf()) scheduleProcessRestart()
        }
        call.respond(HttpStatusCode.OK)
    }
}
