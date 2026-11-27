package pos.ambrosia

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.context
import com.github.ajalt.clikt.core.main
import com.github.ajalt.clikt.core.terminal
import com.github.ajalt.clikt.output.MordantHelpFormatter
import com.github.ajalt.clikt.parameters.groups.OptionGroup
import com.github.ajalt.clikt.parameters.groups.provideDelegate
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.defaultLazy
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.choice
import com.github.ajalt.clikt.parameters.types.int
import com.github.ajalt.mordant.rendering.TextColors.green
import com.github.ajalt.mordant.rendering.TextColors.yellow
import com.github.ajalt.mordant.terminal.prompt
import io.ktor.network.tls.certificates.buildKeyStore
import io.ktor.network.tls.certificates.saveToFile
import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.EmbeddedServer
import io.ktor.server.engine.applicationEnvironment
import io.ktor.server.engine.connector
import io.ktor.server.engine.embeddedServer
import io.ktor.server.engine.sslConnector
import io.ktor.server.netty.Netty
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.io.buffered
import kotlinx.io.files.Path
import kotlinx.io.files.SystemFileSystem
import kotlinx.io.writeString
import pos.ambrosia.config.AppConfig
import pos.ambrosia.config.EnvVars
import pos.ambrosia.config.ListValueSource
import pos.ambrosia.config.SeedGenerator
import pos.ambrosia.config.readConfValues
import pos.ambrosia.config.replaceConfFileProperty
import pos.ambrosia.config.writeConfValues
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.logging.LogLevels
import pos.ambrosia.logging.LoggingConfiguration
import pos.ambrosia.services.BackupService
import pos.ambrosia.services.ClientLogReportService
import pos.ambrosia.services.LogSettingsService
import pos.ambrosia.services.SecretsStore
import pos.ambrosia.services.TokenService
import pos.ambrosia.services.VapidKeyService
import pos.ambrosia.services.VapidKeys
import pos.ambrosia.utils.RolePasswordResetter
import java.io.File
import java.security.KeyStore
import kotlin.system.exitProcess

val userHome = System.getProperty("user.home")

val datadir: Path =
    System.getenv()[EnvVars.AMBROSIA_DATADIR]?.let { ambrosiaDataDirectoryFromEnvironment -> Path(ambrosiaDataDirectoryFromEnvironment) }
        ?: Path(Path(userHome), ".Ambrosia-POS")

val phoenixDatadir: Path =
    System.getenv()[EnvVars.PHOENIX_DATADIR]?.let { phoenixDataDirectoryFromEnvironment -> Path(phoenixDataDirectoryFromEnvironment) }
        ?: Path(Path(userHome), ".phoenix")

var pendingDataImportWasApplied: Boolean = false
    private set

var runningEmbeddedServer: EmbeddedServer<*, *>? = null
    private set

fun main(commandLineArguments: Array<String>) {
    val logSettingsService = LogSettingsService()
    LoggingConfiguration.install(datadir.toString(), logSettingsService.readPersistedFileRetention())
    ClientLogReportService.clientErrorReportingEnabled = logSettingsService.readPersistedClientErrorReportingEnabled()
    pendingDataImportWasApplied = BackupService().applyPendingImport()
    Ambrosia().main(commandLineArguments)
}

fun scheduleProcessRestart() {
    CoroutineScope(Dispatchers.IO).launch {
        delay(500)
        runningEmbeddedServer?.stopSuspend()
        exitProcess(0)
    }
}

fun computePhoenixdWebhookUrl(
    docker: Boolean,
    httpBindIp: String,
    httpBindPort: Int,
): String {
    val webhookHost =
        when {
            docker -> "ambrosia"
            httpBindIp == "0.0.0.0" || httpBindIp == "::" -> "127.0.0.1"
            else -> httpBindIp
        }
    return "http://$webhookHost:$httpBindPort/webhook/phoenixd"
}

fun isKeyStoreOpenableWithPassword(
    keyStoreFile: File,
    storePassword: String,
): Boolean =
    runCatching {
        KeyStore.getInstance("JKS").load(keyStoreFile.inputStream(), storePassword.toCharArray())
    }.isSuccess

fun generateSelfSignedKeyStore(
    keyStoreFile: File,
    storePassword: String,
    privateKeyPassword: String,
) {
    val keyStore =
        buildKeyStore {
            certificate("ambrosia") {
                password = privateKeyPassword
                domains = listOf("localhost", "127.0.0.1", "0.0.0.0")
            }
        }
    keyStore.saveToFile(keyStoreFile, storePassword)
}

fun migrateKeyStorePassword(
    keyStoreFile: File,
    legacyStorePassword: String,
    legacyPrivateKeyPassword: String,
    newStorePassword: String,
    newPrivateKeyPassword: String,
): Boolean =
    runCatching {
        val legacyKeyStore =
            KeyStore.getInstance("JKS").apply {
                load(keyStoreFile.inputStream(), legacyStorePassword.toCharArray())
            }
        val privateKey = legacyKeyStore.getKey("ambrosia", legacyPrivateKeyPassword.toCharArray())
        val certificateChain = legacyKeyStore.getCertificateChain("ambrosia")
        legacyKeyStore.setKeyEntry("ambrosia", privateKey, newPrivateKeyPassword.toCharArray(), certificateChain)
        legacyKeyStore.saveToFile(keyStoreFile, newStorePassword)
    }.isSuccess

class Ambrosia : CliktCommand() {
    val appVersion: String = Ambrosia::class.java.getPackage().implementationVersion ?: "-dev"
    private val confFile = Path(datadir, "ambrosia.conf")
    private val phoenixConfFile = Path(phoenixDatadir, "phoenix.conf")

    init {
        SystemFileSystem.createDirectories(datadir)
        attemptAutoUnlock()
        ensureWebPushConfig()

        context {
            valueSource = ListValueSource.fromFile(confFile)
            helpFormatter = { helpFormatterContext -> MordantHelpFormatter(helpFormatterContext, showDefaultValues = true) }
        }
    }

    inner class DaemonOptions : OptionGroup(name = "DaemonOptions") {
        val httpBindIp by
            option("--http-bind-ip", help = "Bind ip for the http api").defaultLazy {
                val defaultHttpBindIp = "127.0.0.1"
                SystemFileSystem.sink(this@Ambrosia.confFile, append = true).buffered().use { ambrosiaConfFileSink ->
                    ambrosiaConfFileSink.writeString("\nhttp-bind-ip=$defaultHttpBindIp")
                }
                defaultHttpBindIp
            }
        val httpBindPort by
            option("--http-bind-port", help = "Bind port for the http api").int().defaultLazy {
                val defaultHttpBindPort = 9154
                SystemFileSystem.sink(this@Ambrosia.confFile, append = true).buffered().use { ambrosiaConfFileSink ->
                    ambrosiaConfFileSink.writeString("\nhttp-bind-port=$defaultHttpBindPort")
                }
                defaultHttpBindPort
            }
        val sslBindPort by
            option("--ssl-bind-port", help = "Bind port for the https api").int().defaultLazy {
                val defaultSslBindPort = 9443
                SystemFileSystem.sink(this@Ambrosia.confFile, append = true).buffered().use { ambrosiaConfFileSink ->
                    ambrosiaConfFileSink.writeString("\nssl-bind-port=$defaultSslBindPort")
                }
                defaultSslBindPort
            }
        val secret by
            option("--secret", help = "Secret key for the server", envvar = EnvVars.AMBROSIA_SECRET).defaultLazy {
                val generatedServerSecret = SeedGenerator.generateSeed()
                SystemFileSystem.sink(this@Ambrosia.confFile, append = true).buffered().use { ambrosiaConfFileSink ->
                    ambrosiaConfFileSink.writeString("\nsecret=$generatedServerSecret")
                }
                generatedServerSecret
            }
        val keystorePassword by
            option(
                "--keystore-password",
                help = "Password for the TLS keystore, independent from --secret",
                envvar = EnvVars.AMBROSIA_KEYSTORE_PASSWORD,
            ).defaultLazy {
                val generatedKeystorePassword = SeedGenerator.generateSeed()
                SystemFileSystem.sink(this@Ambrosia.confFile, append = true).buffered().use { ambrosiaConfFileSink ->
                    ambrosiaConfFileSink.writeString("\nkeystore-password=$generatedKeystorePassword")
                }
                generatedKeystorePassword
            }
        val nwcUri by
            option(
                "--nwc-uri",
                help = "NWC connection URI (nostr+walletconnect://pubkey?relay=...&secret=...)",
                envvar = "NWC_URI",
            )
        val phoenixdUrl by
            option(
                "--phoenixd-url",
                help = "phoenixd API url, eg http://phoenixd:9740",
                envvar = "PHOENIXD_URL",
            ).defaultLazy {
                val defaultPhoenixdUrl = "http://localhost:9740"
                SystemFileSystem.sink(this@Ambrosia.confFile, append = true).buffered().use { ambrosiaConfFileSink ->
                    ambrosiaConfFileSink.writeString("\nphoenixd-url=$defaultPhoenixdUrl")
                }
                defaultPhoenixdUrl
            }
        val phoenixdPassword by
            option(
                "--phoenixd-password",
                help = "http-password for phoenixd API",
                envvar = "PHOENIXD_PASSWORD",
            ).defaultLazy {
                if (nwcUri != null) return@defaultLazy ""
                AppConfig.loadConfig()
                val phoenixdHttpPasswordFromPhoenixConf =
                    AppConfig.getPhoenixProperty("http-password")
                        ?: throw Exception(
                            "phoenixd http-password on found in phoenix.conf, please provide it with --phoenixd-password or in the phoenix.conf file",
                        )
                phoenixdHttpPasswordFromPhoenixConf
            }
        val phoenixdRemote by
            option(
                "--phoenixd-remote",
                help = "Connect to a phoenixd node running remotely instead of a local one",
                envvar = "PHOENIXD_REMOTE",
            ).flag()
        val jwtAccessTokenExpirationSeconds by
            option("--jwt-access-token-expiration", help = "Access token expiration in seconds").default("60")
        val rateLimitRequestsPerMinute by
            option("--rate-limit-requests-per-minute", help = "Global per-IP request limit per minute").default("300")
        val phoenixdWebhookSecret by
            option(
                "--phoenixd-webhook-secret",
                help = "webhook-secret for phoenixd webhooks",
                envvar = "PHOENIXD_WEBHOOK_SECRET",
            ).defaultLazy {
                if (nwcUri != null) return@defaultLazy ""
                AppConfig.loadConfig()
                val phoenixdWebhookSecretFromPhoenixConf = AppConfig.getPhoenixProperty("webhook-secret")
                phoenixdWebhookSecretFromPhoenixConf
                    ?: throw Exception(
                        "phoenixd webhook-secret not found in phoenix.conf, please provide it with --phoenixd-webhook-secret or set webhook-secret in phoenix.conf",
                    )
            }
        val docker by
            option("--docker", help = "Running in a Docker container", envvar = "IS_DOCKER").flag()
        val phoenixdWebhookUrl by
            option(
                "--phoenixd-webhook",
                help = "webhook URL to register in phoenix.conf (webhook=<url>)",
                envvar = "PHOENIXD_WEBHOOK_URL",
            ).defaultLazy {
                computePhoenixdWebhookUrl(docker, httpBindIp, httpBindPort)
            }
        val webPushVapidPublicKey by
            option(
                "--web-push-vapid-public-key",
                help = "VAPID public key for browser Web Push subscriptions",
                envvar = "WEB_PUSH_VAPID_PUBLIC_KEY",
            ).defaultLazy { this@Ambrosia.readRequiredConfigValue(WEB_PUSH_VAPID_PUBLIC_KEY_CONF) }
        val webPushVapidPrivateKey by
            option(
                "--web-push-vapid-private-key",
                help = "VAPID private key for JVM Web Push dispatch",
                envvar = "WEB_PUSH_VAPID_PRIVATE_KEY",
            ).defaultLazy { this@Ambrosia.readRequiredConfigValue(WEB_PUSH_VAPID_PRIVATE_KEY_CONF) }
        val webPushVapidSubject by
            option(
                "--web-push-vapid-subject",
                help = "VAPID subject, usually a mailto: or https: contact URI",
                envvar = "WEB_PUSH_VAPID_SUBJECT",
            ).defaultLazy { this@Ambrosia.readRequiredConfigValue(WEB_PUSH_VAPID_SUBJECT_CONF) }
        val webPushEnabled by
            option(
                "--web-push-enabled",
                help = "Set to false to disable browser Web Push dispatch",
                envvar = "WEB_PUSH_ENABLED",
            ).defaultLazy { this@Ambrosia.readRequiredConfigValue(WEB_PUSH_ENABLED_CONF) }
        val logLevel by
            option(
                "--log-level",
                help = "Server log level (ERROR, WARN, INFO, DEBUG)",
                envvar = "AMBROSIA_LOG_LEVEL",
            ).choice(*LogLevels.CONFIGURABLE_SERVER_LEVELS.toTypedArray(), ignoreCase = true)
                .default(LogLevels.DEFAULT_SERVER_LEVEL)
    }

    private val daemonOptions by DaemonOptions()

    private val resetRolePassword by
        option(
            "--reset-role-password",
            help =
                "Reset the password of a role (by name or id) directly in the database and exit. " +
                    "Does not start the server. The new password is prompted interactively.",
            metavar = "ROLE",
        )

    override fun run() {
        resetRolePassword?.let {
            resetRolePasswordAndExit(it)
            return
        }

        echo(green("Running Ambrosia POS Server v$appVersion"))
        LoggingConfiguration.applyLevel(daemonOptions.logLevel)
        logger.info("Starting Ambrosia POS Server v{}", appVersion)
        logger.info("Using data directory: $datadir")
        val serverLogFileRetention = LoggingConfiguration.currentFileRetention()
        logger.info(
            "Writing server logs to {} with level {}, keeping {} days up to {} MB",
            LoggingConfiguration.logsDirectory(datadir.toString()),
            daemonOptions.logLevel,
            serverLogFileRetention.retentionDays,
            serverLogFileRetention.maximumTotalSizeMegabytes,
        )

        DatabaseConnection.init()
        Runtime.getRuntime().addShutdownHook(Thread { DatabaseConnection.close() })

        try {
            ensureNwcUriPersisted()
            ensurePhoenixdPasswordPersisted()
            ensurePhoenixdWebhookSecretPersisted()
            val (keyStore, storePassword, privateKeyPassword) = ensureKeyStore()

            val server =
                embeddedServer(
                    Netty,
                    environment =
                        applicationEnvironment {
                            config =
                                MapApplicationConfig().apply {
                                    put("jwt.accessTokenExpirationSeconds", daemonOptions.jwtAccessTokenExpirationSeconds)
                                    put("rate-limit.requestsPerMinute", daemonOptions.rateLimitRequestsPerMinute)
                                    put("jwt.issuer", TokenService.JWT_ISSUER)
                                    put("jwt.audience", TokenService.JWT_AUDIENCE)
                                    put("docker", daemonOptions.docker.toString())
                                    put("secret", daemonOptions.secret)
                                    put("phoenixd-url", daemonOptions.phoenixdUrl)
                                    put("phoenixd-remote", daemonOptions.phoenixdRemote.toString())
                                    daemonOptions.webPushVapidPublicKey
                                        .takeIf { webPushOptionValue ->
                                            webPushOptionValue.isNotBlank()
                                        }?.let { webPushOptionValue ->
                                            put("web-push.vapid-public-key", webPushOptionValue)
                                        }
                                    daemonOptions.webPushVapidSubject
                                        .takeIf { webPushOptionValue ->
                                            webPushOptionValue.isNotBlank()
                                        }?.let { webPushOptionValue ->
                                            put("web-push.vapid-subject", webPushOptionValue)
                                        }
                                    daemonOptions.webPushEnabled
                                        .takeIf { webPushOptionValue ->
                                            webPushOptionValue.isNotBlank()
                                        }?.let { webPushOptionValue ->
                                            put("web-push.enabled", webPushOptionValue)
                                        }
                                }
                        },
                    configure = {
                        connector {
                            port = daemonOptions.httpBindPort
                            host = daemonOptions.httpBindIp
                        }
                        sslConnector(
                            keyStore = keyStore,
                            keyAlias = "ambrosia",
                            keyStorePassword = { storePassword.toCharArray() },
                            privateKeyPassword = { privateKeyPassword.toCharArray() },
                        ) {
                            port = daemonOptions.sslBindPort
                            host = daemonOptions.httpBindIp
                        }
                    },
                    module = { Api().run { module() } },
                )
            runningEmbeddedServer = server
            when {
                daemonOptions.nwcUri != null -> {
                    logger.info("NWC mode active, skipping Phoenix webhook configuration")
                }

                daemonOptions.phoenixdRemote -> {
                    logger.info(
                        "Remote phoenixd mode active, skipping local Phoenix webhook configuration. " +
                            "Payment notifications are received via an outbound WebSocket connection " +
                            "to the remote node — no phoenix.conf webhook setup needed.",
                    )
                }

                else -> {
                    ensurePhoenixWebhookConfigured(daemonOptions.phoenixdWebhookUrl)
                }
            }
            server.start(wait = true)
        } catch (serverStartupException: Exception) {
            echo("Error starting server: ${serverStartupException.message}", err = true)
            throw serverStartupException
        }
    }

    private fun resetRolePasswordAndExit(roleArg: String) {
        DatabaseConnection.init()

        val newPassword = terminal.prompt("New password for role '$roleArg'", hideInput = true)
        if (newPassword.isNullOrBlank()) {
            echo("Aborted: no password provided", err = true)
            exitProcess(1)
        }
        val confirmPassword = terminal.prompt("Confirm new password", hideInput = true)
        if (newPassword != confirmPassword) {
            echo("Passwords do not match", err = true)
            exitProcess(1)
        }

        val roleName = RolePasswordResetter.resetPassword(roleArg, newPassword, options.secret)
        if (roleName == null) {
            echo("No active role found matching: $roleArg", err = true)
            exitProcess(1)
        }

        echo(green("Password updated for role '$roleName'. Restart the server and log in with the new password."))
        exitProcess(0)
    }

    private data class KeyStoreInfo(
        val keyStore: KeyStore,
        val storePassword: String,
        val privateKeyPassword: String,
    )

    private fun ensureKeyStore(): KeyStoreInfo {
        val keyStoreFile = File(datadir.toString(), "keystore.jks")
        val privateKeyPassword = daemonOptions.keystorePassword
        val storePassword = SeedGenerator.generateSecureSeed(seedInput = daemonOptions.keystorePassword)

        when {
            !keyStoreFile.exists() -> {
                generateSelfSignedKeyStore(keyStoreFile, storePassword, privateKeyPassword)
                echo(yellow("Generated self-signed certificate using the keystore password"))
            }

            !isKeyStoreOpenableWithPassword(keyStoreFile, storePassword) -> {
                val legacyStorePassword = SeedGenerator.generateSecureSeed(seedInput = daemonOptions.secret)
                val migrated =
                    migrateKeyStorePassword(
                        keyStoreFile,
                        legacyStorePassword,
                        daemonOptions.secret,
                        storePassword,
                        privateKeyPassword,
                    )
                if (migrated) {
                    echo(yellow("Migrated the existing TLS certificate to an independent keystore password"))
                } else {
                    generateSelfSignedKeyStore(keyStoreFile, storePassword, privateKeyPassword)
                    echo(yellow("Existing keystore could not be read; generated a new self-signed certificate"))
                }
            }
        }

        val keyStore =
            KeyStore.getInstance("JKS").apply {
                load(keyStoreFile.inputStream(), storePassword.toCharArray())
            }

        return KeyStoreInfo(keyStore, storePassword, privateKeyPassword)
    }

    private fun attemptAutoUnlock() {
        if (!SecretsStore.isEncryptionActive()) return

        val autoUnlockPassword = System.getenv("AUTO_UNLOCK_PASSWORD") ?: return
        if (!SecretsStore.unlock(autoUnlockPassword.toCharArray())) {
            System.err.println("AUTO_UNLOCK_PASSWORD is set but incorrect — cannot unlock secrets, aborting startup")
            throw IllegalStateException("Invalid AUTO_UNLOCK_PASSWORD")
        }
    }

    private fun ensureWebPushConfig() {
        val existingValues = readConfValues(confFile)
        val missingVapidConfig =
            WEB_PUSH_VAPID_CONF_KEYS.any { vapidConfKey -> existingValues[vapidConfKey].isNullOrBlank() }
        val encryptionIsLocked = SecretsStore.isLocked()
        if (missingVapidConfig && encryptionIsLocked) return

        val environmentVapidKeys = readEnvironmentVapidKeysOrNull()
        val currentDecryptedPrivateKeyOrNull =
            if (missingVapidConfig || encryptionIsLocked) {
                null
            } else {
                SecretsStore.getSecretOrNull(WEB_PUSH_VAPID_PRIVATE_KEY_CONF)
            }
        val vapidKeys =
            if (missingVapidConfig) {
                environmentVapidKeys ?: VapidKeyService.generateKeys(
                    existingValues[WEB_PUSH_VAPID_SUBJECT_CONF] ?: VapidKeyService.DEFAULT_SUBJECT,
                )
            } else {
                environmentVapidKeys ?: VapidKeys(
                    publicKey = existingValues.getValue(WEB_PUSH_VAPID_PUBLIC_KEY_CONF),
                    privateKey = currentDecryptedPrivateKeyOrNull ?: "",
                    subject = existingValues.getValue(WEB_PUSH_VAPID_SUBJECT_CONF),
                )
            }

        val nonSecretValues =
            mapOf(
                WEB_PUSH_ENABLED_CONF to (existingValues[WEB_PUSH_ENABLED_CONF] ?: System.getenv("WEB_PUSH_ENABLED") ?: "true"),
                WEB_PUSH_VAPID_PUBLIC_KEY_CONF to vapidKeys.publicKey,
                WEB_PUSH_VAPID_SUBJECT_CONF to vapidKeys.subject,
            )
        if (nonSecretValues.any { (confKey, confValue) -> existingValues[confKey] != confValue }) {
            writeConfValues(confFile, nonSecretValues)
        }
        if (!encryptionIsLocked && vapidKeys.privateKey != currentDecryptedPrivateKeyOrNull) {
            SecretsStore.setSecret(WEB_PUSH_VAPID_PRIVATE_KEY_CONF, vapidKeys.privateKey)
        }

        if (missingVapidConfig) {
            println(yellow("Generated Web Push VAPID keys in ambrosia.conf"))
        }
    }

    private fun ensureNwcUriPersisted() {
        val nwcUri = daemonOptions.nwcUri ?: return
        if (SecretsStore.isLocked()) return
        if (SecretsStore.getSecretOrNull("nwc-uri") != null) return

        SecretsStore.setSecret("nwc-uri", nwcUri)
    }

    private fun ensurePhoenixdPasswordPersisted() {
        if (SecretsStore.isLocked()) return
        if (SecretsStore.getSecretOrNull("phoenixd-password") != null) return
        if (daemonOptions.phoenixdPassword.isBlank()) return

        SecretsStore.setSecret("phoenixd-password", daemonOptions.phoenixdPassword)
    }

    private fun ensurePhoenixdWebhookSecretPersisted() {
        if (SecretsStore.isLocked()) return
        if (SecretsStore.getSecretOrNull("phoenixd-webhook-secret") != null) return
        if (daemonOptions.phoenixdWebhookSecret.isBlank()) return

        SecretsStore.setSecret("phoenixd-webhook-secret", daemonOptions.phoenixdWebhookSecret)
    }

    private fun readEnvironmentVapidKeysOrNull(): VapidKeys? {
        val publicKey =
            System.getenv("WEB_PUSH_VAPID_PUBLIC_KEY")?.takeIf { environmentVariableValue ->
                environmentVariableValue.isNotBlank()
            }
        val privateKey =
            System.getenv("WEB_PUSH_VAPID_PRIVATE_KEY")?.takeIf { environmentVariableValue ->
                environmentVariableValue.isNotBlank()
            }
        val subject = System.getenv("WEB_PUSH_VAPID_SUBJECT")?.takeIf { environmentVariableValue -> environmentVariableValue.isNotBlank() }

        if (publicKey == null && privateKey == null && subject == null) {
            return null
        }

        require(publicKey != null && privateKey != null && subject != null) {
            "WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY and WEB_PUSH_VAPID_SUBJECT must be configured together"
        }

        return VapidKeys(publicKey = publicKey, privateKey = privateKey, subject = subject)
    }

    private fun readRequiredConfigValue(confKey: String): String =
        readConfValues(confFile)[confKey] ?: throw IllegalStateException("$confKey not found in ambrosia.conf")

    private fun ensurePhoenixWebhookConfigured(webhookUrl: String) {
        File(phoenixConfFile.toString()).parentFile?.mkdirs()
        if (replaceConfFileProperty(phoenixConfFile, "webhook", webhookUrl)) {
            logger.info("Updated phoenix webhook entry to webhook=$webhookUrl in $phoenixConfFile")
        }
    }

    private companion object {
        const val WEB_PUSH_ENABLED_CONF = "web-push-enabled"
        const val WEB_PUSH_VAPID_PUBLIC_KEY_CONF = "web-push-vapid-public-key"
        const val WEB_PUSH_VAPID_PRIVATE_KEY_CONF = "web-push-vapid-private-key"
        const val WEB_PUSH_VAPID_SUBJECT_CONF = "web-push-vapid-subject"
        val WEB_PUSH_VAPID_CONF_KEYS =
            setOf(
                WEB_PUSH_VAPID_PUBLIC_KEY_CONF,
                WEB_PUSH_VAPID_PRIVATE_KEY_CONF,
                WEB_PUSH_VAPID_SUBJECT_CONF,
            )
    }
}
