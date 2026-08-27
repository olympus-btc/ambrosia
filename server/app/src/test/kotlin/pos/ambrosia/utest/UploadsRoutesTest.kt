package pos.ambrosia.utest

import io.ktor.client.request.forms.MultiPartFormDataContent
import io.ktor.client.request.forms.formData
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.routing.routing
import io.ktor.server.testing.ApplicationTestBuilder
import pos.ambrosia.api.uploads
import pos.ambrosia.services.ConfigService
import pos.ambrosia.services.UploadService
import pos.ambrosia.utils.AuthCookies
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.installAdminAuth
import pos.ambrosia.utils.installRoutes
import pos.ambrosia.utils.routeTest
import pos.ambrosia.utils.withAuthCookies
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.createTempDirectory
import kotlin.io.path.name
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class UploadsRoutesTest {
    private lateinit var uploadRoot: Path

    @Test
    fun `upload without a token is allowed before the config row exists`() =
        uploadTest {
            val response = client.post("/uploads") { setBody(filePart("logo.png")) }

            assertEquals(HttpStatusCode.Created, response.status)
        }

    @Test
    fun `upload without a token is rejected once the config row exists`() =
        uploadTest {
            ExposedTestDb.seedConfig("UTC")

            val response = client.post("/uploads") { setBody(filePart("logo.png")) }

            assertEquals(HttpStatusCode.Unauthorized, response.status)
            assertTrue(storedFiles().isEmpty(), "a rejected upload must not write a file")
        }

    @Test
    fun `upload with a token is accepted once the config row exists`() =
        uploadTest { auth ->
            ExposedTestDb.seedConfig("UTC")

            val response =
                client.post("/uploads") {
                    withAuthCookies(auth)
                    setBody(filePart("logo.png"))
                }

            assertEquals(HttpStatusCode.Created, response.status)
            assertEquals(1, storedFiles().size)
        }

    @Test
    fun `a request with no file part is a bad request`() =
        uploadTest {
            val response =
                client.post("/uploads") {
                    setBody(MultiPartFormDataContent(formData { append("note", "no file here") }))
                }

            assertEquals(HttpStatusCode.BadRequest, response.status)
        }

    @Test
    fun `a traversal filename cannot escape the upload root`() =
        uploadTest {
            val response = client.post("/uploads") { setBody(filePart("../../../evil.png")) }

            assertEquals(HttpStatusCode.Created, response.status)
            val stored = storedFiles()
            assertEquals(1, stored.size)
            assertFalse(stored.single().name.contains("evil"), "the client filename must not be reused")
            assertTrue(stored.single().name.endsWith(".png"))
            assertTrue(stored.single().startsWith(uploadRoot), "the file must stay under the upload root")
        }

    @Test
    fun `the response points at the stored path under uploads`() =
        uploadTest {
            val response = client.post("/uploads") { setBody(filePart("logo.png")) }

            assertTrue(response.bodyAsText().contains("\"path\":\"/uploads/"))
        }

    private fun filePart(fileName: String) =
        MultiPartFormDataContent(
            formData {
                append(
                    "file",
                    byteArrayOf(1, 2, 3, 4),
                    Headers.build {
                        append(HttpHeaders.ContentType, ContentType.Image.PNG.toString())
                        append(HttpHeaders.ContentDisposition, "filename=\"$fileName\"")
                    },
                )
            },
        )

    private fun storedFiles(): List<Path> =
        Files
            .walk(uploadRoot)
            .filter { Files.isRegularFile(it) }
            .toList()

    private fun uploadTest(block: suspend ApplicationTestBuilder.(AuthCookies) -> Unit) =
        routeTest {
            uploadRoot = createTempDirectory("ambrosia-uploads-test")
            val auth = installAdminAuth()
            installRoutes {
                routing { uploads(UploadService(uploadRoot), ConfigService()) }
            }
            block(auth)
        }
}
