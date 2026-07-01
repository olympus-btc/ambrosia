package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insertIgnore
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import pos.ambrosia.db.tables.CategoriesTable
import pos.ambrosia.db.tables.ProductCategoriesTable
import pos.ambrosia.db.tables.ProductEntity
import pos.ambrosia.db.tables.ProductOptionTypesTable
import pos.ambrosia.db.tables.ProductOptionValueEntity
import pos.ambrosia.db.tables.ProductOptionValuesTable
import pos.ambrosia.db.tables.ProductVariantEntity
import pos.ambrosia.db.tables.ProductVariantsTable
import pos.ambrosia.db.tables.ProductsTable
import pos.ambrosia.db.tables.VariantOptionValuesTable
import pos.ambrosia.logger
import pos.ambrosia.models.Product
import pos.ambrosia.models.ProductOptionType
import pos.ambrosia.models.ProductOptionValue
import pos.ambrosia.models.ProductVariant
import java.util.UUID

class ProductService {
    private fun getCategoryIds(productId: UUID): List<String> =
        ProductCategoriesTable
            .selectAll()
            .where { ProductCategoriesTable.productId eq EntityID(productId, ProductsTable) }
            .map { it[ProductCategoriesTable.categoryId].value.toString() }

    private fun replaceCategories(
        productId: UUID,
        categoryIds: List<String>,
    ) {
        ProductCategoriesTable.deleteWhere { ProductCategoriesTable.productId eq EntityID(productId, ProductsTable) }
        for (categoryId in categoryIds) {
            ProductCategoriesTable.insertIgnore {
                it[ProductCategoriesTable.productId] = EntityID(productId, ProductsTable)
                it[ProductCategoriesTable.categoryId] = EntityID(UUID.fromString(categoryId), CategoriesTable)
            }
        }
    }

    private data class VariantAggregate(
        val minPriceCents: Int,
        val maxPriceCents: Int,
        val quantity: Int,
    )

    private fun variantAggregate(productId: EntityID<UUID>): VariantAggregate {
        val active =
            ProductVariantsTable
                .selectAll()
                .where { (ProductVariantsTable.productId eq productId) and (ProductVariantsTable.isActive eq true) }
                .toList()
        val minPriceCents = active.minOfOrNull { it[ProductVariantsTable.priceCents] } ?: 0
        val maxPriceCents = active.maxOfOrNull { it[ProductVariantsTable.priceCents] } ?: 0
        val quantity = active.sumOf { it[ProductVariantsTable.quantity] }
        return VariantAggregate(minPriceCents, maxPriceCents, quantity)
    }

    private fun toModel(entity: ProductEntity): Product {
        val aggregate = variantAggregate(entity.id)
        return Product(
            id = entity.id.value.toString(),
            SKU = entity.sku,
            name = entity.name,
            description = entity.description,
            imageUrl = entity.imageUrl,
            priceCents = aggregate.minPriceCents,
            maxPriceCents = aggregate.maxPriceCents,
            quantity = aggregate.quantity,
            minStockThreshold = entity.minStockThreshold,
            maxStockThreshold = entity.maxStockThreshold,
            hasVariants = entity.hasVariants,
            categoryIds = getCategoryIds(entity.id.value),
        )
    }

    private fun fetchOptions(productId: UUID): List<ProductOptionType> {
        val productEntityId = EntityID(productId, ProductsTable)
        return ProductOptionTypesTable
            .selectAll()
            .where { ProductOptionTypesTable.productId eq productEntityId }
            .orderBy(ProductOptionTypesTable.displayOrder)
            .map { row ->
                val typeId = row[ProductOptionTypesTable.id].value
                val values =
                    ProductOptionValuesTable
                        .selectAll()
                        .where { ProductOptionValuesTable.optionTypeId eq EntityID(typeId, ProductOptionTypesTable) }
                        .orderBy(ProductOptionValuesTable.displayOrder)
                        .map { vRow ->
                            ProductOptionValue(
                                id = vRow[ProductOptionValuesTable.id].value.toString(),
                                optionTypeId = typeId.toString(),
                                value = vRow[ProductOptionValuesTable.value],
                                displayOrder = vRow[ProductOptionValuesTable.displayOrder],
                            )
                        }
                ProductOptionType(
                    id = typeId.toString(),
                    productId = productId.toString(),
                    name = row[ProductOptionTypesTable.name],
                    displayOrder = row[ProductOptionTypesTable.displayOrder],
                    values = values,
                )
            }
    }

    private fun fetchVariants(productId: UUID): List<ProductVariant> {
        val productEntityId = EntityID(productId, ProductsTable)
        return ProductVariantEntity
            .find { (ProductVariantsTable.productId eq productEntityId) and (ProductVariantsTable.isActive eq true) }
            .map { vEntity ->
                val optionValueIds =
                    VariantOptionValuesTable
                        .selectAll()
                        .where { VariantOptionValuesTable.variantId eq vEntity.id }
                        .map { it[VariantOptionValuesTable.optionValueId].value.toString() }
                ProductVariant(
                    id = vEntity.id.value.toString(),
                    productId = productId.toString(),
                    SKU = vEntity.sku,
                    priceCents = vEntity.priceCents,
                    costCents = vEntity.costCents,
                    quantity = vEntity.quantity,
                    isActive = vEntity.isActive,
                    imageUrl = vEntity.imageUrl,
                    optionValueIds = optionValueIds,
                )
            }
    }

    private fun normalizeSku(sku: String?): String? = sku?.takeIf { it.isNotBlank() }

    private fun valid(p: Product): Boolean {
        if (p.name.isBlank()) return false
        if (p.priceCents < 0) return false
        if (p.quantity < 0) return false
        if (p.minStockThreshold < 0) return false
        if (p.maxStockThreshold < 0) return false
        if (p.maxStockThreshold > 0 && p.minStockThreshold > p.maxStockThreshold) return false
        return true
    }

    fun addProduct(product: Product): String? =
        transaction {
            if (!valid(product)) return@transaction null
            val normalizedSku = normalizeSku(product.SKU)

            val id =
                ProductEntity
                    .new(UUID.randomUUID()) {
                        this.sku = normalizedSku
                        this.name = product.name
                        this.description = product.description
                        this.imageUrl = product.imageUrl
                        this.minStockThreshold = product.minStockThreshold
                        this.maxStockThreshold = product.maxStockThreshold
                        this.hasVariants = product.hasVariants
                    }.id.value

            ProductVariantEntity.new(UUID.randomUUID()) {
                this.productId = EntityID(id, ProductsTable)
                this.priceCents = product.priceCents
                this.quantity = product.quantity
                this.isActive = true
            }
            replaceCategories(id, product.categoryIds)
            logger.info("Product created: $id")
            id.toString()
        }

    fun getProducts(): List<Product> =
        transaction {
            ProductEntity.find { ProductsTable.isDeleted eq false }.map { toModel(it) }
        }

    fun getProductById(id: String): Product? =
        transaction {
            val uuid =
                try {
                    UUID.fromString(id)
                } catch (_: IllegalArgumentException) {
                    return@transaction null
                }
            val entity = ProductEntity.findById(uuid)
            if (entity == null || entity.isDeleted) {
                null
            } else {
                toModel(entity).copy(
                    options = fetchOptions(uuid),
                    variants = fetchVariants(uuid),
                )
            }
        }

    fun getProductBySKU(sku: String?): Product? =
        transaction {
            val normalizedSku = normalizeSku(sku) ?: return@transaction null
            ProductEntity
                .find { (ProductsTable.sku eq normalizedSku) and (ProductsTable.isDeleted eq false) }
                .firstOrNull()
                ?.let { toModel(it) }
        }

    fun getProductsByCategory(category: String): List<Product> =
        transaction {
            val productIds =
                ProductCategoriesTable
                    .selectAll()
                    .where { ProductCategoriesTable.categoryId eq EntityID(UUID.fromString(category), CategoriesTable) }
                    .map { it[ProductCategoriesTable.productId].value }
                    .toSet()

            val productEntityIds = productIds.map { EntityID(it, ProductsTable) }
            ProductEntity
                .find { (ProductsTable.id inList productEntityIds) and (ProductsTable.isDeleted eq false) }
                .map { toModel(it) }
        }

    fun updateProduct(product: Product): Boolean =
        transaction {
            if (product.id == null) return@transaction false
            if (!valid(product)) return@transaction false
            val normalizedSku = normalizeSku(product.SKU)

            val entity = ProductEntity.findById(UUID.fromString(product.id)) ?: return@transaction false

            entity.sku = normalizedSku
            entity.name = product.name
            entity.description = product.description
            entity.imageUrl = product.imageUrl
            entity.minStockThreshold = product.minStockThreshold
            entity.maxStockThreshold = product.maxStockThreshold
            entity.hasVariants = product.hasVariants
            entity.flush()

            replaceCategories(UUID.fromString(product.id), product.categoryIds)
            logger.info("Product updated: ${product.id}")
            true
        }

    fun deleteProduct(id: String): Boolean =
        transaction {
            val uuid =
                try {
                    UUID.fromString(id)
                } catch (_: IllegalArgumentException) {
                    return@transaction false
                }
            val entity = ProductEntity.findById(uuid) ?: return@transaction false
            ProductVariantsTable.update({ ProductVariantsTable.productId eq entity.id }) {
                it[ProductVariantsTable.isActive] = false
            }
            entity.isDeleted = true
            entity.sku = "DELETED-$id"
            logger.info("Product deleted: $id")
            true
        }
}
