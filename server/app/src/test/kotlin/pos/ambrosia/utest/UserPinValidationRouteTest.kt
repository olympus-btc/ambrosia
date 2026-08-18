package pos.ambrosia.utest

import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.testApplication
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.configureUsers
import pos.ambrosia.api.handler
import pos.ambrosia.services.AuthService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.TEST_SECRET
import pos.ambrosia.utils.grantPermission
import pos.ambrosia.utils.installAdminAuth
import pos.ambrosia.utils.testEnvironmentWithSecret
import pos.ambrosia.utils.withAuthCookies
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class UserPinValidationRouteTest {
    private lateinit var databaseFile: File

    // Shares the secret the auth fixture configures on the test application, so pins seeded here
    // and pins rehashed by the routes verify against each other.
    private val testEnv = testEnvironmentWithSecret(TEST_SECRET)

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    @Test
    fun `create user rejects pins that are not exactly six digits`() =
        testApplication {
            val auth = installAdminAuth()
            grantPermission("admin-test-role", "users_create")
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureUsers()
            }

            val invalidPins = listOf("1234", "12345", "1234567", "12ab56", "")
            invalidPins.forEachIndexed { index, invalidPin ->
                val response =
                    client.post("/users") {
                        withAuthCookies(auth)
                        header(HttpHeaders.ContentType, "application/json")
                        setBody("""{"name":"invalid-$index","pin":"$invalidPin","role":"$roleId"}""")
                    }

                assertEquals(HttpStatusCode.BadRequest, response.status, "pin '$invalidPin' should be rejected")
            }
        }

    @Test
    fun `create user accepts a six digit pin`() =
        testApplication {
            val auth = installAdminAuth()
            grantPermission("admin-test-role", "users_create")
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureUsers()
            }

            val response =
                client.post("/users") {
                    withAuthCookies(auth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody("""{"name":"valid-user","pin":"123456","role":"$roleId"}""")
                }

            assertEquals(HttpStatusCode.Created, response.status)
        }

    @Test
    fun `update user rejects a legacy four digit pin`() =
        testApplication {
            val auth = installAdminAuth()
            grantPermission("admin-test-role", "users_update")
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            val targetUserId = ExposedTestDb.seedUser("target-user", roleId)
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureUsers()
            }

            val response =
                client.put("/users/$targetUserId") {
                    withAuthCookies(auth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody("""{"pin":"1234"}""")
                }

            assertEquals(HttpStatusCode.BadRequest, response.status)
        }

    /**
     * The migration path that makes login backwards compatibility matter: a user created before
     * the six digit change signs in with their old pin and replaces it with a six digit one.
     */
    @Test
    fun `legacy four digit user can sign in and change their pin to six digits`() =
        testApplication {
            val auth = installAdminAuth()
            grantPermission("admin-test-role", "users_update")
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            val legacyUserId = ExposedTestDb.seedUserWithPin("legacy-user", "1234", testEnv, roleId)
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureUsers()
            }

            val authService = AuthService(testEnv)
            assertNotNull(
                authService.authenticateUser("legacy-user", "1234".toCharArray()),
                "a legacy four digit pin must still authenticate",
            )

            val response =
                client.put("/users/$legacyUserId") {
                    withAuthCookies(auth)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody("""{"pin":"123456"}""")
                }

            assertEquals(HttpStatusCode.OK, response.status)
            assertNotNull(authService.authenticateUser("legacy-user", "123456".toCharArray()))
            assertNull(authService.authenticateUser("legacy-user", "1234".toCharArray()))
        }
}
