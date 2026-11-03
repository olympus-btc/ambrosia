package pos.ambrosia.utest

import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.ApplicationEnvironment
import io.ktor.server.application.install
import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.applicationEnvironment
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.testApplication
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.configureAuth
import pos.ambrosia.configureAuthentication
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.models.AuthResponse
import pos.ambrosia.services.TokenService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.SecurePinProcessor
import pos.ambrosia.utils.grantPermission
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

private const val TEST_SECRET = "authorize-test-secret"
private const val TEST_ISSUER = "authorize-test-issuer"
private const val TEST_AUDIENCE = "authorize-test-audience"

class AuthorizeRouteTest {
    private lateinit var databaseFile: File

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    @Test
    fun `login sets accessToken and refreshToken cookies with SameSite Strict`() =
        testApplication {
            val testApplicationConfig =
                MapApplicationConfig(
                    "secret" to TEST_SECRET,
                    "jwt.issuer" to TEST_ISSUER,
                    "jwt.audience" to TEST_AUDIENCE,
                )
            environment { config = testApplicationConfig }

            val roleId = ExposedTestDb.seedRole("login-samesite-test-role")
            grantPermission("login-samesite-test-role", "users_read")
            val userId = ExposedTestDb.seedUser("login-samesite-test-user", roleId)
            seedRealPin(userId, "1234", applicationEnvironment { config = testApplicationConfig })

            application {
                install(ContentNegotiation) { json() }
                configureAuthentication()
                configureAuth()
            }

            val loginResponse =
                client.post("/auth/login") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"name":"login-samesite-test-user","pin":"1234"}""")
                }

            assertEquals(HttpStatusCode.OK, loginResponse.status)
            val setCookieHeaders = loginResponse.headers.getAll(HttpHeaders.SetCookie).orEmpty()
            val accessTokenCookie = setCookieHeaders.first { it.startsWith("accessToken=") }
            val refreshTokenCookie = setCookieHeaders.first { it.startsWith("refreshToken=") }
            assertTrue(accessTokenCookie.contains("SameSite=Strict"))
            assertTrue(refreshTokenCookie.contains("SameSite=Strict"))
        }

    @Test
    fun `refresh sets accessToken cookie with SameSite Strict`() =
        testApplication {
            val testApplicationConfig =
                MapApplicationConfig(
                    "secret" to TEST_SECRET,
                    "jwt.issuer" to TEST_ISSUER,
                    "jwt.audience" to TEST_AUDIENCE,
                )
            environment { config = testApplicationConfig }

            val roleId = ExposedTestDb.seedRole("refresh-samesite-test-role")
            val userId = ExposedTestDb.seedUser("refresh-samesite-test-user", roleId)

            application {
                install(ContentNegotiation) { json() }
                configureAuthentication()
                configureAuth()
            }

            val tokenService = TokenService(applicationEnvironment { config = testApplicationConfig })
            val refreshToken =
                tokenService.generateRefreshToken(
                    AuthResponse(
                        id = userId,
                        name = "refresh-samesite-test-user",
                        roleId = roleId,
                        role = "refresh-samesite-test-role",
                        isAdmin = false,
                    ),
                )

            val refreshResponse =
                client.post("/auth/refresh") {
                    header(HttpHeaders.Cookie, "refreshToken=$refreshToken")
                }

            assertEquals(HttpStatusCode.OK, refreshResponse.status)
            val setCookieHeader = refreshResponse.headers[HttpHeaders.SetCookie].orEmpty()
            assertTrue(setCookieHeader.contains("SameSite=Strict"))
        }

    private fun seedRealPin(
        userId: String,
        pin: String,
        environment: ApplicationEnvironment,
    ) {
        val hashedPin = SecurePinProcessor.hashPinForStorage(pin.toCharArray(), userId, environment)
        transaction {
            UserEntity.findById(UUID.fromString(userId))?.pin = SecurePinProcessor.byteArrayToBase64(hashedPin)
        }
    }
}
