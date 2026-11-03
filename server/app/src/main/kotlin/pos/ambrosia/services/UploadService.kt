package pos.ambrosia.services

import io.ktor.utils.io.ByteReadChannel
import io.ktor.utils.io.copyTo
import io.ktor.utils.io.readAvailable
import kotlinx.coroutines.runBlocking
import pos.ambrosia.utils.UnsupportedUploadTypeException
import java.nio.channels.Channels
import java.nio.file.Files
import java.nio.file.Path
import java.time.LocalDate
import java.util.UUID

data class SavedUpload(
    val relativePath: String,
)

private data class AllowedUploadType(
    val extension: String,
    val contentType: String,
    val signatureBytesByOffset: Map<Int, ByteArray>,
)

private const val SIGNATURE_PEEK_SIZE = 12

private val ALLOWED_UPLOAD_TYPES =
    listOf(
        AllowedUploadType(
            extension = "png",
            contentType = "image/png",
            signatureBytesByOffset =
                mapOf(0 to byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)),
        ),
        AllowedUploadType(
            extension = "jpg",
            contentType = "image/jpeg",
            signatureBytesByOffset =
                mapOf(0 to byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 0xFF.toByte())),
        ),
        AllowedUploadType(
            extension = "jpeg",
            contentType = "image/jpeg",
            signatureBytesByOffset =
                mapOf(0 to byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 0xFF.toByte())),
        ),
        AllowedUploadType(
            extension = "webp",
            contentType = "image/webp",
            signatureBytesByOffset =
                mapOf(
                    0 to "RIFF".toByteArray(Charsets.US_ASCII),
                    8 to "WEBP".toByteArray(Charsets.US_ASCII),
                ),
        ),
    )

private fun matchesSignature(
    prefix: ByteArray,
    validByteCount: Int,
    allowedType: AllowedUploadType,
): Boolean =
    allowedType.signatureBytesByOffset.all { (offset, expectedBytes) ->
        offset + expectedBytes.size <= validByteCount &&
            expectedBytes.indices.all { index -> prefix[offset + index] == expectedBytes[index] }
    }

class UploadService(
    private val baseDir: Path,
) {
    companion object {
        val ALLOWED_CONTENT_TYPES: Set<String> = ALLOWED_UPLOAD_TYPES.map { it.contentType }.toSet()
    }

    fun saveFile(
        originalFileName: String?,
        streamProvider: () -> ByteReadChannel,
    ): SavedUpload {
        val dateSegment = LocalDate.now().toString()
        val dayDir = baseDir.resolve(dateSegment)
        Files.createDirectories(dayDir)

        val requestedExtension = originalFileName?.substringAfterLast('.', "")?.lowercase()
        val channel = streamProvider()
        val signaturePrefix = ByteArray(SIGNATURE_PEEK_SIZE)
        val signatureBytesRead =
            runBlocking {
                var totalBytesRead = 0
                while (totalBytesRead < SIGNATURE_PEEK_SIZE) {
                    val remainingLength = SIGNATURE_PEEK_SIZE - totalBytesRead
                    val bytesRead = channel.readAvailable(signaturePrefix, totalBytesRead, remainingLength)
                    if (bytesRead < 0) break
                    totalBytesRead += bytesRead
                }
                totalBytesRead
            }

        val matchedType =
            ALLOWED_UPLOAD_TYPES.firstOrNull { allowedType ->
                allowedType.extension == requestedExtension &&
                    matchesSignature(signaturePrefix, signatureBytesRead, allowedType)
            }
        if (matchedType == null) {
            channel.cancel(null)
            throw UnsupportedUploadTypeException()
        }

        val filename = "${UUID.randomUUID()}.${matchedType.extension}"
        val target = dayDir.resolve(filename)
        Files.newOutputStream(target).use { output ->
            output.write(signaturePrefix, 0, signatureBytesRead)
            val writable = Channels.newChannel(output)
            runBlocking { channel.copyTo(writable) }
        }
        channel.cancel(null)

        val relativePath = "/uploads/$dateSegment/$filename"
        return SavedUpload(relativePath)
    }
}
