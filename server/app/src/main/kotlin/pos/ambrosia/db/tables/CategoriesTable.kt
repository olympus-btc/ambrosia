package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object CategoriesTable : SQLiteUUIDTable("categories") {
    val name = varchar("name", 255)
    val type = varchar("type", 20)
    val isDeleted = bool("is_deleted").default(false)

    init {
        uniqueIndex(type, name)
    }
}

class CategoryEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<CategoryEntity>(CategoriesTable)

    var name by CategoriesTable.name
    var type by CategoriesTable.type
    var isDeleted by CategoriesTable.isDeleted
}
