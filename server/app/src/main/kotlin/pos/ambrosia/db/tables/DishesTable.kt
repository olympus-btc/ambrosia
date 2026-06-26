package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object DishesTable : SQLiteUUIDTable("dishes") {
    val name = varchar("name", 255)
    val price = double("price")
    val categoryId = reference("category_id", CategoriesTable)
    val isDeleted = bool("is_deleted").default(false)
}

class DishEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<DishEntity>(DishesTable)

    var name by DishesTable.name
    var price by DishesTable.price
    var categoryId by DishesTable.categoryId
    var isDeleted by DishesTable.isDeleted
}

object DishesIngredientsTable : Table("dishes_ingredient") {
    val dishId = reference("id_dish", DishesTable)
    val ingredientId = reference("id_ingredient", IngredientsTable)
    val quantity = double("quantity").default(1.0)
    override val primaryKey = PrimaryKey(dishId, ingredientId)
}
