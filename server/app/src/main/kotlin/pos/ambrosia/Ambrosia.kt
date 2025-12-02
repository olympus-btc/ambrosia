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
import pos.ambrosia.config.InjectLogs
import pos.ambrosia.config.ListValueSource
import pos.ambrosia.config.SeedGenerator
import pos.ambrosia.config.AppConfig
import org.flywaydb.core.Flyway

fun main(args: Array<String>) = Ambrosia().main(args)

class Ambrosia : CliktCommand() {
  // En algún archivo de configuración o en Application.kt
  val AppVersion: String = Ambrosia::class.java.getPackage().implementationVersion ?: "-dev"
  val datadir = Path(Path(System.getProperty("user.home")), ".Ambrosia-POS")
  private val confFile = Path(datadir, "ambrosia.conf")

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
  }
  private val options by DaemonOptions()

  override fun run() {
    echo(green("Running Ambrosia POS Server v$AppVersion"))
    logger.info("Using data directory: $datadir")
    Flyway.configure().dataSource("jdbc:sqlite:${datadir}/ambrosia.db", null , null)
      .mixed(true).load().migrate()
    try {
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


      val server =
        embeddedServer(
          Netty,
          environment =
            applicationEnvironment {
              config =
                MapApplicationConfig().apply {
                  put("jwt.issuer", "ambrosia-pos")
                  put("jwt.audience", "ambrosia-pos-users")
                  put("secret", options.secret)
                  put("phoenixd-url", options.phoenixdUrl)
                  put("phoenixd-password", options.phoenixdPassword)
                  put("jwt.accessTokenExpirationSeconds", options.jwtAccessTokenExpirationSeconds)
                }
            },
          configure = {
            connector {
              port = options.httpBindPort
              host = options.httpBindIp
            }
            val keyStore = KeyStore.getInstance("JKS").apply {
                load(keyStoreFile.inputStream(), storePassword.toCharArray())
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
      server.start(wait = true)
    } catch (e: Exception) {
      echo("Error starting server: ${e.message}", err = true)
      throw e
    }
  }
}
