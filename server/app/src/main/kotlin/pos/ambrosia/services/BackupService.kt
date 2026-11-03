package pos.ambrosia.services

import kotlinx.serialization.json.Json
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.config.readConfValues
import pos.ambrosia.config.replaceConfFileProperty
import pos.ambrosia.datadir
import pos.ambrosia.logger
import pos.ambrosia.models.BackupManifest
import pos.ambrosia.models.BackupProgressPhase
import pos.ambrosia.utils.PendingImportAlreadyStagedException
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.nio.file.FileSystemException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption
import java.security.SecureRandom
import java.sql.DriverManager
import java.time.Duration
import java.time.Instant
import java.util.UUID
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream
import javax.crypto.Cipher
import javax.crypto.CipherInputStream
import javax.crypto.CipherOutputStream
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import kotlin.io.path.exists
import kotlin.io.path.isRegularFile
import kotlin.streams.asSequence
import kotlinx.io.files.Path as KotlinIoPath

class BackupService(
    private val uploadsRoot: Path = Paths.get(datadir.toString(), "uploads"),
    private val databasePath: String = Paths.get(datadir.toString(), "ambrosia.db").toString(),
    private val configFilePath: String = Paths.get(datadir.toString(), "ambrosia.conf").toString(),
    private val importStagingRoot: Path = Paths.get(datadir.toString(), "import-staging"),
    private val keyStoreFilePath: Path = Paths.get(datadir.toString(), "keystore.jks"),
) {
    companion object {
        // PBKDF2 turns the plain-text password into an actual AES key.
        private const val KEY_DERIVATION_ALGORITHM = "PBKDF2WithHmacSHA256"

        // Deliberately slow: makes guessing passwords against a stolen backup file expensive.
        private const val KEY_DERIVATION_ITERATIONS = 10000
        private const val KEY_LENGTH_BITS = 256

        // Random per export, so the same password never derives the same key twice.
        private const val SALT_LENGTH_BYTES = 16

        // Must never repeat for the same key — regenerated on every export.
        private const val INITIALIZATION_VECTOR_LENGTH_BYTES = 12

        // GCM's built-in tamper check: a wrong password or an altered file both fail to decrypt.
        private const val AUTHENTICATION_TAG_LENGTH_BITS = 128
        private const val COPY_BUFFER_SIZE_BYTES = 8192
        private val MAGIC_HEADER = "AMBROSIA-BACKUP-1".toByteArray(Charsets.UTF_8)
        private val secureRandom = SecureRandom()
        const val STAGED_SECRET_FILE_NAME = "imported-secret"
        const val STAGED_DATABASE_FILE_NAME = "ambrosia.db"
        const val STAGED_UPLOADS_DIR_NAME = "uploads"
        const val STAGED_AT_FILE_NAME = "staged-at"
        const val STAGED_OPERATION_ID_FILE_NAME = "operation-id"
        const val STAGED_CONFIRMATION_TOKEN_FILE_NAME = "confirmation-token"
        private val PENDING_IMPORT_ABANDONED_AFTER = Duration.ofHours(24)
        private const val FILE_LOCK_RETRY_MAX_ATTEMPTS = 7
        private const val FILE_LOCK_RETRY_DELAY_MILLISECONDS = 300L
    }

    fun prepareExportSnapshot(): Path {
        val databaseSnapshot = Files.createTempFile("ambrosia-backup-db-", ".sqlite")
        snapshotDatabase(databaseSnapshot)
        return databaseSnapshot
    }

    fun calculateExportTotalBytes(databaseSnapshot: Path): Long = Files.size(databaseSnapshot) + totalUploadsBytes()

    fun exportBackup(
        businessName: String,
        rolePassword: CharArray,
        databaseSnapshot: Path,
        backupOutputStream: OutputStream,
        onProgress: (phase: String, bytesProcessed: Long, totalBytes: Long?) -> Unit = { _, _, _ -> },
    ) {
        try {
            val totalExportBytes = calculateExportTotalBytes(databaseSnapshot)
            val salt = ByteArray(SALT_LENGTH_BYTES).also { secureRandom.nextBytes(it) }
            val initializationVector =
                ByteArray(INITIALIZATION_VECTOR_LENGTH_BYTES).also { secureRandom.nextBytes(it) }
            val secretKey = deriveKey(rolePassword, salt)

            // Salt and IV aren't secret, only unique — safe to store unencrypted right
            // before the ciphertext, where importBackup() reads them back from.
            backupOutputStream.write(MAGIC_HEADER)
            backupOutputStream.write(salt)
            backupOutputStream.write(initializationVector)

            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(
                Cipher.ENCRYPT_MODE,
                secretKey,
                GCMParameterSpec(AUTHENTICATION_TAG_LENGTH_BITS, initializationVector),
            )

            var bytesWritten = 0L
            val onBytesWritten: (Long) -> Unit = { chunkBytes ->
                bytesWritten += chunkBytes
                onProgress(BackupProgressPhase.WRITING, bytesWritten, totalExportBytes)
            }

            CipherOutputStream(backupOutputStream, cipher).use { encryptedOutput ->
                ZipOutputStream(encryptedOutput).use { zip ->
                    writeManifestEntry(zip, businessName, totalExportBytes)
                    writeFileEntry(zip, databaseSnapshot, "ambrosia.db", onBytesWritten)
                    writeUploadsEntries(zip, onBytesWritten)
                }
            }
        } finally {
            Files.deleteIfExists(databaseSnapshot)
            // Wipe the plain-text password from memory as soon as we're done with it.
            rolePassword.fill(Char(0))
        }
    }

    fun importBackup(
        encryptedBackupInputStream: InputStream,
        rolePassword: CharArray,
        onProgress: (phase: String, bytesProcessed: Long, totalBytes: Long?) -> Unit = { _, _, _ -> },
    ): BackupManifest {
        if (isPendingImportFresh()) {
            throw PendingImportAlreadyStagedException()
        }

        val magicHeader = readExactBytes(encryptedBackupInputStream, MAGIC_HEADER.size)
        if (!magicHeader.contentEquals(MAGIC_HEADER)) {
            throw IllegalArgumentException("Not a valid Ambrosia backup file")
        }
        val salt = readExactBytes(encryptedBackupInputStream, SALT_LENGTH_BYTES)
        val initializationVector = readExactBytes(encryptedBackupInputStream, INITIALIZATION_VECTOR_LENGTH_BYTES)
        val secretKey = deriveKey(rolePassword, salt)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(
            Cipher.DECRYPT_MODE,
            secretKey,
            GCMParameterSpec(AUTHENTICATION_TAG_LENGTH_BITS, initializationVector),
        )

        val stagingTempRoot = Files.createTempDirectory(importStagingRoot.parent, "import-staging-tmp-")
        try {
            val importedManifest =
                try {
                    CipherInputStream(encryptedBackupInputStream, cipher).use { decryptedInput ->
                        extractStagedBackup(ZipInputStream(decryptedInput), stagingTempRoot, onProgress)
                    }
                } catch (decryptionFailure: IOException) {
                    // GCM's tamper check fails the same way for a wrong password and for a
                    // corrupted file — the JDK surfaces both as this generic IOException.
                    throw IllegalArgumentException(
                        "Incorrect password or corrupted backup file",
                        decryptionFailure,
                    )
                }

            validateSchemaCompatibility(importedManifest)
            writeStagedSecret(stagingTempRoot, importedManifest.secret)
            writeStagedAt(stagingTempRoot)
            writeStagedOperationId(stagingTempRoot)

            deleteRecursivelyIfExists(importStagingRoot)
            Files.move(stagingTempRoot, importStagingRoot, StandardCopyOption.ATOMIC_MOVE)
            return importedManifest
        } finally {
            deleteRecursivelyIfExists(stagingTempRoot)
            // Wipe the plain-text password from memory as soon as we're done with it.
            rolePassword.fill(Char(0))
        }
    }

    fun stagedOperationId(): String? {
        val stagedOperationIdFile = importStagingRoot.resolve(STAGED_OPERATION_ID_FILE_NAME)
        if (!Files.exists(stagedOperationIdFile)) return null
        return Files.readString(stagedOperationIdFile)
    }

    fun writeConfirmationToken(confirmationToken: String) {
        Files.writeString(importStagingRoot.resolve(STAGED_CONFIRMATION_TOKEN_FILE_NAME), confirmationToken)
    }

    fun applyPendingImport(): Boolean {
        if (!Files.exists(importStagingRoot)) return false

        if (!isPendingImportFresh()) {
            logger.warn("Discarding an abandoned pending import staged at $importStagingRoot")
            deleteRecursivelyIfExists(importStagingRoot)
            return false
        }

        if (!isPendingImportConfirmed()) return false

        val stagedSecret = Files.readString(importStagingRoot.resolve(STAGED_SECRET_FILE_NAME))
        val stagedDatabaseFile = importStagingRoot.resolve(STAGED_DATABASE_FILE_NAME)
        retryOnFileLock {
            Files.move(
                stagedDatabaseFile,
                Paths.get(databasePath),
                StandardCopyOption.REPLACE_EXISTING,
                StandardCopyOption.ATOMIC_MOVE,
            )
        }
        deleteStaleWalFiles()

        deleteRecursivelyIfExists(uploadsRoot)
        val stagedUploadsDirectory = importStagingRoot.resolve(STAGED_UPLOADS_DIR_NAME)
        if (Files.exists(stagedUploadsDirectory)) {
            Files.move(stagedUploadsDirectory, uploadsRoot, StandardCopyOption.ATOMIC_MOVE)
        }

        replaceConfFileProperty(KotlinIoPath(configFilePath), "secret", stagedSecret)
        retryOnFileLock { Files.deleteIfExists(keyStoreFilePath) }
        importStagingRoot.toFile().deleteRecursively()

        logger.info("Applied a pending data import staged at $importStagingRoot")
        return true
    }

    private fun deleteStaleWalFiles() {
        for (walCompanionFileSuffix in listOf("-wal", "-shm")) {
            val staleWalCompanionFile = Paths.get("$databasePath$walCompanionFileSuffix")
            try {
                retryOnFileLock { Files.deleteIfExists(staleWalCompanionFile) }
            } catch (walCompanionCleanupError: FileSystemException) {
                logger.warn(
                    "Could not delete $staleWalCompanionFile after database swap, old WAL may contaminate " +
                        "imported data: ${walCompanionCleanupError.message}",
                )
            }
        }
    }

    private fun retryOnFileLock(fileOperation: () -> Unit) {
        repeat(FILE_LOCK_RETRY_MAX_ATTEMPTS) { attemptIndex ->
            try {
                fileOperation()
                return
            } catch (fileLockError: FileSystemException) {
                if (attemptIndex == FILE_LOCK_RETRY_MAX_ATTEMPTS - 1) throw fileLockError
                Thread.sleep(FILE_LOCK_RETRY_DELAY_MILLISECONDS)
            }
        }
    }

    private fun deleteRecursivelyIfExists(path: Path) {
        if (Files.exists(path)) {
            path.toFile().deleteRecursively()
        }
    }

    private fun isPendingImportFresh(): Boolean {
        val stagedAtFile = importStagingRoot.resolve(STAGED_AT_FILE_NAME)
        if (!Files.exists(stagedAtFile)) return false
        val stagedAt =
            try {
                Instant.parse(Files.readString(stagedAtFile))
            } catch (malformedStagedAt: Exception) {
                return false
            }
        return Duration.between(stagedAt, Instant.now()) <= PENDING_IMPORT_ABANDONED_AFTER
    }

    private fun writeStagedAt(stagingTempRoot: Path) {
        Files.writeString(stagingTempRoot.resolve(STAGED_AT_FILE_NAME), Instant.now().toString())
    }

    private fun writeStagedOperationId(stagingTempRoot: Path) {
        Files.writeString(stagingTempRoot.resolve(STAGED_OPERATION_ID_FILE_NAME), UUID.randomUUID().toString())
    }

    private fun isPendingImportConfirmed(): Boolean {
        val operationId = stagedOperationId() ?: return false
        val stagedConfirmationTokenFile = importStagingRoot.resolve(STAGED_CONFIRMATION_TOKEN_FILE_NAME)
        if (!Files.exists(stagedConfirmationTokenFile)) return false
        val stagedConfirmationToken = Files.readString(stagedConfirmationTokenFile)
        return TokenService.isBackupConfirmationTokenValid(readSecret(), stagedConfirmationToken, operationId)
    }

    private fun readExactBytes(
        input: InputStream,
        length: Int,
    ): ByteArray {
        val bytes = input.readNBytes(length)
        if (bytes.size != length) {
            throw IllegalArgumentException("Backup file is truncated or corrupted")
        }
        return bytes
    }

    private fun copyWithProgress(
        input: InputStream,
        output: OutputStream,
        onBytesCopied: (Long) -> Unit,
    ) {
        val buffer = ByteArray(COPY_BUFFER_SIZE_BYTES)
        while (true) {
            val bytesRead = input.read(buffer)
            if (bytesRead == -1) break
            output.write(buffer, 0, bytesRead)
            onBytesCopied(bytesRead.toLong())
        }
    }

    private fun extractStagedBackup(
        zip: ZipInputStream,
        stagingTempRoot: Path,
        onProgress: (phase: String, bytesProcessed: Long, totalBytes: Long?) -> Unit,
    ): BackupManifest {
        var importedManifest: BackupManifest? = null
        var bytesExtracted = 0L
        zip.use {
            var zipEntry = zip.nextEntry
            while (zipEntry != null) {
                if (zipEntry.name == "manifest.json") {
                    val manifestJson = String(zip.readBytes(), Charsets.UTF_8)
                    importedManifest = Json.decodeFromString(BackupManifest.serializer(), manifestJson)
                } else if (!zipEntry.isDirectory) {
                    val destination = resolveStagingEntryPath(stagingTempRoot, zipEntry.name)
                    Files.createDirectories(destination.parent)
                    Files.newOutputStream(destination).use { stagedEntryOutputStream ->
                        copyWithProgress(zip, stagedEntryOutputStream) { chunkBytes ->
                            bytesExtracted += chunkBytes
                            onProgress(
                                BackupProgressPhase.EXTRACTING,
                                bytesExtracted,
                                importedManifest?.totalUncompressedBytes,
                            )
                        }
                    }
                }
                zipEntry = zip.nextEntry
            }
        }
        return importedManifest ?: throw IllegalArgumentException("Backup is missing manifest.json")
    }

    private fun resolveStagingEntryPath(
        stagingTempRoot: Path,
        entryName: String,
    ): Path {
        val resolvedPath = stagingTempRoot.resolve(entryName).normalize()
        if (!resolvedPath.startsWith(stagingTempRoot)) {
            throw SecurityException("Backup contains an unsafe file path: $entryName")
        }
        return resolvedPath
    }

    private fun validateSchemaCompatibility(importedManifest: BackupManifest) {
        val currentInstalledRank = highestInstalledRank()
        val importedInstalledRank = importedManifest.schemaInstalledRank
        val backupIsNewerThanSupported =
            currentInstalledRank != null &&
                importedInstalledRank != null &&
                importedInstalledRank > currentInstalledRank
        if (backupIsNewerThanSupported) {
            throw IllegalArgumentException(
                "Backup schema (rank $importedInstalledRank) is newer than this installation supports " +
                    "(rank $currentInstalledRank)",
            )
        }
    }

    private fun writeStagedSecret(
        stagingTempRoot: Path,
        secret: String,
    ) {
        Files.writeString(stagingTempRoot.resolve(STAGED_SECRET_FILE_NAME), secret)
    }

    private fun snapshotDatabase(destination: Path) {
        DriverManager.getConnection("jdbc:sqlite:$databasePath").use { connection ->
            connection.createStatement().use { statement ->
                statement.execute("VACUUM INTO '${destination.toAbsolutePath()}'")
            }
        }
    }

    private fun deriveKey(
        password: CharArray,
        salt: ByteArray,
    ): SecretKeySpec {
        val secretKeyFactory = SecretKeyFactory.getInstance(KEY_DERIVATION_ALGORITHM)
        val keyDerivationSpec = PBEKeySpec(password, salt, KEY_DERIVATION_ITERATIONS, KEY_LENGTH_BITS)
        val keyBytes = secretKeyFactory.generateSecret(keyDerivationSpec).encoded
        return SecretKeySpec(keyBytes, "AES")
    }

    private fun writeManifestEntry(
        zip: ZipOutputStream,
        businessName: String,
        totalUncompressedBytes: Long,
    ) {
        val manifest =
            BackupManifest(
                appVersion = readAppVersion(),
                schemaInstalledRank = highestInstalledRank(),
                businessName = businessName,
                secret = readSecret(),
                totalUncompressedBytes = totalUncompressedBytes,
            )
        zip.putNextEntry(ZipEntry("manifest.json"))
        zip.write(Json.encodeToString(BackupManifest.serializer(), manifest).toByteArray(Charsets.UTF_8))
        zip.closeEntry()
    }

    private fun writeFileEntry(
        zip: ZipOutputStream,
        source: Path,
        entryName: String,
        onBytesWritten: (Long) -> Unit,
    ) {
        zip.putNextEntry(ZipEntry(entryName))
        Files.newInputStream(source).use { fileInputStream -> copyWithProgress(fileInputStream, zip, onBytesWritten) }
        zip.closeEntry()
    }

    private fun writeUploadsEntries(
        zip: ZipOutputStream,
        onBytesWritten: (Long) -> Unit,
    ) {
        if (!uploadsRoot.exists()) return

        Files.walk(uploadsRoot).use { paths ->
            paths
                .asSequence()
                .filter { it.isRegularFile() }
                .forEach { file ->
                    val relativeUploadPath = uploadsRoot.relativize(file).toString().replace('\\', '/')
                    writeFileEntry(zip, file, "uploads/$relativeUploadPath", onBytesWritten)
                }
        }
    }

    private fun totalUploadsBytes(): Long {
        if (!uploadsRoot.exists()) return 0

        return Files.walk(uploadsRoot).use { paths ->
            paths.asSequence().filter { it.isRegularFile() }.sumOf { Files.size(it) }
        }
    }

    private fun highestInstalledRank(): Int? =
        try {
            transaction {
                var rank: Int? = null
                exec("SELECT MAX(installed_rank) as max_rank FROM flyway_schema_history") { resultSet ->
                    if (resultSet.next()) {
                        rank = resultSet.getInt("max_rank")
                    }
                }
                rank
            }
        } catch (missingHistoryTable: Exception) {
            null
        }

    private fun readAppVersion(): String = BackupService::class.java.`package`?.implementationVersion ?: "dev"

    private fun readSecret(): String =
        readConfValues(KotlinIoPath(configFilePath))["secret"]
            ?: throw IllegalStateException("secret not found in ambrosia.conf")
}
