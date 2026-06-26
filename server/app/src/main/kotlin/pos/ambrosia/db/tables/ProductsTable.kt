package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object ProductsTable : SQLiteUUIDTable("products") {
    val sku = varchar("SKU", 255).nullable().uniqueIndex()
    val name = varchar("name", 255)
    val description = text("description").nullable()
    val imageUrl = text("image_url").nullable()
    val costCents = integer("cost_cents")
    val quantity = integer("quantity")
    val minStockThreshold = integer("min_stock_threshold").default(0)
    val maxStockThreshold = integer("max_stock_threshold").default(0)
    val priceCents = integer("price_cents")
    val isDeleted = bool("is_deleted").default(false)
}

class ProductEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<ProductEntity>(ProductsTable)

    var sku by ProductsTable.sku
    var name by ProductsTable.name
    var description by ProductsTable.description
    var imageUrl by ProductsTable.imageUrl
    var costCents by ProductsTable.costCents
    var quantity by ProductsTable.quantity
    var minStockThreshold by ProductsTable.minStockThreshold
    var maxStockThreshold by ProductsTable.maxStockThreshold
    var priceCents by ProductsTable.priceCents
    var isDeleted by ProductsTable.isDeleted
}

object ProductCategoriesTable : Table("product_categories") {
    val productId = reference("product_id", ProductsTable)
    val categoryId = reference("category_id", CategoriesTable)
    override val primaryKey = PrimaryKey(productId, categoryId)
}
