package pos.ambrosia.utest

import io.ktor.utils.io.ByteReadChannel
import org.junit.Before
import pos.ambrosia.services.UploadService
import pos.ambrosia.utils.UnsupportedUploadTypeException
import java.nio.file.Files
import java.nio.file.Path
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

private val PNG_SIGNATURE_BYTES = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
private val JPEG_SIGNATURE_BYTES = byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 0xFF.toByte())
private val WEBP_SIGNATURE_BYTES =
    "RIFF".toByteArray(Charsets.US_ASCII) + byteArrayOf(0, 0, 0, 0) + "WEBP".toByteArray(Charsets.US_ASCII)

private fun fakeImageBytes(signatureBytes: ByteArray): ByteArray = signatureBytes + "-rest-of-the-file".toByteArray()

class UploadServiceTest {
    private lateinit var uploadDirectory: Path
    private lateinit var uploadService: UploadService

    @Before
    fun setUp() {
        uploadDirectory = Files.createTempDirectory("uploadServiceTest")
        uploadService = UploadService(uploadDirectory)
    }

    @Test
    fun `saves a valid PNG under a dated folder`() {
        val pngPayload = fakeImageBytes(PNG_SIGNATURE_BYTES)

        val savedPng = uploadService.saveFile("example.png") { ByteReadChannel(pngPayload) }

        val today = LocalDate.now().toString()
        assertTrue(savedPng.relativePath.startsWith("/uploads/$today/"))
        assertTrue(savedPng.relativePath.endsWith(".png"))

        val storedPath = uploadDirectory.resolve(savedPng.relativePath.removePrefix("/uploads/"))
        assertTrue(Files.exists(storedPath))
        assertEquals(pngPayload.toList(), Files.readAllBytes(storedPath).toList())
    }

    @Test
    fun `saves a valid JPEG with either jpg or jpeg extension`() {
        val jpegPayload = fakeImageBytes(JPEG_SIGNATURE_BYTES)

        val savedJpg = uploadService.saveFile("photo.jpg") { ByteReadChannel(jpegPayload) }
        val savedJpeg = uploadService.saveFile("photo.jpeg") { ByteReadChannel(jpegPayload) }

        assertTrue(savedJpg.relativePath.endsWith(".jpg"))
        assertTrue(savedJpeg.relativePath.endsWith(".jpeg"))
    }

    @Test
    fun `saves a valid WebP file`() {
        val webpPayload = fakeImageBytes(WEBP_SIGNATURE_BYTES)

        val savedWebp = uploadService.saveFile("banner.webp") { ByteReadChannel(webpPayload) }

        assertTrue(savedWebp.relativePath.endsWith(".webp"))
    }

    @Test
    fun `extension match is case-insensitive`() {
        val pngPayload = fakeImageBytes(PNG_SIGNATURE_BYTES)

        val savedPng = uploadService.saveFile("example.PNG") { ByteReadChannel(pngPayload) }

        assertTrue(savedPng.relativePath.endsWith(".png"))
    }

    @Test
    fun `rejects content whose bytes do not match the claimed extension`() {
        val htmlPayload = "<script>alert(1)</script>".toByteArray()

        assertFailsWith<UnsupportedUploadTypeException> {
            uploadService.saveFile("fake.png") { ByteReadChannel(htmlPayload) }
        }
    }

    @Test
    fun `rejects an extension outside the allowlist regardless of content`() {
        val pngPayload = fakeImageBytes(PNG_SIGNATURE_BYTES)

        assertFailsWith<UnsupportedUploadTypeException> {
            uploadService.saveFile("payload.html") { ByteReadChannel(pngPayload) }
        }
    }

    @Test
    fun `rejects a file with no extension`() {
        val pngPayload = fakeImageBytes(PNG_SIGNATURE_BYTES)

        assertFailsWith<UnsupportedUploadTypeException> {
            uploadService.saveFile("noextension") { ByteReadChannel(pngPayload) }
        }
    }

    @Test
    fun `rejects a file too short to contain a valid signature`() {
        assertFailsWith<UnsupportedUploadTypeException> {
            uploadService.saveFile("example.png") { ByteReadChannel(byteArrayOf(0x89.toByte(), 0x50)) }
        }
    }
}
