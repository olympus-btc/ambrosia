package pos.ambrosia.util

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.SchemaUtils
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.CategoriesTable
import pos.ambrosia.db.tables.CategoryEntity
import pos.ambrosia.db.tables.DishEntity
import pos.ambrosia.db.tables.DishesTable
import pos.ambrosia.db.tables.OrderEntity
import pos.ambrosia.db.tables.OrdersDishesTable
import pos.ambrosia.db.tables.OrdersTable
import pos.ambrosia.db.tables.RoleEntity
import pos.ambrosia.db.tables.RolesTable
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.db.tables.UsersTable
import java.io.File
import java.util.UUID

/** Helper for unit tests that exercise services backed by Exposed `transaction { }` blocks. */
object ExposedTestDb {
    fun connect(): File {
        val file = File.createTempFile("ambrosia-test", ".db")
        file.deleteOnExit()
        Database.connect("jdbc:sqlite:${file.absolutePath}", driver = "org.sqlite.JDBC")
        transaction {
            SchemaUtils.create(UsersTable, RolesTable, CategoriesTable, DishesTable, OrdersTable, OrdersDishesTable)
        }
        return file
    }

    fun cleanup(file: File) {
        transaction {
            SchemaUtils.drop(OrdersDishesTable, OrdersTable, DishesTable, CategoriesTable, UsersTable, RolesTable)
        }
        file.delete()
    }

    fun seedRole(
        role: String,
        isAdmin: Boolean = false,
    ): String =
        transaction {
            RoleEntity
                .new(UUID.randomUUID()) {
                    this.role = role
                    this.isAdmin = isAdmin
                }.id.value
                .toString()
        }

    fun seedUser(
        name: String,
        roleId: String? = null,
    ): String =
        transaction {
            UserEntity
                .new(UUID.randomUUID()) {
                    this.name = name
                    this.pin = "****"
                    this.roleId = roleId?.let { EntityID(UUID.fromString(it), RolesTable) }
                }.id.value
                .toString()
        }

    fun seedCategory(
        name: String = "Category",
        type: String = "dish",
    ): String =
        transaction {
            CategoryEntity
                .new(UUID.randomUUID()) {
                    this.name = name
                    this.type = type
                }.id.value
                .toString()
        }

    fun seedDish(
        name: String = "Dish",
        price: Double = 10.0,
        categoryId: String = seedCategory(),
    ): String =
        transaction {
            DishEntity
                .new(UUID.randomUUID()) {
                    this.name = name
                    this.price = price
                    this.categoryId = EntityID(UUID.fromString(categoryId), CategoriesTable)
                }.id.value
                .toString()
        }

    fun seedOrder(userId: String): String =
        transaction {
            OrderEntity
                .new(UUID.randomUUID()) {
                    this.userId = EntityID(UUID.fromString(userId), UsersTable)
                    this.createdAt = "2024-01-01T00:00:00"
                }.id.value
                .toString()
        }
}
