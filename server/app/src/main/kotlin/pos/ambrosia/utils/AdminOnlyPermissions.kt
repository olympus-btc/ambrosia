package pos.ambrosia.utils

object AdminOnlyPermissions {
    private val keys = setOf("roles_create", "roles_update", "roles_delete", "permissions_read")

    fun contains(permissionKey: String): Boolean = permissionKey in keys
}
