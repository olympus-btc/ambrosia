package pos.ambrosia.utest

import io.ktor.server.engine.applicationEnvironment
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.User
import pos.ambrosia.services.AuthService
import pos.ambrosia.services.UsersService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.testJwtConfig
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class AuthServiceTest {
    private val environment = applicationEnvironment { config = testJwtConfig() }
    private val usersService = UsersService(environment)
    private val service = AuthService(environment)
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
    fun `authenticateUser accepts a legacy four digit pin`() {
        val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
        ExposedTestDb.seedUserWithPin("legacy-user", "1234", environment, roleId)

        val authenticated = service.authenticateUser("legacy-user", "1234".toCharArray())

        assertNotNull(authenticated)
        assertEquals("legacy-user", authenticated.name)
        assertEquals("Cashier", authenticated.role)
    }

    @Test
    fun `authenticateUser accepts a six digit pin`() {
        val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
        ExposedTestDb.seedUserWithPin("current-user", "123456", environment, roleId)

        val authenticated = service.authenticateUser("current-user", "123456".toCharArray())

        assertNotNull(authenticated)
        assertEquals("current-user", authenticated.name)
    }

    @Test
    fun `authenticateUser rejects a wrong pin of the same length`() {
        val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
        ExposedTestDb.seedUserWithPin("legacy-user", "1234", environment, roleId)

        assertNull(service.authenticateUser("legacy-user", "4321".toCharArray()))
    }

    @Test
    fun `authenticateUser rejects a six digit pin for a legacy four digit user`() {
        val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
        ExposedTestDb.seedUserWithPin("legacy-user", "1234", environment, roleId)

        assertNull(service.authenticateUser("legacy-user", "123456".toCharArray()))
    }

    @Test
    fun `authenticateUser rejects an unknown user`() {
        ExposedTestDb.seedRole("Cashier", isAdmin = false)

        assertNull(service.authenticateUser("does-not-exist", "123456".toCharArray()))
    }

    @Test
    fun `authenticateUser returns the original email and phone, not the stored ciphertext`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            usersService.addUser(
                User(name = "cashier-user", pin = "123456", role = roleId, email = "cashier@example.com", phone = "+1-555-0100"),
            )

            val authenticatedUser = service.authenticateUser("cashier-user", "123456".toCharArray())

            assertNotNull(authenticatedUser)
            assertEquals("cashier@example.com", authenticatedUser.email)
            assertEquals("+1-555-0100", authenticatedUser.phone)
        }
    }

    @Test
    fun `authenticateUser returns null email and phone for a user that never set them`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            usersService.addUser(User(name = "cashier-user", pin = "123456", role = roleId))

            val authenticatedUser = service.authenticateUser("cashier-user", "123456".toCharArray())

            assertNotNull(authenticatedUser)
            assertNull(authenticatedUser.email)
            assertNull(authenticatedUser.phone)
        }
    }
}
