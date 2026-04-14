package pos.ambrosia.services

import io.ktor.utils.io.ByteReadChannel
import io.ktor.utils.io.copyTo
import kotlinx.coroutines.runBlocking
import java.nio.channels.Channels
import java.nio.file.Files
import java.nio.file.Path
import java.time.LocalDate
import java.util.UUID

data class SavedUpload(
    val relativePath: String,
)

class UploadService(
    private val baseDir: Path,
) {
    fun saveFile(
        originalFileName: String?,
        streamProvider: () -> ByteReadChannel,
    ): SavedUpload {
        val dateSegment = LocalDate.now().toString()
        val dayDir = baseDir.resolve(dateSegment)
        Files.createDirectories(dayDir)

        val extension = originalFileName?.substringAfterLast('.', "")?.takeIf { it.isNotBlank() }
        val filename = if (extension != null) "${UUID.randomUUID()}.$extension" else UUID.randomUUID().toString()
        val target = dayDir.resolve(filename)

        val channel = streamProvider()
        Files.newOutputStream(target).use { output ->
            val writable = Channels.newChannel(output)
            runBlocking { channel.copyTo(writable) }
        }
        channel.cancel(null)

        val relativePath = "/uploads/$dateSegment/$filename"
        return SavedUpload(relativePath)
    }
}
