package pos.ambrosia.utest

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import io.ktor.server.engine.applicationEnvironment
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.config.AppConfig
import pos.ambrosia.models.BackupManifest
import pos.ambrosia.models.BackupProgressPhase
import pos.ambrosia.services.BackupService
import pos.ambrosia.services.SecretsStore
import pos.ambrosia.services.TokenService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.PendingImportAlreadyStagedException
import pos.ambrosia.utils.confirmationTokenConfig
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.file.FileSystemException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.attribute.FileTime
import java.security.SecureRandom
import java.sql.DriverManager
import java.time.Duration
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Date
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream
import javax.crypto.BadPaddingException
import javax.crypto.Cipher
import javax.crypto.CipherOutputStream
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.io.files.Path as KotlinIoPath

private const val TEST_SECRET = "test-secret-value"

class BackupServiceTest {
    private lateinit var databaseFile: File
    private lateinit var uploadsRoot: Path
    private lateinit var configFile: File
    private lateinit var importStagingRoot: Path

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
        uploadsRoot = Files.createTempDirectory("backupServiceTestUploads")
        configFile = Files.createTempFile("backupServiceTestConfig", ".conf").toFile()
        configFile.writeText("secret=$TEST_SECRET\n")
        importStagingRoot = Files.createTempDirectory("backupServiceTestStagingParent").resolve("import-staging")
        SecretsStore.resetForTesting()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
        SecretsStore.resetForTesting()
    }

    private fun decryptBackup(
        encryptedBackup: ByteArray,
        password: CharArray,
    ): ByteArray {
        val magicHeader = "AMBROSIA-BACKUP-1".toByteArray(Charsets.UTF_8)
        val salt = encryptedBackup.copyOfRange(magicHeader.size, magicHeader.size + 16)
        val initializationVector = encryptedBackup.copyOfRange(magicHeader.size + 16, magicHeader.size + 16 + 12)
        val ciphertext = encryptedBackup.copyOfRange(magicHeader.size + 16 + 12, encryptedBackup.size)

        val secretKeyFactory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val keyDerivationSpec = PBEKeySpec(password, salt, 10000, 256)
        val secretKey = SecretKeySpec(secretKeyFactory.generateSecret(keyDerivationSpec).encoded, "AES")

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(128, initializationVector))
        return cipher.doFinal(ciphertext)
    }

    private fun zipEntryNames(zipBytes: ByteArray): List<String> {
        val entryNames = mutableListOf<String>()
        ZipInputStream(zipBytes.inputStream()).use { zip ->
            var zipEntry = zip.nextEntry
            while (zipEntry != null) {
                entryNames.add(zipEntry.name)
                zipEntry = zip.nextEntry
            }
        }
        return entryNames
    }

    private fun readZipEntry(
        zipBytes: ByteArray,
        entryName: String,
    ): String {
        ZipInputStream(zipBytes.inputStream()).use { zip ->
            var zipEntry = zip.nextEntry
            while (zipEntry != null) {
                if (zipEntry.name == entryName) return zip.readBytes().toString(Charsets.UTF_8)
                zipEntry = zip.nextEntry
            }
        }
        throw NoSuchElementException("Zip entry not found: $entryName")
    }

    @Test
    fun `prepareExportSnapshot creates a readable database snapshot file`() {
        val backupService =
            BackupService(uploadsRoot, databaseFile.absolutePath, configFile.absolutePath, environmentSecret = null)

        val databaseSnapshot = backupService.prepareExportSnapshot()

        assertTrue(Files.exists(databaseSnapshot))
        assertTrue(Files.size(databaseSnapshot) > 0)
        Files.deleteIfExists(databaseSnapshot)
    }

    @Test
    fun `calculateExportTotalBytes sums the database snapshot size and every file under uploads`() {
        val backupService =
            BackupService(uploadsRoot, databaseFile.absolutePath, configFile.absolutePath, environmentSecret = null)
        Files.write(uploadsRoot.resolve("product-1.jpg"), ByteArray(100))
        val nestedDirectory = Files.createDirectory(uploadsRoot.resolve("nested"))
        Files.write(nestedDirectory.resolve("product-2.jpg"), ByteArray(50))

        val databaseSnapshot = backupService.prepareExportSnapshot()
        val totalExportBytes = backupService.calculateExportTotalBytes(databaseSnapshot)

        assertEquals(Files.size(databaseSnapshot) + 150, totalExportBytes)
        Files.deleteIfExists(databaseSnapshot)
    }

    @Test
    fun `calculateExportTotalBytes counts only the database snapshot when uploads is empty`() {
        val backupService =
            BackupService(uploadsRoot, databaseFile.absolutePath, configFile.absolutePath, environmentSecret = null)

        val databaseSnapshot = backupService.prepareExportSnapshot()
        val totalExportBytes = backupService.calculateExportTotalBytes(databaseSnapshot)

        assertEquals(Files.size(databaseSnapshot), totalExportBytes)
        Files.deleteIfExists(databaseSnapshot)
    }

    @Test
    fun `exportBackup produces a zip decryptable with the same password, containing manifest and db snapshot`() {
        val backupService =
            BackupService(uploadsRoot, databaseFile.absolutePath, configFile.absolutePath, environmentSecret = null)
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
        )

        val decryptedZip = decryptBackup(backupOutputStream.toByteArray(), "correct-password".toCharArray())
        val entries = zipEntryNames(decryptedZip)

        assertTrue(entries.contains("manifest.json"))
        assertTrue(entries.contains("ambrosia.db"))
    }

    @Test
    fun `exportBackup manifest contains the business name`() {
        val backupService =
            BackupService(uploadsRoot, databaseFile.absolutePath, configFile.absolutePath, environmentSecret = null)
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
        )

        val decryptedZip = decryptBackup(backupOutputStream.toByteArray(), "correct-password".toCharArray())
        val manifestJson = readZipEntry(decryptedZip, "manifest.json")

        assertTrue(manifestJson.contains("\"businessName\":\"My Test Store\""))
    }

    @Test
    fun `exportBackup manifest contains the secret from ambrosia conf`() {
        val backupService =
            BackupService(uploadsRoot, databaseFile.absolutePath, configFile.absolutePath, environmentSecret = null)
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
        )

        val decryptedZip = decryptBackup(backupOutputStream.toByteArray(), "correct-password".toCharArray())
        val manifestJson = readZipEntry(decryptedZip, "manifest.json")

        assertTrue(manifestJson.contains("\"secret\":\"$TEST_SECRET\""))
    }

    @Test
    fun `exportBackup manifest uses the AMBROSIA_SECRET environment variable over ambrosia conf when both are present`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                environmentSecret = "environment-secret-value",
            )
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
        )

        val decryptedZip = decryptBackup(backupOutputStream.toByteArray(), "correct-password".toCharArray())
        val manifestJson = readZipEntry(decryptedZip, "manifest.json")

        assertTrue(manifestJson.contains("\"secret\":\"environment-secret-value\""))
    }

    @Test
    fun `exportBackup throws when ambrosia conf has no secret`() {
        configFile.writeText("nwc-uri=nostr+walletconnect://example\n")
        val backupService =
            BackupService(uploadsRoot, databaseFile.absolutePath, configFile.absolutePath, environmentSecret = null)
        val backupOutputStream = ByteArrayOutputStream()

        assertFailsWith<IllegalStateException> {
            backupService.exportBackup(
                "My Test Store",
                "correct-password".toCharArray(),
                backupService.prepareExportSnapshot(),
                backupOutputStream,
            )
        }
    }

    @Test
    fun `exportBackup includes files from the uploads directory`() {
        val dateDir = Files.createDirectory(uploadsRoot.resolve("2026-08-24"))
        Files.write(dateDir.resolve("logo.png"), "fake-image-bytes".toByteArray())
        val backupService =
            BackupService(uploadsRoot, databaseFile.absolutePath, configFile.absolutePath, environmentSecret = null)
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
        )

        val decryptedZip = decryptBackup(backupOutputStream.toByteArray(), "correct-password".toCharArray())
        val entries = zipEntryNames(decryptedZip)

        assertTrue(entries.contains("uploads/2026-08-24/logo.png"))
    }

    @Test
    fun `exportBackup produces no uploads entries when the uploads directory does not exist`() {
        val backupService =
            BackupService(
                uploadsRoot.resolve("does-not-exist"),
                databaseFile.absolutePath,
                configFile.absolutePath,
                environmentSecret = null,
            )
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
        )

        val decryptedZip = decryptBackup(backupOutputStream.toByteArray(), "correct-password".toCharArray())
        val entries = zipEntryNames(decryptedZip)

        assertTrue(entries.none { it.startsWith("uploads/") })
    }

    @Test
    fun `decrypting the backup with the wrong password fails`() {
        val backupService =
            BackupService(uploadsRoot, databaseFile.absolutePath, configFile.absolutePath, environmentSecret = null)
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
        )

        assertFailsWith<BadPaddingException> {
            decryptBackup(backupOutputStream.toByteArray(), "wrong-password".toCharArray())
        }
    }

    @Test
    fun `exportBackup clears the password array after use`() {
        val backupService =
            BackupService(uploadsRoot, databaseFile.absolutePath, configFile.absolutePath, environmentSecret = null)
        val backupOutputStream = ByteArrayOutputStream()
        val password = "correct-password".toCharArray()

        backupService.exportBackup("My Test Store", password, backupService.prepareExportSnapshot(), backupOutputStream)

        assertTrue(password.all { it == Char(0) })
    }

    @Test
    fun `exportBackup produces a different salt and initialization vector on each call`() {
        val backupService =
            BackupService(uploadsRoot, databaseFile.absolutePath, configFile.absolutePath, environmentSecret = null)
        val firstOutput = ByteArrayOutputStream()
        val secondOutput = ByteArrayOutputStream()

        backupService.exportBackup("My Test Store", "correct-password".toCharArray(), backupService.prepareExportSnapshot(), firstOutput)
        backupService.exportBackup("My Test Store", "correct-password".toCharArray(), backupService.prepareExportSnapshot(), secondOutput)

        val magicHeaderSize = "AMBROSIA-BACKUP-1".toByteArray(Charsets.UTF_8).size
        val firstSaltAndInitializationVector =
            firstOutput.toByteArray().copyOfRange(magicHeaderSize, magicHeaderSize + 28)
        val secondSaltAndInitializationVector =
            secondOutput.toByteArray().copyOfRange(magicHeaderSize, magicHeaderSize + 28)

        assertTrue(!firstSaltAndInitializationVector.contentEquals(secondSaltAndInitializationVector))
    }

    @Test
    fun `exportBackup reports WRITING progress that ends at the total export bytes`() {
        Files.write(uploadsRoot.resolve("product-1.jpg"), ByteArray(100))
        val backupService =
            BackupService(uploadsRoot, databaseFile.absolutePath, configFile.absolutePath, environmentSecret = null)
        val databaseSnapshot = backupService.prepareExportSnapshot()
        val totalExportBytes = backupService.calculateExportTotalBytes(databaseSnapshot)
        val backupOutputStream = ByteArrayOutputStream()
        val progressUpdates = mutableListOf<Triple<String, Long, Long?>>()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            databaseSnapshot,
            backupOutputStream,
        ) { phase, bytesProcessed, totalBytes -> progressUpdates.add(Triple(phase, bytesProcessed, totalBytes)) }

        assertTrue(progressUpdates.isNotEmpty())
        assertTrue(progressUpdates.all { it.first == BackupProgressPhase.WRITING })
        assertTrue(progressUpdates.all { it.third == totalExportBytes })
        assertEquals(totalExportBytes, progressUpdates.last().second)
    }

    @Test
    fun `exportBackup reports multiple WRITING chunks for a file larger than the copy buffer`() {
        Files.write(uploadsRoot.resolve("large-file.bin"), ByteArray(20000))
        val backupService =
            BackupService(uploadsRoot, databaseFile.absolutePath, configFile.absolutePath, environmentSecret = null)
        val databaseSnapshot = backupService.prepareExportSnapshot()
        val totalExportBytes = backupService.calculateExportTotalBytes(databaseSnapshot)
        val backupOutputStream = ByteArrayOutputStream()
        val progressUpdates = mutableListOf<Triple<String, Long, Long?>>()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            databaseSnapshot,
            backupOutputStream,
        ) { phase, bytesProcessed, totalBytes -> progressUpdates.add(Triple(phase, bytesProcessed, totalBytes)) }

        assertTrue(progressUpdates.size > 2)
        val bytesProcessedPerUpdate = progressUpdates.map { it.second }
        assertEquals(bytesProcessedPerUpdate.sorted(), bytesProcessedPerUpdate)
        assertEquals(totalExportBytes, progressUpdates.last().second)
    }

    private fun createMinimalSqliteFile(
        destination: Path,
        markerValue: String,
    ) {
        DriverManager.getConnection("jdbc:sqlite:$destination").use { connection ->
            connection.createStatement().use { statement ->
                statement.execute("CREATE TABLE marker (value TEXT)")
                statement.execute("INSERT INTO marker (value) VALUES ('$markerValue')")
            }
        }
    }

    private fun readZipEntryBytes(
        zipBytes: ByteArray,
        entryName: String,
    ): ByteArray {
        ZipInputStream(zipBytes.inputStream()).use { zip ->
            var zipEntry = zip.nextEntry
            while (zipEntry != null) {
                if (zipEntry.name == entryName) return zip.readBytes()
                zipEntry = zip.nextEntry
            }
        }
        throw NoSuchElementException("Zip entry not found: $entryName")
    }

    @Test
    fun `exportBackup omits phoenixd entries when isLocalPhoenixd is false`() {
        val phoenixDataDirectory = Files.createTempDirectory("backupServiceTestPhoenixData")
        createMinimalSqliteFile(phoenixDataDirectory.resolve("phoenix.mainnet.abc123.db"), "unused-marker")
        val backupService =
            BackupService(
                uploadsRoot = uploadsRoot,
                databasePath = databaseFile.absolutePath,
                configFilePath = configFile.absolutePath,
                phoenixDataDirectory = phoenixDataDirectory,
                environmentSecret = null,
            )
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
            isLocalPhoenixd = false,
        )

        val decryptedZip = decryptBackup(backupOutputStream.toByteArray(), "correct-password".toCharArray())
        assertTrue(zipEntryNames(decryptedZip).none { it.startsWith("phoenix/") })
    }

    @Test
    fun `exportBackup includes the seed entry exactly when the real phoenix seed file is available`() {
        val backupService =
            BackupService(uploadsRoot, databaseFile.absolutePath, configFile.absolutePath, environmentSecret = null)
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
            isLocalPhoenixd = true,
        )

        val decryptedZip = decryptBackup(backupOutputStream.toByteArray(), "correct-password".toCharArray())
        val seedEntryPresent = zipEntryNames(decryptedZip).contains("phoenix/seed.dat")
        val realPhoenixSeedAvailable = AppConfig.loadPhoenixSeed().isNotBlank()
        assertEquals(realPhoenixSeedAvailable, seedEntryPresent)
    }

    @Test
    fun `exportBackup includes the phoenix config entry with the http-password, webhook-secret, and chain`() {
        val phoenixConfigFile = Files.createTempFile("backupServiceTestPhoenixConfig", ".conf")
        Files.writeString(
            phoenixConfigFile,
            "http-password=test-http-password\nwebhook-secret=test-webhook-secret\nchain=testnet\n",
        )
        val backupService =
            BackupService(
                uploadsRoot = uploadsRoot,
                databasePath = databaseFile.absolutePath,
                configFilePath = configFile.absolutePath,
                phoenixConfigFilePath = phoenixConfigFile.toString(),
                environmentSecret = null,
            )
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
            isLocalPhoenixd = true,
        )

        val decryptedZip = decryptBackup(backupOutputStream.toByteArray(), "correct-password".toCharArray())
        val phoenixConfigEntry = readZipEntry(decryptedZip, "phoenix/phoenix.conf")
        assertTrue(phoenixConfigEntry.contains("http-password=test-http-password"))
        assertTrue(phoenixConfigEntry.contains("webhook-secret=test-webhook-secret"))
        assertTrue(phoenixConfigEntry.contains("chain=testnet"))
    }

    @Test
    fun `exportBackup defaults chain to mainnet when the phoenix conf does not set it explicitly`() {
        val phoenixConfigFile = Files.createTempFile("backupServiceTestPhoenixConfig", ".conf")
        Files.writeString(phoenixConfigFile, "http-password=test-http-password\n")
        val backupService =
            BackupService(
                uploadsRoot = uploadsRoot,
                databasePath = databaseFile.absolutePath,
                configFilePath = configFile.absolutePath,
                phoenixConfigFilePath = phoenixConfigFile.toString(),
                environmentSecret = null,
            )
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
            isLocalPhoenixd = true,
        )

        val decryptedZip = decryptBackup(backupOutputStream.toByteArray(), "correct-password".toCharArray())
        val phoenixConfigEntry = readZipEntry(decryptedZip, "phoenix/phoenix.conf")
        assertTrue(phoenixConfigEntry.contains("chain=mainnet"))
    }

    @Test
    fun `exportBackup omits the phoenix config entry when the phoenix conf file is unavailable`() {
        val backupService =
            BackupService(
                uploadsRoot = uploadsRoot,
                databasePath = databaseFile.absolutePath,
                configFilePath = configFile.absolutePath,
                phoenixConfigFilePath =
                    Files
                        .createTempDirectory("backupServiceTestPhoenixConfigParent")
                        .resolve("does-not-exist.conf")
                        .toString(),
                environmentSecret = null,
            )
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
            isLocalPhoenixd = true,
        )

        val decryptedZip = decryptBackup(backupOutputStream.toByteArray(), "correct-password".toCharArray())
        assertTrue(zipEntryNames(decryptedZip).none { it == "phoenix/phoenix.conf" })
    }

    @Test
    fun `exportBackup omits the history database entry when no phoenixd database is found`() {
        val phoenixDataDirectory = Files.createTempDirectory("backupServiceTestPhoenixData")
        val backupService =
            BackupService(
                uploadsRoot = uploadsRoot,
                databasePath = databaseFile.absolutePath,
                configFilePath = configFile.absolutePath,
                phoenixDataDirectory = phoenixDataDirectory,
                environmentSecret = null,
            )
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
            isLocalPhoenixd = true,
        )

        val decryptedZip = decryptBackup(backupOutputStream.toByteArray(), "correct-password".toCharArray())
        assertTrue(zipEntryNames(decryptedZip).none { it.startsWith("phoenix/phoenix.") && it.endsWith(".db") })
    }

    @Test
    fun `exportBackup includes a snapshot of the phoenixd database with the most recent family mtime`() {
        val phoenixDataDirectory = Files.createTempDirectory("backupServiceTestPhoenixData")
        val staleCandidate = phoenixDataDirectory.resolve("phoenix.mainnet.stale1.db")
        val recentCandidate = phoenixDataDirectory.resolve("phoenix.mainnet.recent1.db")
        createMinimalSqliteFile(staleCandidate, "stale-marker-value")
        createMinimalSqliteFile(recentCandidate, "recent-marker-value")
        Files.setLastModifiedTime(staleCandidate, FileTime.from(Instant.now().minusSeconds(3600)))
        Files.setLastModifiedTime(recentCandidate, FileTime.from(Instant.now()))
        val backupService =
            BackupService(
                uploadsRoot = uploadsRoot,
                databasePath = databaseFile.absolutePath,
                configFilePath = configFile.absolutePath,
                phoenixDataDirectory = phoenixDataDirectory,
                environmentSecret = null,
            )
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
            isLocalPhoenixd = true,
        )

        val decryptedZip = decryptBackup(backupOutputStream.toByteArray(), "correct-password".toCharArray())
        val historyDatabaseContent =
            String(readZipEntryBytes(decryptedZip, "phoenix/${recentCandidate.fileName}"), Charsets.ISO_8859_1)
        assertTrue(historyDatabaseContent.contains("recent-marker-value"))
        assertFalse(historyDatabaseContent.contains("stale-marker-value"))
    }

    @Test
    fun `exportBackup picks the phoenixd database whose wal file is more recent than its main file`() {
        val phoenixDataDirectory = Files.createTempDirectory("backupServiceTestPhoenixData")
        val staleCandidate = phoenixDataDirectory.resolve("phoenix.mainnet.stale1.db")
        val recentCandidate = phoenixDataDirectory.resolve("phoenix.mainnet.recent1.db")
        createMinimalSqliteFile(staleCandidate, "stale-marker-value")
        createMinimalSqliteFile(recentCandidate, "recent-marker-value")
        val now = Instant.now()
        Files.setLastModifiedTime(staleCandidate, FileTime.from(now.minusSeconds(3600)))
        Files.setLastModifiedTime(recentCandidate, FileTime.from(now.minusSeconds(7200)))
        val recentCandidateWalFile = Paths.get("$recentCandidate-wal")
        Files.write(recentCandidateWalFile, "wal-bytes".toByteArray())
        Files.setLastModifiedTime(recentCandidateWalFile, FileTime.from(now))
        val backupService =
            BackupService(
                uploadsRoot = uploadsRoot,
                databasePath = databaseFile.absolutePath,
                configFilePath = configFile.absolutePath,
                phoenixDataDirectory = phoenixDataDirectory,
                environmentSecret = null,
            )
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
            isLocalPhoenixd = true,
        )

        val decryptedZip = decryptBackup(backupOutputStream.toByteArray(), "correct-password".toCharArray())
        val historyDatabaseContent =
            String(readZipEntryBytes(decryptedZip, "phoenix/${recentCandidate.fileName}"), Charsets.ISO_8859_1)
        assertTrue(historyDatabaseContent.contains("recent-marker-value"))
    }

    @Test
    fun `exportBackup does not fail when a phoenixd database candidate is not valid sqlite`() {
        val phoenixDataDirectory = Files.createTempDirectory("backupServiceTestPhoenixData")
        Files.write(phoenixDataDirectory.resolve("phoenix.mainnet.corrupt1.db"), "not a real sqlite file".toByteArray())
        val backupService =
            BackupService(
                uploadsRoot = uploadsRoot,
                databasePath = databaseFile.absolutePath,
                configFilePath = configFile.absolutePath,
                phoenixDataDirectory = phoenixDataDirectory,
                environmentSecret = null,
            )
        val backupOutputStream = ByteArrayOutputStream()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            backupOutputStream,
            isLocalPhoenixd = true,
        )

        val decryptedZip = decryptBackup(backupOutputStream.toByteArray(), "correct-password".toCharArray())
        val entries = zipEntryNames(decryptedZip)
        assertTrue(entries.contains("ambrosia.db"))
        assertTrue(entries.none { it.startsWith("phoenix/phoenix.") && it.endsWith(".db") })
    }

    @Test
    fun `exportBackup does not count phoenixd entries toward the reported total bytes`() {
        val phoenixDataDirectory = Files.createTempDirectory("backupServiceTestPhoenixData")
        createMinimalSqliteFile(phoenixDataDirectory.resolve("phoenix.mainnet.abc123.db"), "marker-value")
        val phoenixConfigFile = Files.createTempFile("backupServiceTestPhoenixConfig", ".conf")
        Files.writeString(phoenixConfigFile, "http-password=test-http-password\nwebhook-secret=test-webhook-secret\n")
        val backupService =
            BackupService(
                uploadsRoot = uploadsRoot,
                databasePath = databaseFile.absolutePath,
                configFilePath = configFile.absolutePath,
                phoenixDataDirectory = phoenixDataDirectory,
                phoenixConfigFilePath = phoenixConfigFile.toString(),
                environmentSecret = null,
            )
        val databaseSnapshot = backupService.prepareExportSnapshot()
        val totalExportBytes = backupService.calculateExportTotalBytes(databaseSnapshot)
        val backupOutputStream = ByteArrayOutputStream()
        val progressUpdates = mutableListOf<Triple<String, Long, Long?>>()

        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            databaseSnapshot,
            backupOutputStream,
            isLocalPhoenixd = true,
        ) { phase, bytesProcessed, totalBytes -> progressUpdates.add(Triple(phase, bytesProcessed, totalBytes)) }

        assertTrue(progressUpdates.all { it.third == totalExportBytes })
        assertEquals(totalExportBytes, progressUpdates.last().second)
    }

    private fun buildEncryptedBackup(
        password: CharArray,
        zipEntries: Map<String, ByteArray>,
    ): ByteArray {
        val magicHeader = "AMBROSIA-BACKUP-1".toByteArray(Charsets.UTF_8)
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val initializationVector = ByteArray(12).also { SecureRandom().nextBytes(it) }

        val secretKeyFactory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val keyDerivationSpec = PBEKeySpec(password, salt, 10000, 256)
        val secretKey = SecretKeySpec(secretKeyFactory.generateSecret(keyDerivationSpec).encoded, "AES")

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, GCMParameterSpec(128, initializationVector))

        val backupOutputStream = ByteArrayOutputStream()
        backupOutputStream.write(magicHeader)
        backupOutputStream.write(salt)
        backupOutputStream.write(initializationVector)

        CipherOutputStream(backupOutputStream, cipher).use { encryptedOutput ->
            ZipOutputStream(encryptedOutput).use { zip ->
                zipEntries.forEach { (entryName, entryBytes) ->
                    zip.putNextEntry(ZipEntry(entryName))
                    zip.write(entryBytes)
                    zip.closeEntry()
                }
            }
        }
        return backupOutputStream.toByteArray()
    }

    private fun manifestZipEntry(manifest: BackupManifest): ByteArray =
        Json.encodeToString(BackupManifest.serializer(), manifest).toByteArray(Charsets.UTF_8)

    private fun sampleImportedManifest(schemaInstalledRank: Int? = null): BackupManifest =
        BackupManifest(
            appVersion = "dev",
            schemaInstalledRank = schemaInstalledRank,
            businessName = "Imported Test Store",
            secret = "imported-secret-value",
        )

    private fun seedFlywaySchemaHistory(installedRank: Int) {
        transaction {
            exec("CREATE TABLE flyway_schema_history (installed_rank INTEGER)")
            exec("INSERT INTO flyway_schema_history (installed_rank) VALUES ($installedRank)")
        }
    }

    @Test
    fun `importBackup returns includesPhoenixdData true after an export with isLocalPhoenixd`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val exportedBackup = ByteArrayOutputStream()
        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            exportedBackup,
            isLocalPhoenixd = true,
        )

        val importedManifest =
            backupService.importBackup(
                exportedBackup.toByteArray().inputStream(),
                "correct-password".toCharArray(),
            )

        assertTrue(importedManifest.includesPhoenixdData)
    }

    @Test
    fun `importBackup returns includesPhoenixdData false after an export without isLocalPhoenixd`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val exportedBackup = ByteArrayOutputStream()
        backupService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            backupService.prepareExportSnapshot(),
            exportedBackup,
        )

        val importedManifest =
            backupService.importBackup(
                exportedBackup.toByteArray().inputStream(),
                "correct-password".toCharArray(),
            )

        assertFalse(importedManifest.includesPhoenixdData)
    }

    @Test
    fun `importBackup returns the manifest from a real exportBackup output`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val exportedBackup = ByteArrayOutputStream()
        backupService.exportBackup("My Test Store", "correct-password".toCharArray(), backupService.prepareExportSnapshot(), exportedBackup)

        val importedManifest =
            backupService.importBackup(
                exportedBackup.toByteArray().inputStream(),
                "correct-password".toCharArray(),
            )

        assertEquals("My Test Store", importedManifest.businessName)
        assertEquals(TEST_SECRET, importedManifest.secret)
    }

    @Test
    fun `importBackup reports EXTRACTING progress that ends at the manifest total bytes`() {
        val dateDir = Files.createDirectory(uploadsRoot.resolve("2026-08-24"))
        Files.write(dateDir.resolve("logo.png"), ByteArray(200))
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val databaseSnapshot = backupService.prepareExportSnapshot()
        val totalExportBytes = backupService.calculateExportTotalBytes(databaseSnapshot)
        val exportedBackup = ByteArrayOutputStream()
        backupService.exportBackup("My Test Store", "correct-password".toCharArray(), databaseSnapshot, exportedBackup)
        val progressUpdates = mutableListOf<Triple<String, Long, Long?>>()

        backupService.importBackup(
            exportedBackup.toByteArray().inputStream(),
            "correct-password".toCharArray(),
        ) { phase, bytesProcessed, totalBytes -> progressUpdates.add(Triple(phase, bytesProcessed, totalBytes)) }

        assertTrue(progressUpdates.isNotEmpty())
        assertTrue(progressUpdates.all { it.first == BackupProgressPhase.EXTRACTING })
        assertTrue(progressUpdates.all { it.third == totalExportBytes })
        assertEquals(totalExportBytes, progressUpdates.last().second)
    }

    @Test
    fun `importBackup reports null total bytes when the manifest has no totalUncompressedBytes`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val password = "correct-password".toCharArray()
        val oldBackupWithoutTotalBytes =
            buildEncryptedBackup(
                password,
                mapOf(
                    "manifest.json" to manifestZipEntry(sampleImportedManifest()),
                    "ambrosia.db" to "fake-database-bytes".toByteArray(),
                ),
            )
        val progressUpdates = mutableListOf<Triple<String, Long, Long?>>()

        val importedManifest =
            backupService.importBackup(
                oldBackupWithoutTotalBytes.inputStream(),
                password,
            ) { phase, bytesProcessed, totalBytes -> progressUpdates.add(Triple(phase, bytesProcessed, totalBytes)) }

        assertEquals("Imported Test Store", importedManifest.businessName)
        assertTrue(progressUpdates.isNotEmpty())
        assertTrue(progressUpdates.all { it.third == null })
    }

    @Test
    fun `importBackup stages the database snapshot`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val exportedBackup = ByteArrayOutputStream()
        backupService.exportBackup("My Test Store", "correct-password".toCharArray(), backupService.prepareExportSnapshot(), exportedBackup)

        backupService.importBackup(
            exportedBackup.toByteArray().inputStream(),
            "correct-password".toCharArray(),
        )

        assertTrue(Files.exists(importStagingRoot.resolve("ambrosia.db")))
    }

    @Test
    fun `importBackup stages files from the uploads directory`() {
        val dateDir = Files.createDirectory(uploadsRoot.resolve("2026-08-24"))
        Files.write(dateDir.resolve("logo.png"), "fake-image-bytes".toByteArray())
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val exportedBackup = ByteArrayOutputStream()
        backupService.exportBackup("My Test Store", "correct-password".toCharArray(), backupService.prepareExportSnapshot(), exportedBackup)

        backupService.importBackup(
            exportedBackup.toByteArray().inputStream(),
            "correct-password".toCharArray(),
        )

        assertTrue(Files.exists(importStagingRoot.resolve("uploads/2026-08-24/logo.png")))
    }

    @Test
    fun `importBackup stages the secret from the manifest`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val exportedBackup = ByteArrayOutputStream()
        backupService.exportBackup("My Test Store", "correct-password".toCharArray(), backupService.prepareExportSnapshot(), exportedBackup)

        backupService.importBackup(
            exportedBackup.toByteArray().inputStream(),
            "correct-password".toCharArray(),
        )

        val stagedSecret = Files.readString(importStagingRoot.resolve("imported-secret"))
        assertEquals(TEST_SECRET, stagedSecret)
    }

    @Test
    fun `importBackup stages an operation id`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val exportedBackup = ByteArrayOutputStream()
        backupService.exportBackup("My Test Store", "correct-password".toCharArray(), backupService.prepareExportSnapshot(), exportedBackup)

        backupService.importBackup(
            exportedBackup.toByteArray().inputStream(),
            "correct-password".toCharArray(),
        )

        assertTrue(!backupService.stagedOperationId().isNullOrBlank())
    }

    @Test
    fun `importBackup throws when the password is wrong`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val exportedBackup = ByteArrayOutputStream()
        backupService.exportBackup("My Test Store", "correct-password".toCharArray(), backupService.prepareExportSnapshot(), exportedBackup)

        assertFailsWith<IllegalArgumentException> {
            backupService.importBackup(
                exportedBackup.toByteArray().inputStream(),
                "wrong-password".toCharArray(),
            )
        }
    }

    @Test
    fun `importBackup throws when the file does not start with the Ambrosia backup magic header`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val notABackup = "this is not an ambrosia backup file".toByteArray(Charsets.UTF_8)

        assertFailsWith<IllegalArgumentException> {
            backupService.importBackup(notABackup.inputStream(), "correct-password".toCharArray())
        }
    }

    @Test
    fun `importBackup throws when the encrypted stream is truncated`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val exportedBackup = ByteArrayOutputStream()
        backupService.exportBackup("My Test Store", "correct-password".toCharArray(), backupService.prepareExportSnapshot(), exportedBackup)
        val truncatedBackup = exportedBackup.toByteArray().copyOfRange(0, 10)

        assertFailsWith<IllegalArgumentException> {
            backupService.importBackup(truncatedBackup.inputStream(), "correct-password".toCharArray())
        }
    }

    @Test
    fun `importBackup throws when the backup is missing manifest json`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val password = "correct-password".toCharArray()
        val backupWithoutManifest =
            buildEncryptedBackup(password, mapOf("ambrosia.db" to "fake-database-bytes".toByteArray()))

        assertFailsWith<IllegalArgumentException> {
            backupService.importBackup(backupWithoutManifest.inputStream(), password)
        }
    }

    @Test
    fun `importBackup throws when the backup schema is newer than this installation supports`() {
        seedFlywaySchemaHistory(installedRank = 5)
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val password = "correct-password".toCharArray()
        val newerSchemaManifest = sampleImportedManifest(schemaInstalledRank = 10)
        val backupWithNewerSchema =
            buildEncryptedBackup(password, mapOf("manifest.json" to manifestZipEntry(newerSchemaManifest)))

        assertFailsWith<IllegalArgumentException> {
            backupService.importBackup(backupWithNewerSchema.inputStream(), password)
        }
    }

    @Test
    fun `importBackup succeeds when the backup schema is not newer than this installation`() {
        seedFlywaySchemaHistory(installedRank = 5)
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val password = "correct-password".toCharArray()
        val sameSchemaManifest = sampleImportedManifest(schemaInstalledRank = 5)
        val backupWithSameSchema =
            buildEncryptedBackup(password, mapOf("manifest.json" to manifestZipEntry(sameSchemaManifest)))

        val importedManifest = backupService.importBackup(backupWithSameSchema.inputStream(), password)

        assertEquals(5, importedManifest.schemaInstalledRank)
    }

    @Test
    fun `importBackup does not leave a partial staging directory when rejected for an incompatible schema`() {
        seedFlywaySchemaHistory(installedRank = 5)
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val password = "correct-password".toCharArray()
        val newerSchemaManifest = sampleImportedManifest(schemaInstalledRank = 10)
        val backupWithNewerSchema =
            buildEncryptedBackup(password, mapOf("manifest.json" to manifestZipEntry(newerSchemaManifest)))

        assertFailsWith<IllegalArgumentException> {
            backupService.importBackup(backupWithNewerSchema.inputStream(), password)
        }

        assertFalse(Files.exists(importStagingRoot))
    }

    @Test
    fun `importBackup rejects a zip entry that tries to escape the staging directory`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val password = "correct-password".toCharArray()
        val maliciousEntryName = "../../../etc/escaped-file"
        val backupWithZipSlipEntry =
            buildEncryptedBackup(
                password,
                mapOf(
                    "manifest.json" to manifestZipEntry(sampleImportedManifest()),
                    maliciousEntryName to "malicious-bytes".toByteArray(),
                ),
            )

        assertFailsWith<SecurityException> {
            backupService.importBackup(backupWithZipSlipEntry.inputStream(), password)
        }
    }

    @Test
    fun `importBackup replaces an abandoned staging directory from a previous import`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val firstExport = ByteArrayOutputStream()
        backupService.exportBackup("First Store", "correct-password".toCharArray(), backupService.prepareExportSnapshot(), firstExport)
        backupService.importBackup(
            firstExport.toByteArray().inputStream(),
            "correct-password".toCharArray(),
        )
        Files.write(importStagingRoot.resolve("leftover-from-previous-import"), "stale".toByteArray())
        Files.writeString(
            importStagingRoot.resolve(BackupService.STAGED_AT_FILE_NAME),
            Instant.now().minus(2, ChronoUnit.DAYS).toString(),
        )

        val secondExport = ByteArrayOutputStream()
        backupService.exportBackup("Second Store", "correct-password".toCharArray(), backupService.prepareExportSnapshot(), secondExport)
        val importedManifest =
            backupService.importBackup(
                secondExport.toByteArray().inputStream(),
                "correct-password".toCharArray(),
            )

        assertEquals("Second Store", importedManifest.businessName)
        assertFalse(Files.exists(importStagingRoot.resolve("leftover-from-previous-import")))
    }

    @Test
    fun `importBackup throws when a fresh pending import already exists`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val firstExport = ByteArrayOutputStream()
        backupService.exportBackup("First Store", "correct-password".toCharArray(), backupService.prepareExportSnapshot(), firstExport)
        backupService.importBackup(
            firstExport.toByteArray().inputStream(),
            "correct-password".toCharArray(),
        )

        val secondExport = ByteArrayOutputStream()
        backupService.exportBackup("Second Store", "correct-password".toCharArray(), backupService.prepareExportSnapshot(), secondExport)

        assertFailsWith<PendingImportAlreadyStagedException> {
            backupService.importBackup(secondExport.toByteArray().inputStream(), "correct-password".toCharArray())
        }
    }

    @Test
    fun `importBackup clears the password array after use`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val exportedBackup = ByteArrayOutputStream()
        backupService.exportBackup("My Test Store", "correct-password".toCharArray(), backupService.prepareExportSnapshot(), exportedBackup)
        val password = "correct-password".toCharArray()

        backupService.importBackup(exportedBackup.toByteArray().inputStream(), password)

        assertTrue(password.all { it == Char(0) })
    }

    private fun confirmationTokenService(secret: String): TokenService =
        TokenService(applicationEnvironment { config = confirmationTokenConfig(secret) })

    private fun expiredConfirmationToken(
        secret: String,
        operationId: String,
    ): String =
        JWT
            .create()
            .withAudience(TokenService.JWT_AUDIENCE)
            .withIssuer(TokenService.JWT_ISSUER)
            .withClaim("scope", "backup_confirmation")
            .withClaim("operationId", operationId)
            .withExpiresAt(Date(System.currentTimeMillis() - 1000))
            .sign(Algorithm.HMAC256(secret))

    private fun confirmPendingImport(
        backupService: BackupService,
        secret: String,
    ) {
        val operationId = backupService.stagedOperationId() ?: return
        backupService.writeConfirmationToken(confirmationTokenService(secret).generateBackupConfirmationToken(operationId))
    }

    private fun importAndConfirmPendingImport(
        destinationService: BackupService,
        encryptedBackup: ByteArray,
        destinationSecret: String,
        confirm: Boolean = true,
    ) {
        destinationService.importBackup(encryptedBackup.inputStream(), "correct-password".toCharArray())
        if (confirm) {
            confirmPendingImport(destinationService, destinationSecret)
        }
    }

    private fun prepareStagedImport(
        destinationUploadsRoot: Path,
        destinationDatabaseFile: Path,
        destinationConfigFile: File,
        destinationKeyStoreFile: Path = Files.createTempDirectory("backupServiceTestDestinationKeyStoreParent").resolve("keystore.jks"),
        confirm: Boolean = true,
    ): BackupService {
        val exportingService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )
        val exportedBackup = ByteArrayOutputStream()
        exportingService.exportBackup(
            "My Test Store",
            "correct-password".toCharArray(),
            exportingService.prepareExportSnapshot(),
            exportedBackup,
        )

        val destinationService =
            BackupService(
                destinationUploadsRoot,
                destinationDatabaseFile.toString(),
                destinationConfigFile.absolutePath,
                importStagingRoot,
                destinationKeyStoreFile,
                environmentSecret = null,
            )
        val destinationSecret = destinationConfigFile.readText().trim().removePrefix("secret=")
        importAndConfirmPendingImport(destinationService, exportedBackup.toByteArray(), destinationSecret, confirm)
        return destinationService
    }

    private fun prepareStagedPhoenixdImport(
        zipPhoenixEntries: Map<String, ByteArray> = emptyMap(),
        destinationPhoenixDataDirectory: Path = Files.createTempDirectory("backupServiceTestDestinationPhoenixData"),
        destinationPhoenixConfigFile: File =
            Files.createTempFile("backupServiceTestDestinationPhoenixConfig", ".conf").toFile(),
    ): BackupService {
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        SecretsStore.ambrosiaConfigFile = KotlinIoPath(destinationConfigFile.absolutePath)
        val destinationKeyStoreFile =
            Files.createTempDirectory("backupServiceTestDestinationKeyStoreParent").resolve("keystore.jks")
        val destinationService =
            BackupService(
                destinationUploadsRoot,
                destinationDatabaseFile.toString(),
                destinationConfigFile.absolutePath,
                importStagingRoot,
                destinationKeyStoreFile,
                destinationPhoenixDataDirectory,
                destinationPhoenixConfigFile.absolutePath,
                environmentSecret = null,
            )

        val backupWithPhoenixEntries =
            buildEncryptedBackup(
                "correct-password".toCharArray(),
                mapOf(
                    "manifest.json" to manifestZipEntry(sampleImportedManifest()),
                    "ambrosia.db" to "fake-database-bytes".toByteArray(),
                ) + zipPhoenixEntries,
            )
        importAndConfirmPendingImport(destinationService, backupWithPhoenixEntries, "old-destination-secret")
        return destinationService
    }

    @Test
    fun `applyPendingImport restores the staged phoenix seed file`() {
        val destinationPhoenixDataDirectory = Files.createTempDirectory("backupServiceTestDestinationPhoenixData")
        val destinationService =
            prepareStagedPhoenixdImport(
                zipPhoenixEntries = mapOf("phoenix/seed.dat" to "test seed phrase words".toByteArray()),
                destinationPhoenixDataDirectory = destinationPhoenixDataDirectory,
            )

        destinationService.applyPendingImport()

        assertEquals("test seed phrase words", Files.readString(destinationPhoenixDataDirectory.resolve("seed.dat")))
    }

    @Test
    fun `applyPendingImport merges the staged phoenix config into the live phoenix conf, preserving other keys`() {
        val destinationPhoenixConfigFile =
            Files.createTempFile("backupServiceTestDestinationPhoenixConfig", ".conf").toFile()
        destinationPhoenixConfigFile.writeText("node-alias=my-node\nhttp-password=old-password\nchain=mainnet\n")
        val destinationService =
            prepareStagedPhoenixdImport(
                zipPhoenixEntries =
                    mapOf(
                        "phoenix/phoenix.conf" to
                            (
                                "http-password=staged-http-password\n" +
                                    "webhook-secret=staged-webhook-secret\n" +
                                    "chain=testnet"
                            ).toByteArray(),
                    ),
                destinationPhoenixConfigFile = destinationPhoenixConfigFile,
            )

        destinationService.applyPendingImport()

        val mergedPhoenixConfigText = destinationPhoenixConfigFile.readText()
        assertTrue(mergedPhoenixConfigText.contains("node-alias=my-node"))
        assertTrue(mergedPhoenixConfigText.contains("http-password=staged-http-password"))
        assertTrue(mergedPhoenixConfigText.contains("webhook-secret=staged-webhook-secret"))
        assertTrue(mergedPhoenixConfigText.contains("chain=testnet"))
        assertFalse(mergedPhoenixConfigText.contains("http-password=old-password"))
        assertFalse(mergedPhoenixConfigText.contains("chain=mainnet"))
    }

    @Test
    fun `applyPendingImport updates the SecretsStore-cached phoenixd credentials to match the restored phoenix conf`() {
        val destinationPhoenixConfigFile =
            Files.createTempFile("backupServiceTestDestinationPhoenixConfig", ".conf").toFile()
        val destinationService =
            prepareStagedPhoenixdImport(
                zipPhoenixEntries =
                    mapOf(
                        "phoenix/phoenix.conf" to
                            "http-password=restored-password\nwebhook-secret=restored-webhook-secret".toByteArray(),
                    ),
                destinationPhoenixConfigFile = destinationPhoenixConfigFile,
            )
        SecretsStore.setSecret("phoenixd-password", "stale-cached-password")
        SecretsStore.setSecret("phoenixd-webhook-secret", "stale-cached-webhook-secret")

        destinationService.applyPendingImport()

        assertEquals("restored-password", SecretsStore.getSecretOrNull("phoenixd-password"))
        assertEquals("restored-webhook-secret", SecretsStore.getSecretOrNull("phoenixd-webhook-secret"))
    }

    @Test
    fun `applyPendingImport leaves the SecretsStore-cached phoenixd credentials untouched when no phoenix conf was staged`() {
        val destinationService = prepareStagedPhoenixdImport()
        SecretsStore.setSecret("phoenixd-password", "unrelated-cached-password")

        destinationService.applyPendingImport()

        assertEquals("unrelated-cached-password", SecretsStore.getSecretOrNull("phoenixd-password"))
        assertEquals(null, SecretsStore.getSecretOrNull("phoenixd-webhook-secret"))
    }

    @Test
    fun `applyPendingImport restores the staged phoenix history database under its original file name`() {
        val destinationPhoenixDataDirectory = Files.createTempDirectory("backupServiceTestDestinationPhoenixData")
        val destinationService =
            prepareStagedPhoenixdImport(
                zipPhoenixEntries = mapOf("phoenix/phoenix.mainnet.abc123.db" to "history-database-bytes".toByteArray()),
                destinationPhoenixDataDirectory = destinationPhoenixDataDirectory,
            )

        destinationService.applyPendingImport()

        val restoredHistoryDatabase = destinationPhoenixDataDirectory.resolve("phoenix.mainnet.abc123.db")
        assertEquals("history-database-bytes", Files.readString(restoredHistoryDatabase))
    }

    @Test
    fun `applyPendingImport does not touch the live phoenix data when none was staged`() {
        val destinationPhoenixDataDirectory = Files.createTempDirectory("backupServiceTestDestinationPhoenixData")
        val destinationPhoenixConfigFile =
            Files.createTempFile("backupServiceTestDestinationPhoenixConfig", ".conf").toFile()
        destinationPhoenixConfigFile.writeText("node-alias=my-node\n")
        val destinationService =
            prepareStagedPhoenixdImport(
                destinationPhoenixDataDirectory = destinationPhoenixDataDirectory,
                destinationPhoenixConfigFile = destinationPhoenixConfigFile,
            )

        destinationService.applyPendingImport()

        assertFalse(Files.exists(destinationPhoenixDataDirectory.resolve("seed.dat")))
        assertEquals("node-alias=my-node\n", destinationPhoenixConfigFile.readText())
        val remainingPhoenixDataDirectoryEntries = Files.list(destinationPhoenixDataDirectory).use { it.toList() }
        assertTrue(remainingPhoenixDataDirectoryEntries.isEmpty())
    }

    @Test
    fun `applyPendingImport returns false when nothing is staged`() {
        val backupService =
            BackupService(
                uploadsRoot,
                databaseFile.absolutePath,
                configFile.absolutePath,
                importStagingRoot,
                environmentSecret = null,
            )

        assertFalse(backupService.applyPendingImport())
    }

    @Test
    fun `applyPendingImport discards an abandoned pending import without applying it`() {
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        Files.writeString(destinationDatabaseFile, "old-destination-database-placeholder")
        val originalDestinationDatabaseSize = Files.size(destinationDatabaseFile)
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseFile, destinationConfigFile)
        Files.writeString(
            importStagingRoot.resolve(BackupService.STAGED_AT_FILE_NAME),
            Instant.now().minus(2, ChronoUnit.DAYS).toString(),
        )

        val pendingImportApplied = destinationService.applyPendingImport()

        assertFalse(pendingImportApplied)
        assertFalse(Files.exists(importStagingRoot))
        assertEquals(originalDestinationDatabaseSize, Files.size(destinationDatabaseFile))
        assertEquals("secret=old-destination-secret", destinationConfigFile.readText().trim())
    }

    @Test
    fun `applyPendingImport discards a pending import with no staged-at timestamp without applying it`() {
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        Files.writeString(destinationDatabaseFile, "old-destination-database-placeholder")
        val originalDestinationDatabaseSize = Files.size(destinationDatabaseFile)
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseFile, destinationConfigFile)
        Files.deleteIfExists(importStagingRoot.resolve(BackupService.STAGED_AT_FILE_NAME))

        val pendingImportApplied = destinationService.applyPendingImport()

        assertFalse(pendingImportApplied)
        assertFalse(Files.exists(importStagingRoot))
        assertEquals(originalDestinationDatabaseSize, Files.size(destinationDatabaseFile))
        assertEquals("secret=old-destination-secret", destinationConfigFile.readText().trim())
    }

    @Test
    fun `applyPendingImport returns true after applying a staged import`() {
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseFile, destinationConfigFile)

        assertTrue(destinationService.applyPendingImport())
    }

    @Test
    fun `applyPendingImport replaces the live database file with the staged one`() {
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        Files.writeString(destinationDatabaseFile, "old-destination-database-placeholder")
        val originalDestinationDatabaseSize = Files.size(destinationDatabaseFile)
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseFile, destinationConfigFile)

        destinationService.applyPendingImport()

        assertTrue(Files.size(destinationDatabaseFile) != originalDestinationDatabaseSize)
    }

    @Test
    fun `applyPendingImport replaces the live uploads directory with the staged one`() {
        val dateDir = Files.createDirectory(uploadsRoot.resolve("2026-08-24"))
        Files.write(dateDir.resolve("logo.png"), "fake-image-bytes".toByteArray())
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        Files.write(destinationUploadsRoot.resolve("stale-destination-file.png"), "stale-bytes".toByteArray())
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseFile, destinationConfigFile)

        destinationService.applyPendingImport()

        assertTrue(Files.exists(destinationUploadsRoot.resolve("2026-08-24/logo.png")))
        assertFalse(Files.exists(destinationUploadsRoot.resolve("stale-destination-file.png")))
    }

    @Test
    fun `applyPendingImport removes the live uploads directory when the staged backup had none`() {
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        Files.write(destinationUploadsRoot.resolve("stale-destination-file.png"), "stale-bytes".toByteArray())
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseFile, destinationConfigFile)

        destinationService.applyPendingImport()

        assertFalse(Files.exists(destinationUploadsRoot))
    }

    @Test
    fun `applyPendingImport patches the secret in the live ambrosia conf`() {
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseFile, destinationConfigFile)

        destinationService.applyPendingImport()

        assertEquals("secret=$TEST_SECRET", destinationConfigFile.readText().trim())
    }

    @Test
    fun `applyPendingImport deletes the live keystore so it gets regenerated with the new secret`() {
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val destinationKeyStoreFile = Files.createTempFile("backupServiceTestDestinationKeyStore", ".jks")
        val destinationService =
            prepareStagedImport(
                destinationUploadsRoot,
                destinationDatabaseFile,
                destinationConfigFile,
                destinationKeyStoreFile,
            )

        destinationService.applyPendingImport()

        assertFalse(Files.exists(destinationKeyStoreFile))
    }

    @Test
    fun `applyPendingImport deletes stale WAL and SHM files next to the live database after the swap`() {
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val staleWalFile = Paths.get("$destinationDatabaseFile-wal")
        val staleSharedMemoryFile = Paths.get("$destinationDatabaseFile-shm")
        Files.write(staleWalFile, "stale-wal-bytes".toByteArray())
        Files.write(staleSharedMemoryFile, "stale-shm-bytes".toByteArray())
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseFile, destinationConfigFile)

        destinationService.applyPendingImport()

        assertFalse(Files.exists(staleWalFile))
        assertFalse(Files.exists(staleSharedMemoryFile))
    }

    @Test
    fun `applyPendingImport logs a warning and still completes when a stale WAL file cannot be deleted`() {
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        Files.writeString(destinationDatabaseFile, "old-destination-database-placeholder")
        val originalDestinationDatabaseSize = Files.size(destinationDatabaseFile)
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val undeletableWalFile = Paths.get("$destinationDatabaseFile-wal")
        Files.createDirectory(undeletableWalFile)
        Files.write(undeletableWalFile.resolve("cannot-be-deleted-as-a-file"), "x".toByteArray())
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseFile, destinationConfigFile)

        val pendingImportApplied = destinationService.applyPendingImport()

        assertTrue(pendingImportApplied)
        assertTrue(Files.size(destinationDatabaseFile) != originalDestinationDatabaseSize)
        assertEquals("secret=$TEST_SECRET", destinationConfigFile.readText().trim())
    }

    @Test
    fun `applyPendingImport retries the WAL cleanup and recovers once the lock clears`() {
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val recoverableWalFile = Paths.get("$destinationDatabaseFile-wal")
        Files.createDirectory(recoverableWalFile)
        val walLockMarker = recoverableWalFile.resolve("locked-until-cleared")
        Files.write(walLockMarker, "x".toByteArray())
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseFile, destinationConfigFile)

        Thread {
            Thread.sleep(50)
            Files.deleteIfExists(walLockMarker)
        }.start()
        val importStartedAt = Instant.now()
        val pendingImportApplied = destinationService.applyPendingImport()
        val importElapsedMilliseconds = Duration.between(importStartedAt, Instant.now()).toMillis()

        assertTrue(pendingImportApplied)
        assertFalse(Files.exists(recoverableWalFile))
        assertTrue(importElapsedMilliseconds >= 200)
    }

    @Test
    fun `applyPendingImport retries and eventually fails when the live database path cannot be replaced`() {
        val destinationDatabaseDirectory = Files.createTempDirectory("backupServiceTestDestinationDb")
        Files.write(destinationDatabaseDirectory.resolve("cannot-be-replaced-as-a-file"), "x".toByteArray())
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseDirectory, destinationConfigFile)

        assertFailsWith<FileSystemException> { destinationService.applyPendingImport() }
    }

    @Test
    fun `applyPendingImport removes the staging directory after applying`() {
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseFile, destinationConfigFile)

        destinationService.applyPendingImport()

        assertFalse(Files.exists(importStagingRoot))
    }

    @Test
    fun `applyPendingImport does not apply an unconfirmed pending import`() {
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        Files.writeString(destinationDatabaseFile, "old-destination-database-placeholder")
        val originalDestinationDatabaseSize = Files.size(destinationDatabaseFile)
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseFile, destinationConfigFile, confirm = false)

        val pendingImportApplied = destinationService.applyPendingImport()

        assertFalse(pendingImportApplied)
        assertEquals(originalDestinationDatabaseSize, Files.size(destinationDatabaseFile))
        assertEquals("secret=old-destination-secret", destinationConfigFile.readText().trim())
    }

    @Test
    fun `applyPendingImport does not delete an unconfirmed pending import`() {
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseFile, destinationConfigFile, confirm = false)

        destinationService.applyPendingImport()

        assertTrue(Files.exists(importStagingRoot))
    }

    @Test
    fun `applyPendingImport does not apply a confirmation for a different operation id`() {
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        Files.writeString(destinationDatabaseFile, "old-destination-database-placeholder")
        val originalDestinationDatabaseSize = Files.size(destinationDatabaseFile)
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseFile, destinationConfigFile)
        Files.writeString(
            importStagingRoot.resolve(BackupService.STAGED_OPERATION_ID_FILE_NAME),
            "a-newer-restaged-operation-id",
        )

        val pendingImportApplied = destinationService.applyPendingImport()

        assertFalse(pendingImportApplied)
        assertEquals(originalDestinationDatabaseSize, Files.size(destinationDatabaseFile))
    }

    @Test
    fun `applyPendingImport does not apply an expired confirmation`() {
        val destinationDatabaseFile = Files.createTempFile("backupServiceTestDestinationDb", ".db")
        Files.writeString(destinationDatabaseFile, "old-destination-database-placeholder")
        val originalDestinationDatabaseSize = Files.size(destinationDatabaseFile)
        val destinationUploadsRoot = Files.createTempDirectory("backupServiceTestDestinationUploads")
        val destinationConfigFile = Files.createTempFile("backupServiceTestDestinationConfig", ".conf").toFile()
        destinationConfigFile.writeText("secret=old-destination-secret\n")
        val destinationService =
            prepareStagedImport(destinationUploadsRoot, destinationDatabaseFile, destinationConfigFile, confirm = false)
        val operationId = destinationService.stagedOperationId()!!
        destinationService.writeConfirmationToken(expiredConfirmationToken("old-destination-secret", operationId))

        val pendingImportApplied = destinationService.applyPendingImport()

        assertFalse(pendingImportApplied)
        assertEquals(originalDestinationDatabaseSize, Files.size(destinationDatabaseFile))
    }
}
