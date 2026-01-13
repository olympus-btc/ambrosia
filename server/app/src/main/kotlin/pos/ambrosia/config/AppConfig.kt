package pos.ambrosia.config

import java.io.File
import java.io.FileInputStream
import java.util.Properties
import pos.ambrosia.logger
import kotlinx.io.files.Path
import pos.ambrosia.datadir
import pos.ambrosia.phoenixDatadir
import pos.ambrosia.userHome

/**
 * Application configuration manager.
 * Loads properties from a configuration file and provides access to them.
 */

object AppConfig {

    private val properties = Properties()
    private val phoenixProperties = Properties()
    private const val PHOENIX_SEED_PATH = ".phoenix/seed.dat"

    fun loadConfig() {
        val configFile = Path(datadir, "ambrosia.conf").toString()
        val phoenixConfFile = Path(phoenixDatadir, "phoenix.conf").toString()

        try {
            FileInputStream(configFile).use { fis ->
                properties.load(fis)
            }
        } catch (e: Exception) {
            logger.error("Error loading configuration from {}", configFile)
        }

        try {
            FileInputStream(phoenixConfFile).use { fis ->
                phoenixProperties.load(fis)
            }
        } catch (e: Exception) {
            logger.error("Error loading Phoenix configuration from {}", phoenixConfFile)
        }
    }

    fun loadPhoenixSeed(): String {
        val seedFile = File(userHome, PHOENIX_SEED_PATH)
        var seed = ""

        try {
            seed = seedFile.readText()
        } catch (e: Exception) {
            logger.error("Error loading Phoenix seed from {}", seedFile)
        }
        return seed
    }


    @Deprecated("Use app environment properties instead")
    fun getProperty(key: String, defaultValue: String? = null): String? {
        return properties.getProperty(key) ?: defaultValue
    }
    
    fun getPhoenixProperty(key: String, defaultValue: String? = null): String? {
        return phoenixProperties.getProperty(key) ?: defaultValue
    }
}