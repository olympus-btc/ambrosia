package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insertIgnore
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.CategoriesTable
import pos.ambrosia.db.tables.ProductCategoriesTable
import pos.ambrosia.db.tables.ProductEntity
import pos.ambrosia.db.tables.ProductsTable
import pos.ambrosia.logger
import pos.ambrosia.models.Product
import pos.ambrosia.models.ProductStockAdjustment
import java.util.UUID

class ProductService {
    private fun toModel(entity: ProductEntity): Product =
        Product(
            id = entity.id.value.toString(),
            SKU = entity.sku,
            name = entity.name,
            description = entity.description,
            imageUrl = entity.imageUrl,
            costCents = entity.costCents,
            categoryIds = getCategoryIds(entity.id.value),
            quantity = entity.quantity,
            minStockThreshold = entity.minStockThreshold,
            maxStockThreshold = entity.maxStockThreshold,
            priceCents = entity.priceCents,
        )

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

    private fun normalizeSku(sku: String?): String? = sku?.takeIf { it.isNotBlank() }

    private fun valid(p: Product): Boolean {
        if (p.name.isBlank()) return false
        if (p.costCents < 0) return false
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
                        this.costCents = product.costCents
                        this.quantity = product.quantity
                        this.minStockThreshold = product.minStockThreshold
                        this.maxStockThreshold = product.maxStockThreshold
                        this.priceCents = product.priceCents
                    }.id.value

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
            val entity = ProductEntity.findById(UUID.fromString(id))
            if (entity == null || entity.isDeleted) null else toModel(entity)
        }

    private fun getProductBySKUInternal(sku: String): Product? =
        ProductEntity
            .find { (ProductsTable.sku eq sku) and (ProductsTable.isDeleted eq false) }
            .firstOrNull()
            ?.let { toModel(it) }

    fun getProductBySKU(sku: String?): Product? =
        transaction {
            val normalizedSku = normalizeSku(sku) ?: return@transaction null
            getProductBySKUInternal(normalizedSku)
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
            entity.costCents = product.costCents
            entity.quantity = product.quantity
            entity.minStockThreshold = product.minStockThreshold
            entity.maxStockThreshold = product.maxStockThreshold
            entity.priceCents = product.priceCents
            entity.flush()

            replaceCategories(UUID.fromString(product.id), product.categoryIds)
            logger.info("Product updated: ${product.id}")
            true
        }

    fun deleteProduct(id: String): Boolean =
        transaction {
            val entity = ProductEntity.findById(UUID.fromString(id)) ?: return@transaction false
            entity.isDeleted = true
            entity.sku = deletedSku(id)
            logger.info("Product deleted: $id")
            true
        }

    private fun deletedSku(id: String): String = "DELETED-$id"

    fun adjustStock(adjustments: List<ProductStockAdjustment>): Boolean =
        transaction {
            if (adjustments.isEmpty()) return@transaction true
            if (adjustments.any { it.productId.isBlank() || it.quantity < 0 }) return@transaction false

            val pendingQuantities = mutableMapOf<UUID, Int>()
            for (adjustment in adjustments) {
                if (adjustment.quantity == 0) continue
                val productId =
                    try {
                        UUID.fromString(adjustment.productId)
                    } catch (e: IllegalArgumentException) {
                        return@transaction false
                    }
                val entity = ProductEntity.findById(productId)
                if (entity == null || entity.isDeleted) return@transaction false

                val currentQuantity = pendingQuantities.getOrPut(productId) { entity.quantity }
                val newQuantity = currentQuantity - adjustment.quantity
                if (newQuantity < 0) return@transaction false
                pendingQuantities[productId] = newQuantity
            }

            pendingQuantities.forEach { (productId, newQuantity) ->
                ProductEntity.findById(productId)?.quantity = newQuantity
            }
            true
        }
}
