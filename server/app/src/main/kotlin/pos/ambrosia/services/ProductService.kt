package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.insertIgnore
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import pos.ambrosia.db.tables.CategoriesTable
import pos.ambrosia.db.tables.ProductBundleComponentsTable
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
import pos.ambrosia.models.BundleComponent
import pos.ambrosia.models.Product
import pos.ambrosia.models.ProductOptionType
import pos.ambrosia.models.ProductOptionValue
import pos.ambrosia.models.ProductStockAdjustment
import pos.ambrosia.models.ProductVariant
import pos.ambrosia.utils.ProductIsBundleComponentException
import java.util.UUID

class ProductService {
    private fun getCategoryIds(productId: UUID): List<String> =
        ProductCategoriesTable
            .selectAll()
            .where { ProductCategoriesTable.productId eq EntityID(productId, ProductsTable) }
            .map { it[ProductCategoriesTable.categoryId].value.toString() }

    private fun getBundleComponents(bundleId: UUID): List<BundleComponent> =
        ProductBundleComponentsTable
            .selectAll()
            .where { ProductBundleComponentsTable.bundleId eq EntityID(bundleId, ProductsTable) }
            .map { bundleComponentRow ->
                BundleComponent(
                    componentId = bundleComponentRow[ProductBundleComponentsTable.componentId].value.toString(),
                    variantId = bundleComponentRow[ProductBundleComponentsTable.componentVariantId]?.value?.toString(),
                    quantity = bundleComponentRow[ProductBundleComponentsTable.quantity],
                )
            }

    private data class VariantAggregate(
        val minPriceCents: Int,
        val maxPriceCents: Int,
        val quantity: Int,
        val minCostCents: Int,
    )

    private fun variantAggregate(productId: EntityID<UUID>): VariantAggregate {
        val activeVariantRows =
            ProductVariantsTable
                .selectAll()
                .where { (ProductVariantsTable.productId eq productId) and (ProductVariantsTable.isActive eq true) }
                .toList()
        val minPriceCents = activeVariantRows.minOfOrNull { it[ProductVariantsTable.priceCents] } ?: 0
        val maxPriceCents = activeVariantRows.maxOfOrNull { it[ProductVariantsTable.priceCents] } ?: 0
        val quantity = activeVariantRows.sumOf { it[ProductVariantsTable.quantity] }
        val minCostCents = activeVariantRows.mapNotNull { it[ProductVariantsTable.costCents] }.minOrNull() ?: 0
        return VariantAggregate(minPriceCents, maxPriceCents, quantity, minCostCents)
    }

    private fun componentTracksStock(component: BundleComponent): Boolean {
        val componentProductId = EntityID(UUID.fromString(component.componentId), ProductsTable)
        return ProductEntity.findById(componentProductId)?.trackStock ?: true
    }

    private fun computeBundleQuantity(components: List<BundleComponent>): Int {
        if (components.isEmpty()) return 0
        return components
            .filter { component -> componentTracksStock(component) }
            .minOfOrNull { component ->
                val componentProductId = EntityID(UUID.fromString(component.componentId), ProductsTable)
                val componentStock =
                    component.variantId
                        ?.let { componentVariantId -> variantQuantity(componentProductId, UUID.fromString(componentVariantId)) }
                        ?: variantAggregate(componentProductId).quantity
                componentStock / component.quantity
            } ?: 0
    }

    private fun computeBundleCostCents(components: List<BundleComponent>): Int =
        components.sumOf { component ->
            val componentProductId = EntityID(UUID.fromString(component.componentId), ProductsTable)
            val componentCostCents =
                component.variantId
                    ?.let { componentVariantId -> variantCostCents(componentProductId, UUID.fromString(componentVariantId)) }
                    ?: variantAggregate(componentProductId).minCostCents
            componentCostCents * component.quantity
        }

    private fun selectedVariantRow(
        productEntityId: EntityID<UUID>,
        variantId: UUID,
    ): ResultRow? =
        ProductVariantsTable
            .selectAll()
            .where {
                (ProductVariantsTable.productId eq productEntityId) and
                    (ProductVariantsTable.id eq EntityID(variantId, ProductVariantsTable)) and
                    (ProductVariantsTable.isActive eq true)
            }.firstOrNull()

    private fun variantQuantity(
        productEntityId: EntityID<UUID>,
        variantId: UUID,
    ): Int =
        selectedVariantRow(productEntityId, variantId)
            ?.get(ProductVariantsTable.quantity)
            ?: 0

    private fun variantCostCents(
        productEntityId: EntityID<UUID>,
        variantId: UUID,
    ): Int =
        selectedVariantRow(productEntityId, variantId)
            ?.get(ProductVariantsTable.costCents)
            ?: 0

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
                it[ProductBundleComponentsTable.componentVariantId] =
                    component.variantId?.let { componentVariantId ->
                        EntityID(UUID.fromString(componentVariantId), ProductVariantsTable)
                    }
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

    private fun replaceBundlePricingVariant(
        productId: UUID,
        product: Product,
    ) {
        val productEntityId = EntityID(productId, ProductsTable)
        val existingVariantEntities =
            ProductVariantEntity
                .find { ProductVariantsTable.productId eq productEntityId }
                .toList()
        val pricingVariantEntity =
            existingVariantEntities.firstOrNull()
                ?: ProductVariantEntity.new(UUID.randomUUID()) {
                    this.productId = productEntityId
                }

        pricingVariantEntity.priceCents = product.priceCents
        pricingVariantEntity.costCents = product.costCents.takeIf { it > 0 }
        pricingVariantEntity.quantity = 0
        pricingVariantEntity.isActive = true
        pricingVariantEntity.flush()

        val previousVariantIds =
            existingVariantEntities
                .filter { variantEntity -> variantEntity.id != pricingVariantEntity.id }
                .map { variantEntity -> variantEntity.id }
        if (previousVariantIds.isEmpty()) return

        ProductVariantsTable.update({ ProductVariantsTable.id inList previousVariantIds }) {
            it[ProductVariantsTable.isActive] = false
        }
    }

    private fun toModel(entity: ProductEntity): Product {
        val aggregate = variantAggregate(entity.id)
        val bundleComponents = getBundleComponents(entity.id.value)
        val bundleCostCents = if (entity.isBundle) computeBundleCostCents(bundleComponents) else 0
        val productQuantity = if (entity.isBundle) computeBundleQuantity(bundleComponents) else aggregate.quantity
        val productCostCents = if (entity.isBundle) bundleCostCents else aggregate.minCostCents
        val productTracksStock =
            entity.trackStock &&
                (
                    !entity.isBundle ||
                        bundleComponents.isEmpty() ||
                        bundleComponents.any { component -> componentTracksStock(component) }
                )
        return Product(
            id = entity.id.value.toString(),
            SKU = entity.sku,
            name = entity.name,
            description = entity.description,
            imageUrl = entity.imageUrl,
            priceCents = aggregate.minPriceCents,
            maxPriceCents = aggregate.maxPriceCents,
            quantity = productQuantity,
            minStockThreshold = entity.minStockThreshold,
            maxStockThreshold = entity.maxStockThreshold,
            hasVariants = entity.hasVariants,
            categoryIds = getCategoryIds(entity.id.value),
            costCents = productCostCents,
            isBundle = entity.isBundle,
            bundleComponents = bundleComponents,
            bundleCostCents = bundleCostCents,
            trackStock = productTracksStock,
        )
    }

    private fun fetchOptions(productId: UUID): List<ProductOptionType> {
        val productEntityId = EntityID(productId, ProductsTable)
        return ProductOptionTypesTable
            .selectAll()
            .where { ProductOptionTypesTable.productId eq productEntityId }
            .orderBy(ProductOptionTypesTable.displayOrder)
            .map { optionTypeRow ->
                val optionTypeId = optionTypeRow[ProductOptionTypesTable.id].value
                val optionValues =
                    ProductOptionValuesTable
                        .selectAll()
                        .where { ProductOptionValuesTable.optionTypeId eq EntityID(optionTypeId, ProductOptionTypesTable) }
                        .orderBy(ProductOptionValuesTable.displayOrder)
                        .map { optionValueRow ->
                            ProductOptionValue(
                                id = optionValueRow[ProductOptionValuesTable.id].value.toString(),
                                optionTypeId = optionTypeId.toString(),
                                value = optionValueRow[ProductOptionValuesTable.value],
                                displayOrder = optionValueRow[ProductOptionValuesTable.displayOrder],
                            )
                        }
                ProductOptionType(
                    id = optionTypeId.toString(),
                    productId = productId.toString(),
                    name = optionTypeRow[ProductOptionTypesTable.name],
                    displayOrder = optionTypeRow[ProductOptionTypesTable.displayOrder],
                    values = optionValues,
                )
            }
    }

    private fun fetchVariants(productId: UUID): List<ProductVariant> {
        val productEntityId = EntityID(productId, ProductsTable)
        return ProductVariantEntity
            .find { (ProductVariantsTable.productId eq productEntityId) and (ProductVariantsTable.isActive eq true) }
            .map { variantEntity ->
                val optionValueIds =
                    VariantOptionValuesTable
                        .selectAll()
                        .where { VariantOptionValuesTable.variantId eq variantEntity.id }
                        .map { it[VariantOptionValuesTable.optionValueId].value.toString() }
                ProductVariant(
                    id = variantEntity.id.value.toString(),
                    productId = productId.toString(),
                    SKU = variantEntity.sku,
                    priceCents = variantEntity.priceCents,
                    costCents = variantEntity.costCents,
                    quantity = variantEntity.quantity,
                    isActive = variantEntity.isActive,
                    imageUrl = variantEntity.imageUrl,
                    optionValueIds = optionValueIds,
                )
            }
    }

    private fun normalizeSku(sku: String?): String? = sku?.takeIf { it.isNotBlank() }

    private fun bundleComponentVariantsAreValid(components: List<BundleComponent>): Boolean =
        components.all { component ->
            val componentVariantId = component.variantId ?: return@all true
            val componentProductId =
                try {
                    EntityID(UUID.fromString(component.componentId), ProductsTable)
                } catch (_: IllegalArgumentException) {
                    return@all false
                }
            val variantEntityId =
                try {
                    EntityID(UUID.fromString(componentVariantId), ProductVariantsTable)
                } catch (_: IllegalArgumentException) {
                    return@all false
                }

            ProductVariantsTable
                .selectAll()
                .where {
                    (ProductVariantsTable.id eq variantEntityId) and
                        (ProductVariantsTable.productId eq componentProductId) and
                        (ProductVariantsTable.isActive eq true)
                }.count() == 1L
        }

    private fun normalizeStockFields(product: Product): Product =
        if (product.trackStock) {
            product
        } else {
            product.copy(quantity = 0, minStockThreshold = 0, maxStockThreshold = 0)
        }

    private fun valid(product: Product): Boolean {
        if (product.name.isBlank()) return false
        if (product.priceCents < 0) return false
        if (product.costCents < 0) return false
        if (product.quantity < 0) return false
        if (product.minStockThreshold < 0) return false
        if (product.maxStockThreshold < 0) return false
        if (product.maxStockThreshold > 0 && product.minStockThreshold > product.maxStockThreshold) return false
        if (product.isBundle && product.bundleComponents.isEmpty()) return false
        if (product.isBundle && !bundleComponentVariantsAreValid(product.bundleComponents)) return false
        return true
    }

    fun addProduct(requested: Product): String? =
        transaction {
            if (!valid(requested)) return@transaction null
            val product = normalizeStockFields(requested)
            val normalizedSku = normalizeSku(product.SKU)

            val productId =
                ProductEntity
                    .new(UUID.randomUUID()) {
                        this.sku = normalizedSku
                        this.name = product.name
                        this.description = product.description
                        this.imageUrl = product.imageUrl
                        this.minStockThreshold = product.minStockThreshold
                        this.maxStockThreshold = product.maxStockThreshold
                        this.hasVariants = if (product.isBundle) false else product.hasVariants
                        this.isBundle = product.isBundle
                        this.trackStock = product.trackStock
                    }.id.value

            ProductVariantEntity.new(UUID.randomUUID()) {
                this.productId = EntityID(productId, ProductsTable)
                this.priceCents = product.priceCents
                this.costCents = product.costCents.takeIf { it > 0 }
                this.quantity = if (product.isBundle) 0 else product.quantity
                this.isActive = true
            }
            replaceCategories(productId, product.categoryIds)
            replaceBundleComponents(productId, if (product.isBundle) product.bundleComponents else emptyList())
            logger.info("Product created: $productId")
            productId.toString()
        }

    fun getProducts(): List<Product> =
        transaction {
            ProductEntity.find { ProductsTable.isDeleted eq false }.map { toModel(it) }
        }

    fun getProductById(id: String): Product? =
        transaction {
            val productUuid =
                try {
                    UUID.fromString(id)
                } catch (_: IllegalArgumentException) {
                    return@transaction null
                }
            val productEntity = ProductEntity.findById(productUuid)
            if (productEntity == null || productEntity.isDeleted) {
                null
            } else {
                toModel(productEntity).copy(
                    options = fetchOptions(productUuid),
                    variants = fetchVariants(productUuid),
                )
            }
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

    fun updateProduct(requested: Product): Boolean =
        transaction {
            val productId =
                try {
                    requested.id?.let { UUID.fromString(it) } ?: return@transaction false
                } catch (_: IllegalArgumentException) {
                    return@transaction false
                }
            if (!valid(requested)) return@transaction false
            val product = normalizeStockFields(requested)
            val productEntity = ProductEntity.findById(productId) ?: return@transaction false

            productEntity.sku = normalizeSku(product.SKU)
            productEntity.name = product.name
            productEntity.description = product.description
            productEntity.imageUrl = product.imageUrl
            productEntity.minStockThreshold = product.minStockThreshold
            productEntity.maxStockThreshold = product.maxStockThreshold
            productEntity.hasVariants = if (product.isBundle) false else product.hasVariants
            productEntity.isBundle = product.isBundle
            productEntity.trackStock = product.trackStock
            productEntity.flush()

            replaceCategories(productId, product.categoryIds)
            replaceBundleComponents(productId, if (product.isBundle) product.bundleComponents else emptyList())
            if (product.isBundle) replaceBundlePricingVariant(productId, product)
            logger.info("Product updated: ${product.id}")
            true
        }

    fun deleteProduct(id: String): Boolean =
        transaction {
            val productId =
                try {
                    UUID.fromString(id)
                } catch (_: IllegalArgumentException) {
                    return@transaction false
                }
            val bundleNames =
                ProductBundleComponentsTable
                    .selectAll()
                    .where { ProductBundleComponentsTable.componentId eq EntityID(productId, ProductsTable) }
                    .mapNotNull { bundleComponentRow ->
                        ProductEntity
                            .findById(bundleComponentRow[ProductBundleComponentsTable.bundleId])
                            ?.takeIf { !it.isDeleted }
                            ?.name
                    }
            if (bundleNames.isNotEmpty()) throw ProductIsBundleComponentException(bundleNames)

            val productEntity = ProductEntity.findById(productId) ?: return@transaction false
            ProductVariantsTable.update({ ProductVariantsTable.productId eq productEntity.id }) {
                it[ProductVariantsTable.isActive] = false
            }
            productEntity.isDeleted = true
            productEntity.sku = deletedSku(id)
            logger.info("Product deleted: $id")
            true
        }

    private fun deletedSku(id: String): String = "DELETED-$id"

    fun adjustStock(adjustments: List<ProductStockAdjustment>): Boolean = ProductVariantService().adjustStock(adjustments)
}
