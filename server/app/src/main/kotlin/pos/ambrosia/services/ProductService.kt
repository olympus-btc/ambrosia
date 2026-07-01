package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.insertIgnore
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.CategoriesTable
import pos.ambrosia.db.tables.ProductBundleComponentsTable
import pos.ambrosia.db.tables.ProductCategoriesTable
import pos.ambrosia.db.tables.ProductEntity
import pos.ambrosia.db.tables.ProductsTable
import pos.ambrosia.logger
import pos.ambrosia.models.BundleComponent
import pos.ambrosia.models.Product
import pos.ambrosia.models.ProductStockAdjustment
import pos.ambrosia.utils.ProductIsBundleComponentException
import java.util.UUID

class ProductService {
    private fun toModel(entity: ProductEntity): Product {
        val components = getBundleComponents(entity.id.value)
        val quantity = if (entity.isBundle) computeBundleQuantity(components) else entity.quantity
        val bundleCostCents = if (entity.isBundle) computeBundleCostCents(components) else 0
        return Product(
            id = entity.id.value.toString(),
            SKU = entity.sku,
            name = entity.name,
            description = entity.description,
            imageUrl = entity.imageUrl,
            costCents = entity.costCents,
            categoryIds = getCategoryIds(entity.id.value),
            quantity = quantity,
            minStockThreshold = entity.minStockThreshold,
            maxStockThreshold = entity.maxStockThreshold,
            priceCents = entity.priceCents,
            isBundle = entity.isBundle,
            bundleComponents = components,
            bundleCostCents = bundleCostCents,
        )
    }

    private fun getCategoryIds(productId: UUID): List<String> =
        ProductCategoriesTable
            .selectAll()
            .where { ProductCategoriesTable.productId eq EntityID(productId, ProductsTable) }
            .map { it[ProductCategoriesTable.categoryId].value.toString() }

    private fun getBundleComponents(bundleId: UUID): List<BundleComponent> =
        ProductBundleComponentsTable
            .selectAll()
            .where { ProductBundleComponentsTable.bundleId eq EntityID(bundleId, ProductsTable) }
            .map {
                BundleComponent(
                    componentId = it[ProductBundleComponentsTable.componentId].value.toString(),
                    quantity = it[ProductBundleComponentsTable.quantity],
                )
            }

    private fun computeBundleQuantity(components: List<BundleComponent>): Int {
        if (components.isEmpty()) return 0
        return components.minOf { component ->
            val entity = ProductEntity.findById(UUID.fromString(component.componentId))
            val stock = entity?.quantity ?: 0
            stock / component.quantity
        }
    }

    private fun computeBundleCostCents(components: List<BundleComponent>): Int =
        components.sumOf { component ->
            val entity = ProductEntity.findById(UUID.fromString(component.componentId))
            (entity?.costCents ?: 0) * component.quantity
        }

    private fun replaceBundleComponents(
        bundleId: UUID,
        components: List<BundleComponent>,
    ) {
        ProductBundleComponentsTable.deleteWhere {
            ProductBundleComponentsTable.bundleId eq EntityID(bundleId, ProductsTable)
        }
        for (component in components) {
            ProductBundleComponentsTable.insert {
                it[ProductBundleComponentsTable.bundleId] = EntityID(bundleId, ProductsTable)
                it[ProductBundleComponentsTable.componentId] = EntityID(UUID.fromString(component.componentId), ProductsTable)
                it[ProductBundleComponentsTable.quantity] = component.quantity
            }
        }
    }

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

    private fun valid(product: Product): Boolean {
        if (product.name.isBlank()) return false
        if (product.costCents < 0) return false
        if (product.priceCents < 0) return false
        if (product.isBundle) return product.bundleComponents.isNotEmpty()
        if (product.quantity < 0) return false
        if (product.minStockThreshold < 0) return false
        if (product.maxStockThreshold < 0) return false
        if (product.maxStockThreshold > 0 && product.minStockThreshold > product.maxStockThreshold) return false
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
                        this.quantity = if (product.isBundle) 0 else product.quantity
                        this.minStockThreshold = product.minStockThreshold
                        this.maxStockThreshold = product.maxStockThreshold
                        this.priceCents = product.priceCents
                        this.isBundle = product.isBundle
                    }.id.value

            replaceCategories(id, product.categoryIds)
            if (product.isBundle) replaceBundleComponents(id, product.bundleComponents)
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
            val productId = UUID.fromString(product.id)

            val entity = ProductEntity.findById(productId) ?: return@transaction false

            entity.sku = normalizedSku
            entity.name = product.name
            entity.description = product.description
            entity.imageUrl = product.imageUrl
            entity.costCents = product.costCents
            entity.quantity = if (product.isBundle) 0 else product.quantity
            entity.minStockThreshold = product.minStockThreshold
            entity.maxStockThreshold = product.maxStockThreshold
            entity.priceCents = product.priceCents
            entity.isBundle = product.isBundle
            entity.flush()

            replaceCategories(productId, product.categoryIds)
            replaceBundleComponents(productId, if (product.isBundle) product.bundleComponents else emptyList())
            logger.info("Product updated: ${product.id}")
            true
        }

    fun deleteProduct(id: String): Boolean =
        transaction {
            val productId = UUID.fromString(id)
            val bundleNames =
                ProductBundleComponentsTable
                    .selectAll()
                    .where { ProductBundleComponentsTable.componentId eq EntityID(productId, ProductsTable) }
                    .mapNotNull { row ->
                        ProductEntity
                            .findById(row[ProductBundleComponentsTable.bundleId])
                            ?.takeIf { !it.isDeleted }
                            ?.name
                    }
            if (bundleNames.isNotEmpty()) throw ProductIsBundleComponentException(bundleNames)

            val entity = ProductEntity.findById(productId) ?: return@transaction false
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
