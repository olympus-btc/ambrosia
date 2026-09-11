package pos.ambrosia.utest

import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import io.ktor.server.testing.ApplicationTestBuilder
import org.junit.Before
import pos.ambrosia.api.LoginRateLimiter
import pos.ambrosia.api.auth
import pos.ambrosia.services.AuthService
import pos.ambrosia.services.PermissionsService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.grantPermissions
import pos.ambrosia.utils.installAuthenticationWithoutUser
import pos.ambrosia.utils.installRoutes
import pos.ambrosia.utils.jsonBody
import pos.ambrosia.utils.routeTest
import pos.ambrosia.utils.setUserPin
import pos.ambrosia.utils.testEnvironment
import pos.ambrosia.utils.tokenService
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

private const val ROLE_NAME = "cashier"
private const val USER_NAME = "cooluser1"
private const val USER_PIN = "123456"

class AuthorizeRoutesTest {
    @Before
    fun resetRateLimiter() {
        LoginRateLimiter.resetAll()
    }

    @Test
    fun `login with valid credentials issues both httpOnly cookies`() =
        authTest {
            seedCredentials()

            val loginResponse =
                client.post("/auth/login") {
                    jsonBody("""{"name":"$USER_NAME","pin":"$USER_PIN"}""")
                }

            assertEquals(HttpStatusCode.OK, loginResponse.status)
            val setCookies =
                loginResponse.headers
                    .getAll(HttpHeaders.SetCookie)
                    .orEmpty()
                    .joinToString(" ")
            assertTrue(setCookies.contains("accessToken="), "expected an accessToken cookie")
            assertTrue(setCookies.contains("refreshToken="), "expected a refreshToken cookie")
            assertTrue(setCookies.contains("HttpOnly", ignoreCase = true), "login cookies must be HttpOnly")
        }

    @Test
    fun `login response carries the role permissions`() =
        authTest {
            seedCredentials()

            val loginResponse =
                client.post("/auth/login") {
                    jsonBody("""{"name":"$USER_NAME","pin":"$USER_PIN"}""")
                }

            assertTrue(loginResponse.bodyAsText().contains("orders_read"))
        }

    @Test
    fun `login accepts a legacy four digit pin`() =
        authTest {
            seedCredentials(pin = "0000")

            val loginResponse =
                client.post("/auth/login") {
                    jsonBody("""{"name":"$USER_NAME","pin":"0000"}""")
                }

            assertEquals(HttpStatusCode.OK, loginResponse.status)
        }

    @Test
    fun `login with a wrong pin is rejected without issuing cookies`() =
        authTest {
            seedCredentials()

            val loginResponse =
                client.post("/auth/login") {
                    jsonBody("""{"name":"$USER_NAME","pin":"999999"}""")
                }

            assertEquals(HttpStatusCode.Unauthorized, loginResponse.status)
            assertNull(loginResponse.headers[HttpHeaders.SetCookie])
        }

    @Test
    fun `login with an unknown user is rejected`() =
        authTest {
            seedCredentials()

            val loginResponse =
                client.post("/auth/login") {
                    jsonBody("""{"name":"nobody","pin":"$USER_PIN"}""")
                }

            assertEquals(HttpStatusCode.Unauthorized, loginResponse.status)
        }

    @Test
    fun `login is forbidden when the role has no permissions`() =
        authTest {
            val roleId = ExposedTestDb.seedRole(ROLE_NAME)
            val userId = ExposedTestDb.seedUser(USER_NAME, roleId)
            setUserPin(userId, USER_PIN)

            val loginResponse =
                client.post("/auth/login") {
                    jsonBody("""{"name":"$USER_NAME","pin":"$USER_PIN"}""")
                }

            assertEquals(HttpStatusCode.Forbidden, loginResponse.status)
        }

    @Test
    fun `the rate limiter blocks further attempts after five failures`() =
        authTest {
            seedCredentials()

            val responses =
                (1..6).map {
                    client.post("/auth/login") {
                        jsonBody("""{"name":"$USER_NAME","pin":"999999"}""")
                    }
                }

            responses.take(5).forEach { assertEquals(HttpStatusCode.Unauthorized, it.status) }
            val blocked = responses.last()
            assertEquals(HttpStatusCode.TooManyRequests, blocked.status)
            assertNotNull(blocked.headers["Retry-After"], "a blocked login must say when to retry")
        }

    @Test
    fun `a blocked ip cannot log in even with the correct pin`() =
        authTest {
            seedCredentials()
            repeat(6) {
                client.post("/auth/login") { jsonBody("""{"name":"$USER_NAME","pin":"999999"}""") }
            }

            val loginResponse =
                client.post("/auth/login") {
                    jsonBody("""{"name":"$USER_NAME","pin":"$USER_PIN"}""")
                }

            assertEquals(HttpStatusCode.TooManyRequests, loginResponse.status)
        }

    @Test
    fun `a successful login clears the failure count`() =
        authTest {
            seedCredentials()
            repeat(4) {
                client.post("/auth/login") { jsonBody("""{"name":"$USER_NAME","pin":"999999"}""") }
            }
            client.post("/auth/login") { jsonBody("""{"name":"$USER_NAME","pin":"$USER_PIN"}""") }

            val afterReset =
                (1..5).map {
                    client.post("/auth/login") { jsonBody("""{"name":"$USER_NAME","pin":"999999"}""") }
                }

            afterReset.forEach { assertEquals(HttpStatusCode.Unauthorized, it.status) }
        }

    @Test
    fun `refresh mints a new access token for a stored refresh token`() =
        authTest {
            val userId = seedCredentials()
            val refreshToken = tokenService().generateRefreshToken(authResponseFor(userId))

            val refreshResponse =
                client.post("/auth/refresh") {
                    header(HttpHeaders.Cookie, "refreshToken=$refreshToken")
                }

            assertEquals(HttpStatusCode.OK, refreshResponse.status)
            assertTrue(refreshResponse.bodyAsText().contains("accessToken"))
        }

    @Test
    fun `refresh without a cookie is rejected`() =
        authTest {
            seedCredentials()

            val refreshResponse = client.post("/auth/refresh")

            assertEquals(HttpStatusCode.Unauthorized, refreshResponse.status)
        }

    @Test
    fun `refresh with a garbage token is rejected`() =
        authTest {
            seedCredentials()

            val refreshResponse =
                client.post("/auth/refresh") {
                    header(HttpHeaders.Cookie, "refreshToken=not-a-jwt")
                }

            assertEquals(HttpStatusCode.Unauthorized, refreshResponse.status)
        }

    @Test
    fun `refresh with a revoked token is rejected despite a valid signature`() =
        authTest {
            val userId = seedCredentials()
            val refreshToken = tokenService().generateRefreshToken(authResponseFor(userId))
            tokenService().revokeRefreshToken(userId)

            val refreshResponse =
                client.post("/auth/refresh") {
                    header(HttpHeaders.Cookie, "refreshToken=$refreshToken")
                }

            assertEquals(HttpStatusCode.Unauthorized, refreshResponse.status)
        }

    @Test
    fun `logout requires an access token`() =
        authTest {
            seedCredentials()

            val logoutResponse = client.post("/auth/logout")

            assertEquals(HttpStatusCode.Unauthorized, logoutResponse.status)
        }

    private fun seedCredentials(pin: String = USER_PIN): String {
        val roleId = ExposedTestDb.seedRole(ROLE_NAME)
        val userId = ExposedTestDb.seedUser(USER_NAME, roleId)
        setUserPin(userId, pin)
        grantPermissions(ROLE_NAME, "orders_read", "orders_create")
        return userId
    }

    private fun authResponseFor(userId: String) =
        pos.ambrosia.models.AuthResponse(
            id = userId,
            name = USER_NAME,
            role = ROLE_NAME,
            roleId = ExposedTestDb.seedRole(ROLE_NAME),
            isAdmin = false,
        )

    private fun authTest(block: suspend ApplicationTestBuilder.() -> Unit) =
        routeTest {
            val environment = testEnvironment()
            installAuthenticationWithoutUser()
            installRoutes {
                routing {
                    route("/auth") {
                        auth(tokenService(), AuthService(environment), PermissionsService())
                    }
                }
            }
            block()
        }
}
