package pos.ambrosia.utest

import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import io.ktor.server.testing.ApplicationTestBuilder
import pos.ambrosia.utils.AuthCookies
import pos.ambrosia.utils.authenticateAdmin
import pos.ambrosia.utils.authorizeAdminPermission
import pos.ambrosia.utils.authorizePermission
import pos.ambrosia.utils.getCurrentUser
import pos.ambrosia.utils.grantPermissions
import pos.ambrosia.utils.installAdminAuth
import pos.ambrosia.utils.installNonAdminAuth
import pos.ambrosia.utils.installRoutes
import pos.ambrosia.utils.routeTest
import pos.ambrosia.utils.withAuthCookies
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class AuthUtilsTest {
    @Test
    fun `authorizePermission denies a role without the named permission`() =
        decoratorTest({ installNonAdminAuth() }) { auth ->
            val response = client.get("/guarded") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.Forbidden, response.status)
        }

    @Test
    fun `authorizePermission allows a role holding the named permission`() =
        decoratorTest({ installNonAdminAuth() }) { auth ->
            grantPermissions("non-admin-test-role", "things_read")

            val response = client.get("/guarded") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
        }

    @Test
    fun `authorizePermission denies a permission that is not the one required`() =
        decoratorTest({ installNonAdminAuth() }) { auth ->
            grantPermissions("non-admin-test-role", "things_write")

            val response = client.get("/guarded") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.Forbidden, response.status)
        }

    @Test
    fun `authorizePermission rejects a request with no access token`() =
        decoratorTest({ installNonAdminAuth() }) {
            val response = client.get("/guarded")

            assertEquals(HttpStatusCode.Unauthorized, response.status)
        }

    @Test
    fun `authenticateAdmin rejects a non-admin role`() =
        decoratorTest({ installNonAdminAuth() }) { auth ->
            val response = client.get("/admin-only") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.Forbidden, response.status)
        }

    @Test
    fun `authenticateAdmin allows an admin role`() =
        decoratorTest({ installAdminAuth() }) { auth ->
            val response = client.get("/admin-only") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
        }

    @Test
    fun `authenticateAdmin depends on the refreshToken cookie`() =
        decoratorTest({ installAdminAuth() }) { auth ->
            val response =
                client.get("/admin-only") {
                    headers.append(HttpHeaders.Cookie, "accessToken=${auth.accessToken}")
                }

            assertEquals(HttpStatusCode.Forbidden, response.status)
        }

    @Test
    fun `authorizeAdminPermission requires both the permission and the admin flag`() =
        decoratorTest({ installNonAdminAuth() }) { auth ->
            grantPermissions("non-admin-test-role", "things_read")

            val response = client.get("/admin-guarded") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.Forbidden, response.status)
        }

    @Test
    fun `authorizeAdminPermission allows an admin holding the permission`() =
        decoratorTest({ installAdminAuth() }) { auth ->
            grantPermissions("admin-test-role", "things_read")

            val response = client.get("/admin-guarded") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
        }

    @Test
    fun `getCurrentUser reads the identity claims off the token`() =
        decoratorTest({ installAdminAuth() }) { auth ->
            val response = client.get("/whoami") { withAuthCookies(auth) }

            assertEquals(HttpStatusCode.OK, response.status)
            val body = response.bodyAsText()
            assertTrue(body.contains(auth.userId), "expected the userId claim")
            assertTrue(body.contains("admin-test-role"), "expected the role claim")
            assertTrue(body.contains("isAdmin=true"), "expected the isAdmin claim")
        }

    private fun decoratorTest(
        installAuth: ApplicationTestBuilder.() -> AuthCookies,
        block: suspend ApplicationTestBuilder.(AuthCookies) -> Unit,
    ) = routeTest {
        val auth = installAuth()
        installRoutes {
            routing {
                authorizePermission("things_read") {
                    get("/guarded") { call.respond(HttpStatusCode.OK, "ok") }
                }
                authenticateAdmin {
                    get("/admin-only") { call.respond(HttpStatusCode.OK, "ok") }
                    get("/whoami") { call.respond(HttpStatusCode.OK, call.getCurrentUser().toString()) }
                }
                authorizeAdminPermission("things_read") {
                    get("/admin-guarded") { call.respond(HttpStatusCode.OK, "ok") }
                }
            }
        }
        block(auth)
    }
}
