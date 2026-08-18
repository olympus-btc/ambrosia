package pos.ambrosia

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.context
import com.github.ajalt.clikt.core.main
import com.github.ajalt.clikt.output.MordantHelpFormatter
import com.github.ajalt.clikt.parameters.groups.OptionGroup
import com.github.ajalt.clikt.parameters.groups.provideDelegate
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.defaultLazy
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.int
import com.github.ajalt.mordant.rendering.TextColors.green
import com.github.ajalt.mordant.rendering.TextColors.yellow
import io.ktor.network.tls.certificates.buildKeyStore
import io.ktor.network.tls.certificates.saveToFile
import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.applicationEnvironment
import io.ktor.server.engine.connector
import io.ktor.server.engine.embeddedServer
import io.ktor.server.engine.sslConnector
import io.ktor.server.netty.Netty
import kotlinx.io.buffered
import kotlinx.io.files.Path
import kotlinx.io.files.SystemFileSystem
import kotlinx.io.writeString
import pos.ambrosia.config.AppConfig
import pos.ambrosia.config.EnvVars
import pos.ambrosia.config.InjectLogs
import pos.ambrosia.config.ListValueSource
import pos.ambrosia.config.SeedGenerator
import pos.ambrosia.config.readConfValues
import pos.ambrosia.config.replaceConfFileProperty
import pos.ambrosia.config.writeConfValues
import pos.ambrosia.db.DatabaseConnection
import pos.ambrosia.services.VapidKeyService
import pos.ambrosia.services.VapidKeys
import java.io.File
import java.security.KeyStore

val userHome = System.getProperty("user.home")

val datadir: Path =
    System.getenv()[EnvVars.AMBROSIA_DATADIR]?.let { Path(it) }
        ?: Path(Path(userHome), ".Ambrosia-POS")

val phoenixDatadir: Path =
    System.getenv()[EnvVars.PHOENIX_DATADIR]?.let { Path(it) }
        ?: Path(Path(userHome), ".phoenix")

fun main(args: Array<String>) = Ambrosia().main(args)

class Ambrosia : CliktCommand() {
    val appVersion: String = Ambrosia::class.java.getPackage().implementationVersion ?: "-dev"
    private val confFile = Path(datadir, "ambrosia.conf")
    private val phoenixConfFile = Path(phoenixDatadir, "phoenix.conf")

    init {
        SystemFileSystem.createDirectories(datadir)
        InjectLogs.ensureLogConfig(datadir.toString())
        ensureWebPushConfig()

        context {
            valueSource = ListValueSource.fromFile(confFile)
            helpFormatter = { MordantHelpFormatter(it, showDefaultValues = true) }
        }
    }

    inner class DaemonOptions : OptionGroup(name = "DaemonOptions") {
        val httpBindIp by
            option("--http-bind-ip", help = "Bind ip for the http api").defaultLazy {
                val value = "127.0.0.1" // Default value
                SystemFileSystem.sink(this@Ambrosia.confFile, append = true).buffered().use {
                    it.writeString("\nhttp-bind-ip=$value")
                }
                value
            }
        val httpBindPort by
            option("--http-bind-port", help = "Bind port for the http api").int().defaultLazy {
                val value = 9154 // Default value
                SystemFileSystem.sink(this@Ambrosia.confFile, append = true).buffered().use {
                    it.writeString("\nhttp-bind-port=$value")
                }
                value
            }
        val sslBindPort by
            option("--ssl-bind-port", help = "Bind port for the https api").int().defaultLazy {
                val value = 9443
                SystemFileSystem.sink(this@Ambrosia.confFile, append = true).buffered().use {
                    it.writeString("\nssl-bind-port=$value")
                }
                value
            }
        val secret by
            option("--secret", help = "Secret key for the server", envvar = "AMBROSIA_SECRET").defaultLazy {
                val seed = SeedGenerator.generateSeed() // Generate a new seed
                SystemFileSystem.sink(this@Ambrosia.confFile, append = true).buffered().use {
                    it.writeString("\nsecret=$seed")
                }
                seed
            }
        val nwcUri by
            option(
                "--nwc-uri",
                help = "NWC connection URI (nostr+walletconnect://pubkey?relay=...&secret=...)",
                envvar = "NWC_URI",
            )
        val phoenixdUrl by
            option("--phoenixd-url", help = "phoenixd API url, eg http://phoenixd:9740").defaultLazy {
                val value = "http://localhost:9740" // Default value
                SystemFileSystem.sink(this@Ambrosia.confFile, append = true).buffered().use {
                    it.writeString("\nphoenixd-url=$value")
                }
                value
            }
        val phoenixdPassword by
            option(
                "--phoenixd-password",
                help = "http-password for phoenixd API",
                envvar = "PHOENIXD_PASSWORD",
            ).defaultLazy {
                if (nwcUri != null) return@defaultLazy ""
                AppConfig.loadConfig()
                val value =
                    AppConfig.getPhoenixProperty("http-password")
                        ?: throw Exception(
                            "phoenixd http-password on found in phoenix.conf, please provide it with --phoenixd-password or in the phoenix.conf file",
                        )
                value
            }
        val jwtAccessTokenExpirationSeconds by
            option("--jwt-access-token-expiration", help = "Access token expiration in seconds").default("60")
        val phoenixdWebhookSecret by
            option(
                "--phoenixd-webhook-secret",
                help = "webhook-secret for phoenixd webhooks",
                envvar = "PHOENIXD_WEBHOOK_SECRET",
            ).defaultLazy {
                if (nwcUri != null) return@defaultLazy ""
                AppConfig.loadConfig()
                val existing = AppConfig.getPhoenixProperty("webhook-secret")
                existing
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
                val host =
                    when {
                        docker -> "ambrosia"
                        httpBindIp == "0.0.0.0" || httpBindIp == "::" -> "127.0.0.1"
                        else -> httpBindIp
                    }
                "http://$host:$httpBindPort/webhook/phoenixd"
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
    }

    private val options by DaemonOptions()

    override fun run() {
        echo(green("Running Ambrosia POS Server v$appVersion"))
        logger.info("Using data directory: $datadir")

        DatabaseConnection.init()
        Runtime.getRuntime().addShutdownHook(Thread { DatabaseConnection.close() })

        try {
            val (keyStore, storePassword, privateKeyPassword) = ensureKeyStore()

            val server =
                embeddedServer(
                    Netty,
                    environment =
                        applicationEnvironment {
                            config =
                                MapApplicationConfig().apply {
                                    put("jwt.accessTokenExpirationSeconds", options.jwtAccessTokenExpirationSeconds)
                                    put("jwt.issuer", "ambrosia-pos")
                                    put("jwt.audience", "ambrosia-pos-users")
                                    put("secret", options.secret)
                                    put("phoenixd-url", options.phoenixdUrl)
                                    put("phoenixd-password", options.phoenixdPassword)
                                    put("phoenix.webhook-secret", options.phoenixdWebhookSecret)
                                    options.nwcUri?.let { put("nwc-uri", it) }
                                    options.webPushVapidPublicKey.takeIf { it.isNotBlank() }?.let {
                                        put("web-push.vapid-public-key", it)
                                    }
                                    options.webPushVapidPrivateKey.takeIf { it.isNotBlank() }?.let {
                                        put("web-push.vapid-private-key", it)
                                    }
                                    options.webPushVapidSubject.takeIf { it.isNotBlank() }?.let {
                                        put("web-push.vapid-subject", it)
                                    }
                                    options.webPushEnabled.takeIf { it.isNotBlank() }?.let {
                                        put("web-push.enabled", it)
                                    }
                                }
                        },
                    configure = {
                        connector {
                            port = options.httpBindPort
                            host = options.httpBindIp
                        }
                        sslConnector(
                            keyStore = keyStore,
                            keyAlias = "ambrosia",
                            keyStorePassword = { storePassword.toCharArray() },
                            privateKeyPassword = { privateKeyPassword.toCharArray() },
                        ) {
                            port = options.sslBindPort
                            host = options.httpBindIp
                        }
                    },
                    module = { Api().run { module() } },
                )
            if (options.nwcUri == null) {
                ensurePhoenixWebhookConfigured(options.phoenixdWebhookUrl)
            } else {
                logger.info("NWC mode active, skipping Phoenix webhook configuration")
            }
            server.start(wait = true)
        } catch (e: Exception) {
            echo("Error starting server: ${e.message}", err = true)
            throw e
        }
    }

    private data class KeyStoreInfo(
        val keyStore: KeyStore,
        val storePassword: String,
        val privateKeyPassword: String,
    )

    private fun ensureKeyStore(): KeyStoreInfo {
        val keyStoreFile = File(datadir.toString(), "keystore.jks")
        val privateKeyPassword = options.secret
        val storePassword =
            SeedGenerator.generateSecureSeed(
                seedInput = options.secret,
            )

        if (!keyStoreFile.exists()) {
            val keyStore =
                buildKeyStore {
                    certificate("ambrosia") {
                        password = privateKeyPassword
                        domains = listOf("localhost", "127.0.0.1", "0.0.0.0")
                    }
                }
            keyStore.saveToFile(keyStoreFile, storePassword)
            echo(yellow("Generated self-signed certificate using server secret"))
        }

        val keyStore =
            KeyStore.getInstance("JKS").apply {
                load(keyStoreFile.inputStream(), storePassword.toCharArray())
            }

        return KeyStoreInfo(keyStore, storePassword, privateKeyPassword)
    }

    private fun ensureWebPushConfig() {
        val existingValues = readConfValues(confFile)
        val environmentVapidKeys = readEnvironmentVapidKeysOrNull()
        val missingVapidConfig =
            WEB_PUSH_VAPID_CONF_KEYS.any { existingValues[it].isNullOrBlank() }
        val vapidKeys =
            if (missingVapidConfig) {
                environmentVapidKeys ?: VapidKeyService.generateKeys(
                    existingValues[WEB_PUSH_VAPID_SUBJECT_CONF] ?: VapidKeyService.DEFAULT_SUBJECT,
                )
            } else {
                environmentVapidKeys ?: VapidKeys(
                    publicKey = existingValues.getValue(WEB_PUSH_VAPID_PUBLIC_KEY_CONF),
                    privateKey = existingValues.getValue(WEB_PUSH_VAPID_PRIVATE_KEY_CONF),
                    subject = existingValues.getValue(WEB_PUSH_VAPID_SUBJECT_CONF),
                )
            }

        val nextValues =
            mapOf(
                WEB_PUSH_ENABLED_CONF to (existingValues[WEB_PUSH_ENABLED_CONF] ?: System.getenv("WEB_PUSH_ENABLED") ?: "true"),
                WEB_PUSH_VAPID_PUBLIC_KEY_CONF to vapidKeys.publicKey,
                WEB_PUSH_VAPID_PRIVATE_KEY_CONF to vapidKeys.privateKey,
                WEB_PUSH_VAPID_SUBJECT_CONF to vapidKeys.subject,
            )

        if (nextValues.any { (key, value) -> existingValues[key] != value }) {
            writeConfValues(confFile, nextValues)
            if (missingVapidConfig) {
                println(yellow("Generated Web Push VAPID keys in ambrosia.conf"))
            }
        }
    }

    private fun readEnvironmentVapidKeysOrNull(): VapidKeys? {
        val publicKey = System.getenv("WEB_PUSH_VAPID_PUBLIC_KEY")?.takeIf { it.isNotBlank() }
        val privateKey = System.getenv("WEB_PUSH_VAPID_PRIVATE_KEY")?.takeIf { it.isNotBlank() }
        val subject = System.getenv("WEB_PUSH_VAPID_SUBJECT")?.takeIf { it.isNotBlank() }

        if (publicKey == null && privateKey == null && subject == null) {
            return null
        }

        require(publicKey != null && privateKey != null && subject != null) {
            "WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY and WEB_PUSH_VAPID_SUBJECT must be configured together"
        }

        return VapidKeys(publicKey = publicKey, privateKey = privateKey, subject = subject)
    }

    private fun readRequiredConfigValue(key: String): String =
        readConfValues(confFile)[key] ?: throw IllegalStateException("$key not found in ambrosia.conf")

    private fun ensurePhoenixWebhookConfigured(url: String) {
        File(phoenixConfFile.toString()).parentFile?.mkdirs()
        if (replaceConfFileProperty(phoenixConfFile, "webhook", url)) {
            logger.info("Updated phoenix webhook entry to webhook=$url in $phoenixConfFile")
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
