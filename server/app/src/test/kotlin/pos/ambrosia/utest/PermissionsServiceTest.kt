package pos.ambrosia.utest

import org.junit.After
import org.junit.Before
import pos.ambrosia.services.PermissionsService
import pos.ambrosia.utils.ExposedTestDb
import java.io.File
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PermissionsServiceTest {
    private lateinit var dbFile: File
    private val service = PermissionsService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    @Test
    fun `getAll returns list ordered by name when found`() {
        ExposedTestDb.seedPermission("perm.write", "Write")
        ExposedTestDb.seedPermission("perm.read", "Read")

        val list = service.getAll()

        assertEquals(2, list.size)
        assertEquals("perm.read", list[0].name)
        assertEquals("perm.write", list[1].name)
        assertTrue(list.all { it.enabled })
    }

    @Test
    fun `getAll returns empty when none`() {
        val list = service.getAll()
        assertTrue(list.isEmpty())
    }

    @Test
    fun `getByRole returns list when found`() {
        val roleId = ExposedTestDb.seedRole("Waiter")
        val permissionId = ExposedTestDb.seedPermission("perm.read", "Read")
        service.replaceRolePermissions(roleId, listOf("perm.read"))

        val list = service.getByRole(roleId)

        assertEquals(1, list?.size)
        assertEquals("perm.read", list?.get(0)?.name)
        assertEquals(permissionId, list?.get(0)?.id)
    }

    @Test
    fun `getByRole returns null when role does not exist`() {
        val list = service.getByRole(UUID.randomUUID().toString())
        assertNull(list)
    }

    @Test
    fun `getByRole returns null when roleId is null`() {
        val list = service.getByRole(null)
        assertNull(list)
    }

    @Test
    fun `roleExists returns false for unknown role`() {
        assertTrue(!service.roleExists(UUID.randomUUID().toString()))
    }

    @Test
    fun `roleExists returns true for existing role`() {
        val roleId = ExposedTestDb.seedRole("Waiter")
        assertTrue(service.roleExists(roleId))
    }

    @Test
    fun `replaceRolePermissions returns 0 when role does not exist`() {
        val count = service.replaceRolePermissions(UUID.randomUUID().toString(), listOf("perm.read"))
        assertEquals(0, count)
    }

    @Test
    fun `replaceRolePermissions returns 0 when permission keys are empty`() {
        val roleId = ExposedTestDb.seedRole("Waiter")

        val count = service.replaceRolePermissions(roleId, emptyList())

        assertEquals(0, count)
        assertTrue(service.getByRole(roleId)!!.isEmpty())
    }

    @Test
    fun `replaceRolePermissions inserts resolved permission ids`() {
        val roleId = ExposedTestDb.seedRole("Waiter")
        ExposedTestDb.seedPermission("perm.read", "Read")
        ExposedTestDb.seedPermission("perm.write", "Write")
        ExposedTestDb.seedPermission("perm.disabled", "Disabled", enabled = false)

        val count = service.replaceRolePermissions(roleId, listOf("perm.read", "perm.write", "perm.disabled"))

        assertEquals(2, count)
        val names = service.getByRole(roleId)!!.map { it.name }
        assertEquals(listOf("perm.read", "perm.write"), names)
    }

    @Test
    fun `replaceRolePermissions replaces existing permissions`() {
        val roleId = ExposedTestDb.seedRole("Waiter")
        ExposedTestDb.seedPermission("perm.read", "Read")
        ExposedTestDb.seedPermission("perm.write", "Write")
        service.replaceRolePermissions(roleId, listOf("perm.read"))

        val count = service.replaceRolePermissions(roleId, listOf("perm.write"))

        assertEquals(1, count)
        val names = service.getByRole(roleId)!!.map { it.name }
        assertEquals(listOf("perm.write"), names)
    }

    @Test
    fun `assignAllEnabledToRole returns 0 when role does not exist`() {
        val count = service.assignAllEnabledToRole(UUID.randomUUID().toString())
        assertEquals(0, count)
    }

    @Test
    fun `assignAllEnabledToRole assigns only enabled permissions`() {
        val roleId = ExposedTestDb.seedRole("Waiter")
        ExposedTestDb.seedPermission("perm.read", "Read")
        ExposedTestDb.seedPermission("perm.write", "Write")
        ExposedTestDb.seedPermission("perm.disabled", "Disabled", enabled = false)

        val count = service.assignAllEnabledToRole(roleId)

        assertEquals(2, count)
        val names = service.getByRole(roleId)!!.map { it.name }
        assertEquals(listOf("perm.read", "perm.write"), names)
    }
}
