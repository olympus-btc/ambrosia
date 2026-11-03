package pos.ambrosia.utest

import io.ktor.server.engine.applicationEnvironment
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.models.UpdateUserRequest
import pos.ambrosia.models.User
import pos.ambrosia.services.UsersService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.LastAdminRemovalException
import pos.ambrosia.utils.SecretsCipher
import pos.ambrosia.utils.testJwtConfig
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class UsersServiceTest {
    private val environment = applicationEnvironment { config = testJwtConfig() }
    private val service = UsersService(environment)
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

    @Test
    fun `addUser stores email and phone encrypted, not as plaintext`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)

            val userId =
                service.addUser(
                    User(name = "cashier-user", pin = "123456", role = roleId, email = "cashier@example.com", phone = "+1-555-0100"),
                )

            assertNotNull(userId)
            val storedUser = transaction { UserEntity.findById(UUID.fromString(userId)) }
            assertNotEquals("cashier@example.com", storedUser?.email)
            assertNotEquals("+1-555-0100", storedUser?.phone)
        }
    }

    @Test
    fun `getUserById returns the original email and phone after addUser encrypted them`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            val userId =
                service.addUser(
                    User(name = "cashier-user", pin = "123456", role = roleId, email = "cashier@example.com", phone = "+1-555-0100"),
                )
            assertNotNull(userId)

            val user = service.getUserById(userId)

            assertNotNull(user)
            assertEquals("cashier@example.com", user.email)
            assertEquals("+1-555-0100", user.phone)
        }
    }

    @Test
    fun `getUsers returns the original email and phone after addUser encrypted them`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            val userId =
                service.addUser(
                    User(name = "cashier-user", pin = "123456", role = roleId, email = "cashier@example.com", phone = "+1-555-0100"),
                )
            assertNotNull(userId)

            val user = service.getUsers().single { it.id == userId }

            assertEquals("cashier@example.com", user.email)
            assertEquals("+1-555-0100", user.phone)
        }
    }

    @Test
    fun `updateUser re-encrypts a changed email and phone`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            val userId =
                service.addUser(
                    User(name = "cashier-user", pin = "123456", role = roleId, email = "old@example.com", phone = "+1-555-0100"),
                )
            assertNotNull(userId)

            service.updateUser(userId, UpdateUserRequest(email = "new@example.com", phone = "+1-555-0199"))

            val storedUser = transaction { UserEntity.findById(UUID.fromString(userId)) }
            val fieldEncryptionKey = SecretsCipher.deriveFieldEncryptionKey(testJwtConfig().property("secret").getString())
            assertNotEquals("new@example.com", storedUser?.email)
            assertEquals("new@example.com", SecretsCipher.decryptOrNull(storedUser?.email, fieldEncryptionKey))
            assertEquals("+1-555-0199", SecretsCipher.decryptOrNull(storedUser?.phone, fieldEncryptionKey))
        }
    }

    @Test
    fun `addUser round-trips a 254 character email without truncation`() {
        runBlocking {
            val roleId = ExposedTestDb.seedRole("Cashier", isAdmin = false)
            val maximumLengthEmail = "${"a".repeat(242)}@example.com"
            assertEquals(254, maximumLengthEmail.length)

            val userId = service.addUser(User(name = "cashier-user", pin = "123456", role = roleId, email = maximumLengthEmail))
            assertNotNull(userId)

            val user = service.getUserById(userId)

            assertEquals(maximumLengthEmail, user?.email)
        }
    }
}
