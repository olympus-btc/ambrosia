package pos.ambrosia.utest

import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.testApplication
import org.junit.After
import org.junit.Before
import pos.ambrosia.api.configureRoles
import pos.ambrosia.api.configureUsers
import pos.ambrosia.api.handler
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.grantPermission
import pos.ambrosia.utils.installAdminAuth
import pos.ambrosia.utils.withAuthCookies
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class CurrentUserPinStepUpRouteTest {
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
    fun `admin with users create permission is rejected with an incorrect current PIN`() =
        testApplication {
            val authCookies = installAdminAuth()
            grantPermission("admin-test-role", "users_create")
            val targetRoleId = ExposedTestDb.seedRole("target-role")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureUsers()
            }

            val createUserResponse =
                client.post("/users") {
                    withAuthCookies(authCookies)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{"user":{"name":"new-user","pin":"123456","role":"$targetRoleId"},"currentUserPin":"9999"}""",
                    )
                }

            assertEquals(HttpStatusCode.Forbidden, createUserResponse.status)
        }

    @Test
    fun `admin with users create permission is rejected with a blank current PIN`() =
        testApplication {
            val authCookies = installAdminAuth()
            grantPermission("admin-test-role", "users_create")
            val targetRoleId = ExposedTestDb.seedRole("target-role")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureUsers()
            }

            val createUserResponse =
                client.post("/users") {
                    withAuthCookies(authCookies)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody(
                        """{"user":{"name":"new-user","pin":"123456","role":"$targetRoleId"},"currentUserPin":""}""",
                    )
                }

            assertEquals(HttpStatusCode.Forbidden, createUserResponse.status)
        }

    @Test
    fun `admin with roles create permission is rejected with an incorrect current PIN`() =
        testApplication {
            val authCookies = installAdminAuth()
            grantPermission("admin-test-role", "roles_create")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureRoles()
            }

            val createRoleResponse =
                client.post("/roles") {
                    withAuthCookies(authCookies)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody("""{"role":"new-standard-role","isAdmin":false,"permissions":[],"currentUserPin":"9999"}""")
                }

            assertEquals(HttpStatusCode.Forbidden, createRoleResponse.status)
        }

    @Test
    fun `admin with roles create permission is rejected with a blank current PIN`() =
        testApplication {
            val authCookies = installAdminAuth()
            grantPermission("admin-test-role", "roles_create")
            application {
                install(ContentNegotiation) { json() }
                handler()
                configureRoles()
            }

            val createRoleResponse =
                client.post("/roles") {
                    withAuthCookies(authCookies)
                    header(HttpHeaders.ContentType, "application/json")
                    setBody("""{"role":"new-standard-role","isAdmin":false,"permissions":[],"currentUserPin":""}""")
                }

            assertEquals(HttpStatusCode.Forbidden, createRoleResponse.status)
        }
}
