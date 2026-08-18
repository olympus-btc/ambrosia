package pos.ambrosia.utest

import kotlinx.io.files.Path
import pos.ambrosia.config.readConfValues
import pos.ambrosia.config.replaceConfFileProperty
import pos.ambrosia.config.writeConfValues
import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ConfigFileTest {
    private fun tempConfFile(initialContent: String? = null): Path {
        val tempDir = Files.createTempDirectory("configFileTest")
        val confFile = Path(tempDir.toString(), "test.conf")
        if (initialContent != null) {
            File(confFile.toString()).writeText(initialContent)
        }
        return confFile
    }

    @Test
    fun `writeConfValues replaces target keys and preserves unrelated lines`() {
        val confFile = File.createTempFile("ambrosia-test", ".conf")
        try {
            confFile.writeText(
                """
                http-bind-ip=127.0.0.1
                web-push-enabled=false
                secret=existing-secret
                web-push-vapid-public-key=old-public-key
                """.trimIndent() + "\n",
            )

            writeConfValues(
                Path(confFile.absolutePath),
                mapOf(
                    "web-push-enabled" to "true",
                    "web-push-vapid-public-key" to "new-public-key",
                ),
            )

            assertEquals(
                listOf(
                    "http-bind-ip=127.0.0.1",
                    "secret=existing-secret",
                    "web-push-enabled=true",
                    "web-push-vapid-public-key=new-public-key",
                ),
                confFile.readLines(),
            )
            assertEquals(
                "true",
                readConfValues(Path(confFile.absolutePath)).getValue("web-push-enabled"),
            )
        } finally {
            confFile.delete()
        }
    }

    @Test
    fun `replaceConfFileProperty adds the key when the file does not exist yet`() {
        val confFile = tempConfFile()

        val wroteFile = replaceConfFileProperty(confFile, "nwc-uri", "nostr+walletconnect://abc")

        assertTrue(wroteFile)
        assertEquals("nwc-uri=nostr+walletconnect://abc\n", File(confFile.toString()).readText())
    }

    @Test
    fun `replaceConfFileProperty replaces the existing value for the key`() {
        val confFile = tempConfFile("nwc-uri=old-uri\n")

        val wroteFile = replaceConfFileProperty(confFile, "nwc-uri", "new-uri")

        assertTrue(wroteFile)
        assertEquals("nwc-uri=new-uri\n", File(confFile.toString()).readText())
    }

    @Test
    fun `replaceConfFileProperty drops duplicate lines and keeps only one replaced occurrence`() {
        val confFile = tempConfFile("nwc-uri=old-uri-1\nnwc-uri=old-uri-2\n")

        replaceConfFileProperty(confFile, "nwc-uri", "new-uri")

        assertEquals("nwc-uri=new-uri\n", File(confFile.toString()).readText())
    }

    @Test
    fun `replaceConfFileProperty preserves unrelated lines`() {
        val confFile = tempConfFile("secret=abc\nnwc-uri=old-uri\nhttp-bind-port=9154\n")

        replaceConfFileProperty(confFile, "nwc-uri", "new-uri")

        assertEquals(
            "secret=abc\nnwc-uri=new-uri\nhttp-bind-port=9154\n",
            File(confFile.toString()).readText(),
        )
    }

    @Test
    fun `replaceConfFileProperty returns false and does not rewrite the file when the value is unchanged`() {
        val confFile = tempConfFile("nwc-uri=same-uri\n")

        val wroteFile = replaceConfFileProperty(confFile, "nwc-uri", "same-uri")

        assertFalse(wroteFile)
    }
}
