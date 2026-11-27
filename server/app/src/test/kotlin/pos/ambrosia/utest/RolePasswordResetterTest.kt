package pos.ambrosia.utest

import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.db.tables.RoleEntity
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.RolePasswordResetter
import pos.ambrosia.utils.SecurePinProcessor
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class RolePasswordResetterTest {
    private lateinit var databaseFile: File
    private val secret = "test-master-secret"

    @Before
    fun setUp() {
        databaseFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(databaseFile)
    }

    private fun storedPassword(roleId: String): String? = transaction { RoleEntity.findById(UUID.fromString(roleId))?.password }

    private fun expectedHash(
        password: String,
        roleId: String,
    ): String =
        SecurePinProcessor.byteArrayToBase64(
            SecurePinProcessor.hashPin(password.toCharArray(), roleId, secret),
        )

    @Test
    fun `resetPassword by role name stores the hash the login verification expects`() {
        val roleId = ExposedTestDb.seedRole("Admin", isAdmin = true)

        val resetRoleName = RolePasswordResetter.resetPassword("Admin", "new-password", secret)

        assertEquals("Admin", resetRoleName)
        assertEquals(expectedHash("new-password", roleId), storedPassword(roleId))
    }

    @Test
    fun `resetPassword by role id resolves the role and returns its name`() {
        val roleId = ExposedTestDb.seedRole("Cashier")

        val resetRoleName = RolePasswordResetter.resetPassword(roleId, "another-password", secret)

        assertEquals("Cashier", resetRoleName)
        assertEquals(expectedHash("another-password", roleId), storedPassword(roleId))
    }

    @Test
    fun `resetPassword returns null and changes nothing when the role does not exist`() {
        val roleId = ExposedTestDb.seedRole("Admin")

        val resetRoleName = RolePasswordResetter.resetPassword("Ghost", "new-password", secret)

        assertNull(resetRoleName)
        assertNull(storedPassword(roleId))
    }

    @Test
    fun `resetPassword returns null for an unknown role id`() {
        ExposedTestDb.seedRole("Admin")

        val resetRoleName = RolePasswordResetter.resetPassword(UUID.randomUUID().toString(), "new-password", secret)

        assertNull(resetRoleName)
    }

    @Test
    fun `resetPassword ignores soft deleted roles`() {
        val roleId = ExposedTestDb.seedRole("Retired")
        transaction { RoleEntity.findById(UUID.fromString(roleId))!!.isDeleted = true }

        assertNull(RolePasswordResetter.resetPassword("Retired", "new-password", secret))
        assertNull(RolePasswordResetter.resetPassword(roleId, "new-password", secret))
        assertNull(storedPassword(roleId))
    }

    @Test
    fun `resetPassword only updates the targeted role`() {
        val adminId = ExposedTestDb.seedRole("Admin")
        val cashierId = ExposedTestDb.seedRole("Cashier")

        RolePasswordResetter.resetPassword("Admin", "new-password", secret)

        assertNotNull(storedPassword(adminId))
        assertNull(storedPassword(cashierId))
    }

    @Test
    fun `resetPassword salts with the role id so equal passwords produce different hashes`() {
        val adminId = ExposedTestDb.seedRole("Admin")
        val cashierId = ExposedTestDb.seedRole("Cashier")

        RolePasswordResetter.resetPassword("Admin", "same-password", secret)
        RolePasswordResetter.resetPassword("Cashier", "same-password", secret)

        assertNotEquals(storedPassword(adminId), storedPassword(cashierId))
    }

    @Test
    fun `resetPassword overwrites a previously stored password`() {
        val roleId = ExposedTestDb.seedRole("Admin")

        RolePasswordResetter.resetPassword("Admin", "first-password", secret)
        RolePasswordResetter.resetPassword("Admin", "second-password", secret)

        assertEquals(expectedHash("second-password", roleId), storedPassword(roleId))
    }
}
