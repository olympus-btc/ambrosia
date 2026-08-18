package pos.ambrosia.utest

import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.applicationEnvironment
import org.junit.After
import org.junit.Before
import pos.ambrosia.services.AuthService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

/**
 * Login must stay length agnostic so users created before the six digit pin change can still
 * sign in and update their pin. The six digit rule is enforced only when creating or updating
 * a user, never when authenticating.
 */
class AuthServiceTest {
    private val testEnv =
        applicationEnvironment {
            config = MapApplicationConfig("secret" to "auth-service-test-secret")
        }
    private val service = AuthService(testEnv)
    private lateinit var dbFile: File

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `authenticateUser accepts a legacy four digit pin`() {
        val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
        ExposedTestDb.seedUserWithPin("legacy-user", "1234", testEnv, roleId)

        val authenticated = service.authenticateUser("legacy-user", "1234".toCharArray())

        assertNotNull(authenticated)
        assertEquals("legacy-user", authenticated.name)
        assertEquals("Cashier", authenticated.role)
    }

    @Test
    fun `authenticateUser accepts a six digit pin`() {
        val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
        ExposedTestDb.seedUserWithPin("current-user", "123456", testEnv, roleId)

        val authenticated = service.authenticateUser("current-user", "123456".toCharArray())

        assertNotNull(authenticated)
        assertEquals("current-user", authenticated.name)
    }

    @Test
    fun `authenticateUser rejects a wrong pin of the same length`() {
        val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
        ExposedTestDb.seedUserWithPin("legacy-user", "1234", testEnv, roleId)

        assertNull(service.authenticateUser("legacy-user", "4321".toCharArray()))
    }

    @Test
    fun `authenticateUser rejects a six digit pin for a legacy four digit user`() {
        val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
        ExposedTestDb.seedUserWithPin("legacy-user", "1234", testEnv, roleId)

        assertNull(service.authenticateUser("legacy-user", "123456".toCharArray()))
    }

    @Test
    fun `authenticateUser rejects an unknown user`() {
        ExposedTestDb.seedRole("Cashier", isAdmin = false)

        assertNull(service.authenticateUser("does-not-exist", "123456".toCharArray()))
    }
}
