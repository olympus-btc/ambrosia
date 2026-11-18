package pos.ambrosia.utils

import pos.ambrosia.services.BackupService
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.file.Files

fun buildEncryptedBackupBytes(
    databaseFile: File,
    businessName: String = "Source Store",
    rolePassword: CharArray = "correct-password".toCharArray(),
): ByteArray {
    val sourceConfigFile = Files.createTempFile("backupFixtureSourceConfig", ".conf").toFile()
    sourceConfigFile.writeText("secret=source-secret\n")
    val sourceBackupService =
        BackupService(
            uploadsRoot = Files.createTempDirectory("backupFixtureSourceUploads"),
            databasePath = databaseFile.absolutePath,
            configFilePath = sourceConfigFile.absolutePath,
        )
    val backupOutputStream = ByteArrayOutputStream()
    sourceBackupService.exportBackup(
        businessName,
        rolePassword,
        sourceBackupService.prepareExportSnapshot(),
        backupOutputStream,
    )
    return backupOutputStream.toByteArray()
}
