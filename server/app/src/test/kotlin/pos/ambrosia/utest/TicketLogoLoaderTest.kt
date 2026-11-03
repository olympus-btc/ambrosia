package pos.ambrosia.utest

import org.junit.After
import org.junit.Before
import org.junit.Test
import pos.ambrosia.services.TicketLogoLoader
import java.awt.image.BufferedImage
import java.nio.file.Files
import java.nio.file.Path
import javax.imageio.ImageIO
import kotlin.io.path.createDirectories
import kotlin.io.path.writeText
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class TicketLogoLoaderTest {
    private lateinit var dataFolder: Path
    private lateinit var uploadRoot: Path
    private lateinit var logoLoader: TicketLogoLoader

    @Before
    fun setUp() {
        dataFolder = Files.createTempDirectory("ambrosia-logo-test")
        uploadRoot = dataFolder.resolve("uploads").createDirectories()
        logoLoader = TicketLogoLoader(uploadRoot)
        writePngLogo(uploadRoot.resolve("2026-10").createDirectories().resolve("alice.png"), width = 100, height = 50)
    }

    @After
    fun tearDown() {
        dataFolder.toFile().deleteRecursively()
    }

    @Test
    fun `loadScaledLogo scales the logo to the target width keeping its proportion`() {
        val scaledLogo = assertNotNull(logoLoader.loadScaledLogo("/uploads/2026-10/alice.png", 192))

        assertEquals(192, scaledLogo.width)
        assertEquals(96, scaledLogo.height)
    }

    @Test
    fun `loadScaledLogo accepts absolute upload urls`() {
        val scaledLogo = logoLoader.loadScaledLogo("http://localhost:9154/uploads/2026-10/alice.png?version=2", 288)

        assertEquals(288, assertNotNull(scaledLogo).width)
    }

    @Test
    fun `loadScaledLogo rejects paths outside the uploads folder`() {
        writePngLogo(dataFolder.resolve("mallory.png"), width = 10, height = 10)

        assertNull(logoLoader.loadScaledLogo("/uploads/../mallory.png", 192))
    }

    @Test
    fun `loadScaledLogo returns null for urls that are not uploads`() {
        assertNull(logoLoader.loadScaledLogo("https://example.com/bob.png", 192))
    }

    @Test
    fun `loadScaledLogo returns null when the logo file does not exist`() {
        assertNull(logoLoader.loadScaledLogo("/uploads/2026-10/eve.png", 192))
    }

    @Test
    fun `loadScaledLogo returns null for unreadable image formats`() {
        uploadRoot.resolve("2026-10/bob.webp").writeText("not an image")

        assertNull(logoLoader.loadScaledLogo("/uploads/2026-10/bob.webp", 192))
    }

    private fun writePngLogo(
        logoFile: Path,
        width: Int,
        height: Int,
    ) {
        ImageIO.write(BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB), "png", logoFile.toFile())
    }
}
