package pos.ambrosia.utest

import io.ktor.server.application.ApplicationEnvironment
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.mockito.kotlin.mock
import pos.ambrosia.models.UpdateUserRequest
import pos.ambrosia.services.UsersService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.LastAdminRemovalException
import java.io.File
import kotlin.test.Test
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class UsersServiceTest {
    private val mockEnv: ApplicationEnvironment = mock()
    private val service = UsersService(mockEnv)
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
}
