package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object ProductVariantsTable : SQLiteUUIDTable("product_variants") {
    val productId = reference("product_id", ProductsTable)
    val sku = varchar("sku", 255).nullable().uniqueIndex()
    val priceCents = integer("price_cents")
    val costCents = integer("cost_cents").nullable()
    val quantity = integer("quantity").default(0)
    val isActive = bool("is_active").default(true)
    val imageUrl = text("image_url").nullable()
}

class ProductVariantEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<ProductVariantEntity>(ProductVariantsTable)

    var productId by ProductVariantsTable.productId
    var sku by ProductVariantsTable.sku
    var priceCents by ProductVariantsTable.priceCents
    var costCents by ProductVariantsTable.costCents
    var quantity by ProductVariantsTable.quantity
    var isActive by ProductVariantsTable.isActive
    var imageUrl by ProductVariantsTable.imageUrl
}

object ProductOptionTypesTable : SQLiteUUIDTable("product_option_types") {
    val productId = reference("product_id", ProductsTable)
    val name = varchar("name", 255)
    val displayOrder = integer("display_order").default(0)
}

class ProductOptionTypeEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<ProductOptionTypeEntity>(ProductOptionTypesTable)

    var productId by ProductOptionTypesTable.productId
    var name by ProductOptionTypesTable.name
    var displayOrder by ProductOptionTypesTable.displayOrder
}

object ProductOptionValuesTable : SQLiteUUIDTable("product_option_values") {
    val optionTypeId = reference("option_type_id", ProductOptionTypesTable)
    val value = varchar("value", 255)
    val displayOrder = integer("display_order").default(0)
}

class ProductOptionValueEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<ProductOptionValueEntity>(ProductOptionValuesTable)

    var optionTypeId by ProductOptionValuesTable.optionTypeId
    var value by ProductOptionValuesTable.value
    var displayOrder by ProductOptionValuesTable.displayOrder
}

object VariantOptionValuesTable : Table("variant_option_values") {
    val variantId = reference("variant_id", ProductVariantsTable)
    val optionValueId = reference("option_value_id", ProductOptionValuesTable)
    override val primaryKey = PrimaryKey(variantId, optionValueId)
}
