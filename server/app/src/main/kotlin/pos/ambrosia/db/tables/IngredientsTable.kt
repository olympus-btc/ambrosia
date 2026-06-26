package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object IngredientsTable : SQLiteUUIDTable("ingredients") {
    val name = varchar("name", 255)
    val categoryId = reference("category_id", CategoriesTable)
    val quantity = double("quantity").default(0.0)
    val unit = varchar("unit", 20).default("kg")
    val lowStockThreshold = double("low_stock_threshold").default(0.0)
    val costPerUnit = double("cost_per_unit").default(0.0)
    val isDeleted = bool("is_deleted").default(false)
}

class IngredientEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<IngredientEntity>(IngredientsTable)

    var name by IngredientsTable.name
    var categoryId by IngredientsTable.categoryId
    var quantity by IngredientsTable.quantity
    var unit by IngredientsTable.unit
    var lowStockThreshold by IngredientsTable.lowStockThreshold
    var costPerUnit by IngredientsTable.costPerUnit
    var isDeleted by IngredientsTable.isDeleted
}
