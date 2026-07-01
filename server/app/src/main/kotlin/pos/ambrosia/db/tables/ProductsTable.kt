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
    val isBundle = bool("is_bundle").default(false)
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
    var isBundle by ProductsTable.isBundle
}

object ProductBundleComponentsTable : Table("product_bundle_components") {
    val bundleId = reference("bundle_id", ProductsTable)
    val componentId = reference("component_id", ProductsTable)
    val quantity = integer("quantity").default(1)
    override val primaryKey = PrimaryKey(bundleId, componentId)
}

object ProductCategoriesTable : Table("product_categories") {
    val productId = reference("product_id", ProductsTable)
    val categoryId = reference("category_id", CategoriesTable)
    override val primaryKey = PrimaryKey(productId, categoryId)
}
