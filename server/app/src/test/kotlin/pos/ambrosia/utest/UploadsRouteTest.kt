package pos.ambrosia.utest

import io.ktor.client.request.forms.MultiPartFormDataContent
import io.ktor.client.request.forms.formData
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.handler
import pos.ambrosia.api.uploads
import pos.ambrosia.configureAuthentication
import pos.ambrosia.services.ConfigService
import pos.ambrosia.services.UploadService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals

private val PNG_SIGNATURE_BYTES = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)

private fun fakePngBytes(): ByteArray = PNG_SIGNATURE_BYTES + "-rest-of-the-file".toByteArray()

private fun multipartBody(
    filename: String,
    contentType: String,
    bytes: ByteArray,
): MultiPartFormDataContent =
    MultiPartFormDataContent(
        formData {
            append(
                "files",
                bytes,
                Headers.build {
                    append(HttpHeaders.ContentType, contentType)
                    append(HttpHeaders.ContentDisposition, "filename=\"$filename\"")
                },
            )
        },
    )

private fun testApplicationConfig() =
    MapApplicationConfig(
        "secret" to "uploads-route-test-secret",
        "jwt.issuer" to "uploads-route-test-issuer",
        "jwt.audience" to "uploads-route-test-audience",
    )

private fun Application.installTestUploadsRoute(uploadService: UploadService) {
    install(ContentNegotiation) { json() }
    configureAuthentication()
    handler()
    routing { uploads(uploadService, ConfigService()) }
}

class UploadsRouteTest {
    private lateinit var databaseFile: File
    private lateinit var uploadService: UploadService

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
        uploadService = UploadService(Files.createTempDirectory("uploadsRouteTest"))
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    @Test
    fun `uploads a valid PNG and responds 201`() =
        testApplication {
            environment { config = testApplicationConfig() }
            application { installTestUploadsRoute(uploadService) }

            val uploadResponse =
                client.post("/uploads") {
                    setBody(multipartBody("example.png", "image/png", fakePngBytes()))
                }

            assertEquals(HttpStatusCode.Created, uploadResponse.status)
        }

    @Test
    fun `rejects a file with a disallowed content type`() =
        testApplication {
            environment { config = testApplicationConfig() }
            application { installTestUploadsRoute(uploadService) }

            val maliciousPayload = "<script>alert(1)</script>".toByteArray()
            val disallowedContentTypeResponse =
                client.post("/uploads") {
                    setBody(multipartBody("malicious.html", "text/html", maliciousPayload))
                }

            assertEquals(HttpStatusCode.BadRequest, disallowedContentTypeResponse.status)
        }

    @Test
    fun `rejects an anonymous upload once a business config exists`() =
        testApplication {
            ExposedTestDb.seedConfig(timezone = "America/Mexico_City")
            environment { config = testApplicationConfig() }
            application { installTestUploadsRoute(uploadService) }

            val rejectedAnonymousUploadResponse =
                client.post("/uploads") {
                    setBody(multipartBody("example.png", "image/png", fakePngBytes()))
                }

            assertEquals(HttpStatusCode.Unauthorized, rejectedAnonymousUploadResponse.status)
        }

    @Test
    fun `allows an anonymous upload before any business config exists`() =
        testApplication {
            environment { config = testApplicationConfig() }
            application { installTestUploadsRoute(uploadService) }

            val allowedAnonymousUploadResponse =
                client.post("/uploads") {
                    setBody(multipartBody("example.png", "image/png", fakePngBytes()))
                }

            assertEquals(HttpStatusCode.Created, allowedAnonymousUploadResponse.status)
        }
}
