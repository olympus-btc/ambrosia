package pos.ambrosia.utest

import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.applicationEnvironment
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import pos.ambrosia.models.UpdateUserRequest
import pos.ambrosia.models.User
import pos.ambrosia.services.UsersService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.LastAdminRemovalException
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class UsersServiceTest {
    // A real environment is required because addUser hashes the pin through SecurePinProcessor,
    // which reads the "secret" config property.
    private val testEnv =
        applicationEnvironment {
            config = MapApplicationConfig("secret" to "users-service-test-secret")
        }
    private val service = UsersService(testEnv)
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
    fun `updateUser blocks reassigning last admin user to non admin role`() {
        runBlocking {
            val adminRoleId = ExposedTestDb.seedRole("Admin", isAdmin = true)
            val cashierRoleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            val userId = ExposedTestDb.seedUser("admin-user", roleId = adminRoleId)

            assertFailsWith<LastAdminRemovalException> {
                service.updateUser(userId, UpdateUserRequest(roleId = cashierRoleId))
            }
        }
    }

    @Test
    fun `deleteUser blocks deleting last admin user`() {
        runBlocking {
            val adminRoleId = ExposedTestDb.seedRole("Admin", isAdmin = true)
            val cashierRoleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            val userId = ExposedTestDb.seedUser("admin-user", roleId = adminRoleId)
            ExposedTestDb.seedUser("cashier-user", roleId = cashierRoleId)

            assertFailsWith<LastAdminRemovalException> {
                service.deleteUser(userId)
            }
        }
    }

    @Test
    fun `deleteUser allows deleting non admin user when another admin remains`() {
        runBlocking {
            val adminRoleId = ExposedTestDb.seedRole("Admin", isAdmin = true)
            val cashierRoleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            ExposedTestDb.seedUser("admin-user", roleId = adminRoleId)
            val userId = ExposedTestDb.seedUser("cashier-user", roleId = cashierRoleId)

            assertTrue(service.deleteUser(userId))
        }
    }

    @Test
    fun `getUserById masks refresh token`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            val userId = ExposedTestDb.seedUser("cashier-user", roleId = roleId)

            val user = service.getUserById(userId)

            assertNotNull(user)
            assertEquals("****", user.pin)
            assertEquals("****", user.refreshToken)
        }
    }

    @Test
    fun `addUser rejects a pin shorter than six digits`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)

            assertNull(service.addUser(User(name = "short-pin-user", pin = "12345", role = roleId)))
        }
    }

    @Test
    fun `addUser rejects a pin longer than six digits`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)

            assertNull(service.addUser(User(name = "long-pin-user", pin = "1234567", role = roleId)))
        }
    }

    @Test
    fun `addUser rejects a legacy four digit pin`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)

            assertNull(service.addUser(User(name = "legacy-pin-user", pin = "1234", role = roleId)))
        }
    }

    @Test
    fun `addUser rejects a non numeric pin`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)

            assertNull(service.addUser(User(name = "non-numeric-pin-user", pin = "12ab56", role = roleId)))
        }
    }

    @Test
    fun `addUser accepts a six digit pin and stores it hashed`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)

            val userId = service.addUser(User(name = "valid-pin-user", pin = "123456", role = roleId))

            assertNotNull(userId)
            assertNotEquals("123456", ExposedTestDb.readStoredPin(userId))
        }
    }

    @Test
    fun `getUserIdentities returns id, name and role`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            val userId = ExposedTestDb.seedUser("cashier-user", roleId = roleId)

            val identity = service.getUserIdentities().single { it.id == userId }

            assertEquals("cashier-user", identity.name)
            assertEquals("Cashier", identity.role)
        }
    }
}
