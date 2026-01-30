package pos.ambrosia

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.context
import com.github.ajalt.clikt.core.main
import com.github.ajalt.clikt.output.MordantHelpFormatter
import com.github.ajalt.clikt.parameters.groups.*
import com.github.ajalt.clikt.parameters.options.*
import com.github.ajalt.clikt.parameters.types.int
import com.github.ajalt.mordant.rendering.TextColors.*
import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.network.tls.certificates.*
import java.security.KeyStore
import java.io.File
import kotlinx.io.buffered
import kotlinx.io.files.Path
import kotlinx.io.files.SystemFileSystem
import kotlinx.io.writeString
import pos.ambrosia.config.EnvVars
import pos.ambrosia.config.InjectLogs
import pos.ambrosia.config.ListValueSource
import pos.ambrosia.config.SeedGenerator
import pos.ambrosia.config.AppConfig
import org.flywaydb.core.Flyway

val userHome = System.getProperty("user.home")

val datadir: Path = System.getenv()[EnvVars.AMBROSIA_DATADIR]?.let { Path(it) } ?: 
  Path(Path(userHome), ".Ambrosia-POS")

val phoenixDatadir: Path = System.getenv()[EnvVars.PHOENIX_DATADIR]?.let { Path(it) } ?: 
  Path(Path(userHome), ".phoenix")
fun main(args: Array<String>) = Ambrosia().main(args)

class Ambrosia : CliktCommand() {
  // En algún archivo de configuración o en Application.kt
  val AppVersion: String = Ambrosia::class.java.getPackage().implementationVersion ?: "-dev"
  private val confFile = Path(datadir, "ambrosia.conf")
  private val phoenixConfFile = Path(phoenixDatadir, "phoenix.conf")

  init {
    SystemFileSystem.createDirectories(datadir)
    InjectLogs.ensureLogConfig(datadir.toString())

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
        val value = 9154 // Dinnerefault value
        SystemFileSystem.sink(this@Ambrosia.confFile, append = true).buffered().use {
          it.writeString("\nhttp-bind-port=$value")
        }
        value
      }
    val secret by
      option("--secret", help = "Secret key for the server").defaultLazy {
        val seed = SeedGenerator.generateSeed() // Generate a new seed
        SystemFileSystem.sink(this@Ambrosia.confFile, append = true).buffered().use {
          it.writeString("\nsecret=$seed")
        }
        val hash = SeedGenerator.generateSecureSeed(seedInput = seed)
        SystemFileSystem.sink(this@Ambrosia.confFile, append = true).buffered().use {
          it.writeString("\nsecret-hash=$hash")
        }
        seed
      }
    val phoenixdUrl by
      option("--phoenixd-url", help = "phoenixd API url, eg http://phoenixd:9740").defaultLazy {
        val value = "http://localhost:9740" // Default value
        SystemFileSystem.sink(this@Ambrosia.confFile, append = true).buffered().use {
          it.writeString("\nphoenixd-url=$value")
        }
        value
      }
    val phoenixdPassword by
      option("--phoenixd-password", help = "http-password for phoenixd API").defaultLazy {
        AppConfig.loadConfig()
        val value = AppConfig.getPhoenixProperty("http-password") ?: throw Exception("phoenixd http-password on found in phoenix.conf, please provide it with --phoenixd-password or in the phoenix.conf file")
        value
      }
    val jwtAccessTokenExpirationSeconds by
      option("--jwt-access-token-expiration", help = "Access token expiration in seconds (default: 60)").default("60")
    val phoenixdWebhookSecret by
      option("--phoenixd-webhook-secret", help = "webhook-secret for phoenixd webhooks").defaultLazy {
        AppConfig.loadConfig()
        val existing = AppConfig.getPhoenixProperty("webhook-secret")
        existing ?: throw Exception("phoenixd webhook-secret not found in phoenix.conf, please provide it with --phoenixd-webhook-secret or set webhook-secret in phoenix.conf")
      }
    val phoenixdWebhookUrl by
      option(
        "--phoenixd-webhook",
        help = "webhook URL to register in phoenix.conf (webhook=<url>)"
      )
        .defaultLazy { this@Ambrosia.defaultWebhookUrl(httpBindIp, httpBindPort) }
  }
  private val options by DaemonOptions()

  override fun run() {
    echo(green("Running Ambrosia POS Server v$AppVersion"))
    logger.info("Using data directory: $datadir")
    
    runDatabaseMigrations()
    
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
                privateKeyPassword = { privateKeyPassword.toCharArray() }
            ) {
                port = 9443
                host = options.httpBindIp
            }
          },
          module = { Api().run { module() } }
        )
      ensurePhoenixWebhookConfigured(options.phoenixdWebhookUrl)
      server.start(wait = true)
    } catch (e: Exception) {
      echo("Error starting server: ${e.message}", err = true)
      throw e
    }
  }

  private fun runDatabaseMigrations() {
    Flyway.configure().dataSource("jdbc:sqlite:${datadir}/ambrosia.db", null , null)
      .mixed(true).load().migrate()
  }

  private data class KeyStoreInfo(val keyStore: KeyStore, val storePassword: String, val privateKeyPassword: String)

  private fun ensureKeyStore(): KeyStoreInfo {
      val keyStoreFile = File(datadir.toString(), "keystore.jks")
      val privateKeyPassword = options.secret
      val storePassword = SeedGenerator.generateSecureSeed(
          seedInput = options.secret
      )

      if (!keyStoreFile.exists()) {
          val keyStore = buildKeyStore {
              certificate("ambrosia") {
                  password = privateKeyPassword
                  domains = listOf("localhost", "127.0.0.1", "0.0.0.0")
              }
          }
          keyStore.saveToFile(keyStoreFile, storePassword)
          echo(yellow("Generated self-signed certificate using server secret"))
      }

      val keyStore = KeyStore.getInstance("JKS").apply {
          load(keyStoreFile.inputStream(), storePassword.toCharArray())
      }

      return KeyStoreInfo(keyStore, storePassword, privateKeyPassword)
  }

  private fun defaultWebhookUrl(httpBindIp: String, httpBindPort: Int): String {
    val envHost = System.getenv("PHOENIXD_WEBHOOK_HOST")?.takeIf { it.isNotBlank() }
    val resolvedHost =
      envHost
        ?: when (httpBindIp) {
          "0.0.0.0", "::" -> "ambrosia"
          else -> httpBindIp
        }

    if (envHost == null && (httpBindIp == "0.0.0.0" || httpBindIp == "::")) {
      logger.info(
        "Using default webhook host 'ambrosia' because http-bind-ip is $httpBindIp; override with PHOENIXD_WEBHOOK_HOST or --phoenixd-webhook if needed"
      )
    }

    return "http://${resolvedHost}:${httpBindPort}/webhook/phoenixd"
  }

  private fun ensurePhoenixWebhookConfigured(url: String) {
    val file = File(phoenixConfFile.toString())
    file.parentFile?.mkdirs()
    val existingLines = if (file.exists()) file.readLines() else emptyList()
    val updatedLines = mutableListOf<String>()
    var replaced = false

    existingLines.forEach { line ->
      if (line.trimStart().startsWith("webhook=")) {
        if (!replaced) {
          updatedLines.add("webhook=$url")
          replaced = true
        }
      } else {
        updatedLines.add(line)
      }
    }

    if (!replaced) {
      updatedLines.add("webhook=$url")
    }

    if (existingLines != updatedLines) {
      file.writeText(updatedLines.joinToString(separator = "\n", postfix = "\n"))
      logger.info("Updated phoenix webhook entry to webhook=$url in ${file.absolutePath}")
    }
  }
}
