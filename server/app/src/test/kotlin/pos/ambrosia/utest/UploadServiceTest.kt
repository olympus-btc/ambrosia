package pos.ambrosia.utest

import io.ktor.utils.io.ByteReadChannel
import pos.ambrosia.services.UploadService
import java.nio.file.Files
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class UploadServiceTest {
    @Test
    fun savesFileUnderDatedFolder() {
        val tempDir = Files.createTempDirectory("uploadServiceTest")
        val service = UploadService(tempDir)
        val payload = "hello-upload".toByteArray()

        val saved = service.saveFile("example.png") { ByteReadChannel(payload) }

        val today = LocalDate.now().toString()
        assertTrue(saved.relativePath.startsWith("/uploads/$today/"))

        val storedPath = tempDir.resolve(saved.relativePath.removePrefix("/uploads/"))
        assertTrue(Files.exists(storedPath))
        val storedBytes = Files.readAllBytes(storedPath)
        assertEquals(payload.toList(), storedBytes.toList())
    }
}
