package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.greaterEq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.core.minus
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import pos.ambrosia.db.tables.ProductOptionTypeEntity
import pos.ambrosia.db.tables.ProductOptionTypesTable
import pos.ambrosia.db.tables.ProductOptionValueEntity
import pos.ambrosia.db.tables.ProductOptionValuesTable
import pos.ambrosia.db.tables.ProductVariantEntity
import pos.ambrosia.db.tables.ProductVariantsTable
import pos.ambrosia.db.tables.ProductsTable
import pos.ambrosia.db.tables.VariantOptionValuesTable
import pos.ambrosia.logger
import pos.ambrosia.models.ProductOptionType
import pos.ambrosia.models.ProductOptionValue
import pos.ambrosia.models.ProductStockAdjustment
import pos.ambrosia.models.ProductVariant
import pos.ambrosia.models.UpsertOptionTypeRequest
import pos.ambrosia.models.UpsertVariantRequest
import java.util.UUID

open class ProductVariantService {
    private fun normalizeSku(sku: String?): String? = sku?.takeIf { it.isNotBlank() }

    private fun parseUuid(value: String): UUID? =
        try {
            UUID.fromString(value)
        } catch (_: IllegalArgumentException) {
            null
        }

    private fun productEntityId(productId: String): EntityID<UUID>? = parseUuid(productId)?.let { EntityID(it, ProductsTable) }

    private fun productExists(productEntityId: EntityID<UUID>): Boolean =
        !ProductsTable
            .selectAll()
            .where { ProductsTable.id eq productEntityId }
            .empty()

    private fun toVariantModel(entity: ProductVariantEntity): ProductVariant {
        val optionValueIds =
            VariantOptionValuesTable
                .selectAll()
                .where { VariantOptionValuesTable.variantId eq entity.id }
                .map { it[VariantOptionValuesTable.optionValueId].value.toString() }
        return ProductVariant(
            id = entity.id.value.toString(),
            productId = entity.productId.value.toString(),
            SKU = entity.sku,
            priceCents = entity.priceCents,
            costCents = entity.costCents,
            quantity = entity.quantity,
            isActive = entity.isActive,
            imageUrl = entity.imageUrl,
            optionValueIds = optionValueIds,
        )
    }

    private fun toOptionTypeModel(
        productId: String,
        optionTypeId: UUID,
        name: String,
        displayOrder: Int,
    ): ProductOptionType {
        val optionValues =
            ProductOptionValuesTable
                .selectAll()
                .where { ProductOptionValuesTable.optionTypeId eq EntityID(optionTypeId, ProductOptionTypesTable) }
                .orderBy(ProductOptionValuesTable.displayOrder)
                .map { valueRow ->
                    ProductOptionValue(
                        id = valueRow[ProductOptionValuesTable.id].value.toString(),
                        optionTypeId = optionTypeId.toString(),
                        value = valueRow[ProductOptionValuesTable.value],
                        displayOrder = valueRow[ProductOptionValuesTable.displayOrder],
                    )
                }
        return ProductOptionType(
            id = optionTypeId.toString(),
            productId = productId,
            name = name,
            displayOrder = displayOrder,
            values = optionValues,
        )
    }

    private fun insertOptionValues(
        optionTypeId: UUID,
        values: List<pos.ambrosia.models.UpsertOptionValueRequest>,
    ) {
        for ((valueIndex, optionValueRequest) in values.withIndex()) {
            ProductOptionValueEntity.new(UUID.randomUUID()) {
                this.optionTypeId = EntityID(optionTypeId, ProductOptionTypesTable)
                this.value = optionValueRequest.value
                this.displayOrder = if (optionValueRequest.displayOrder != 0) optionValueRequest.displayOrder else valueIndex
            }
        }
    }

    private fun requestedOptionValueEntityIds(optionValueIds: List<String>): List<EntityID<UUID>>? {
        val requestedOptionValueUuids =
            optionValueIds.map { optionValueId ->
                parseUuid(optionValueId) ?: return null
            }
        if (requestedOptionValueUuids.distinct().size != requestedOptionValueUuids.size) return null
        return requestedOptionValueUuids.map { EntityID(it, ProductOptionValuesTable) }
    }

    private fun optionValueIdsBelongToProduct(
        productEntityId: EntityID<UUID>,
        optionValueIds: List<String>,
    ): Boolean {
        val requestedOptionValueIds = requestedOptionValueEntityIds(optionValueIds) ?: return false
        if (requestedOptionValueIds.isEmpty()) return true

        val productOptionTypeIds =
            ProductOptionTypesTable
                .selectAll()
                .where { ProductOptionTypesTable.productId eq productEntityId }
                .map { it[ProductOptionTypesTable.id] }
        if (productOptionTypeIds.isEmpty()) return false

        val validProductOptionValueIds =
            ProductOptionValuesTable
                .selectAll()
                .where {
                    (ProductOptionValuesTable.optionTypeId inList productOptionTypeIds) and
                        (ProductOptionValuesTable.id inList requestedOptionValueIds)
                }.map { it[ProductOptionValuesTable.id] }
                .toSet()
        return requestedOptionValueIds.all { it in validProductOptionValueIds }
    }

    private fun replaceVariantOptionValues(
        variantEntity: ProductVariantEntity,
        optionValueIds: List<String>,
    ) {
        VariantOptionValuesTable.deleteWhere { VariantOptionValuesTable.variantId eq variantEntity.id }
        for (optionValueId in optionValueIds) {
            VariantOptionValuesTable.insert {
                it[VariantOptionValuesTable.variantId] = variantEntity.id
                it[VariantOptionValuesTable.optionValueId] =
                    EntityID(parseUuid(optionValueId)!!, ProductOptionValuesTable)
            }
        }
    }

    open fun getOptionTypes(productId: String): List<ProductOptionType> =
        transaction {
            val productEntityId = productEntityId(productId) ?: return@transaction emptyList()
            ProductOptionTypesTable
                .selectAll()
                .where { ProductOptionTypesTable.productId eq productEntityId }
                .orderBy(ProductOptionTypesTable.displayOrder)
                .map { optionTypeRow ->
                    val optionTypeId = optionTypeRow[ProductOptionTypesTable.id].value
                    toOptionTypeModel(
                        productId = productId,
                        optionTypeId = optionTypeId,
                        name = optionTypeRow[ProductOptionTypesTable.name],
                        displayOrder = optionTypeRow[ProductOptionTypesTable.displayOrder],
                    )
                }
        }

    fun addOptionType(
        productId: String,
        optionTypeRequest: UpsertOptionTypeRequest,
    ): String? =
        transaction {
            val productEntityId = productEntityId(productId) ?: return@transaction null
            if (!productExists(productEntityId)) return@transaction null
            val optionTypeId =
                ProductOptionTypeEntity
                    .new(UUID.randomUUID()) {
                        this.productId = productEntityId
                        this.name = optionTypeRequest.name
                        this.displayOrder = optionTypeRequest.displayOrder
                    }.id.value
            insertOptionValues(optionTypeId, optionTypeRequest.values)
            logger.info("Option type created: $optionTypeId for product $productId")
            optionTypeId.toString()
        }

    fun updateOptionType(
        productId: String,
        optionTypeId: String,
        optionTypeRequest: UpsertOptionTypeRequest,
    ): Boolean =
        transaction {
            val productEntityId = productEntityId(productId) ?: return@transaction false
            val optionTypeUuid = parseUuid(optionTypeId) ?: return@transaction false
            val optionTypeEntity = ProductOptionTypeEntity.findById(optionTypeUuid) ?: return@transaction false
            if (optionTypeEntity.productId != productEntityId) return@transaction false
            optionTypeEntity.name = optionTypeRequest.name
            optionTypeEntity.displayOrder = optionTypeRequest.displayOrder

            val existingRows =
                ProductOptionValuesTable
                    .selectAll()
                    .where { ProductOptionValuesTable.optionTypeId eq EntityID(optionTypeUuid, ProductOptionTypesTable) }
                    .map { it[ProductOptionValuesTable.id] to it[ProductOptionValuesTable.value] }

            val requestedOptionValueNames = optionTypeRequest.values.map { it.value }.toSet()
            val removedOptionValueIds =
                existingRows
                    .filter { (_, optionValueName) -> optionValueName !in requestedOptionValueNames }
                    .map { (optionValueId, _) -> optionValueId }

            if (removedOptionValueIds.isNotEmpty()) {
                VariantOptionValuesTable.deleteWhere { VariantOptionValuesTable.optionValueId inList removedOptionValueIds }
                ProductOptionValuesTable.deleteWhere { ProductOptionValuesTable.id inList removedOptionValueIds }
            }

            val existingOptionValueIdByName =
                existingRows.associate { (optionValueId, optionValueName) -> optionValueName to optionValueId }
            for ((valueIndex, optionValueRequest) in optionTypeRequest.values.withIndex()) {
                val existingOptionValueId = existingOptionValueIdByName[optionValueRequest.value]
                val optionValueDisplayOrder =
                    if (optionValueRequest.displayOrder != 0) optionValueRequest.displayOrder else valueIndex
                if (existingOptionValueId != null) {
                    ProductOptionValuesTable.update({ ProductOptionValuesTable.id eq existingOptionValueId }) {
                        it[displayOrder] = optionValueDisplayOrder
                    }
                } else {
                    ProductOptionValueEntity.new(UUID.randomUUID()) {
                        this.optionTypeId = EntityID(optionTypeUuid, ProductOptionTypesTable)
                        this.value = optionValueRequest.value
                        this.displayOrder = optionValueDisplayOrder
                    }
                }
            }

            logger.info("Option type updated: $optionTypeId")
            true
        }

    fun deleteOptionType(
        productId: String,
        optionTypeId: String,
    ): Boolean =
        transaction {
            val productEntityId = productEntityId(productId) ?: return@transaction false
            val optionTypeUuid = parseUuid(optionTypeId) ?: return@transaction false
            val optionTypeEntity = ProductOptionTypeEntity.findById(optionTypeUuid) ?: return@transaction false
            if (optionTypeEntity.productId != productEntityId) return@transaction false
            val optionValueIds =
                ProductOptionValuesTable
                    .selectAll()
                    .where { ProductOptionValuesTable.optionTypeId eq EntityID(optionTypeUuid, ProductOptionTypesTable) }
                    .map { it[ProductOptionValuesTable.id] }
            if (optionValueIds.isNotEmpty()) {
                VariantOptionValuesTable.deleteWhere {
                    VariantOptionValuesTable.optionValueId inList optionValueIds
                }
            }
            optionTypeEntity.delete()
            logger.info("Option type deleted: $optionTypeId")
            true
        }

    open fun getVariants(productId: String): List<ProductVariant> =
        transaction {
            val productEntityId = productEntityId(productId) ?: return@transaction emptyList()
            ProductVariantEntity
                .find { ProductVariantsTable.productId eq productEntityId }
                .map { toVariantModel(it) }
        }

    fun getVariantById(variantId: String): ProductVariant? =
        transaction {
            val variantUuid =
                try {
                    UUID.fromString(variantId)
                } catch (_: IllegalArgumentException) {
                    return@transaction null
                }
            ProductVariantEntity.findById(variantUuid)?.let { toVariantModel(it) }
        }

    fun getDefaultVariant(productId: String): ProductVariant? =
        transaction {
            val productEntityId = productEntityId(productId) ?: return@transaction null
            ProductVariantEntity
                .find { ProductVariantsTable.productId eq productEntityId }
                .firstOrNull()
                ?.let { toVariantModel(it) }
        }

    fun addVariant(
        productId: String,
        variantRequest: UpsertVariantRequest,
    ): String? =
        transaction {
            val productEntityId = productEntityId(productId) ?: return@transaction null
            if (!productExists(productEntityId)) return@transaction null
            if (variantRequest.priceCents < 0) return@transaction null
            if (variantRequest.quantity < 0) return@transaction null
            if (!optionValueIdsBelongToProduct(productEntityId, variantRequest.optionValueIds)) return@transaction null
            val variantEntity =
                ProductVariantEntity.new(UUID.randomUUID()) {
                    this.productId = productEntityId
                    this.sku = normalizeSku(variantRequest.SKU)
                    this.priceCents = variantRequest.priceCents
                    this.costCents = variantRequest.costCents
                    this.quantity = variantRequest.quantity
                    this.isActive = variantRequest.isActive
                    this.imageUrl = variantRequest.imageUrl
                }
            replaceVariantOptionValues(variantEntity, variantRequest.optionValueIds)
            logger.info("Variant created: ${variantEntity.id.value} for product $productId")
            variantEntity.id.value.toString()
        }

    fun updateVariant(
        productId: String,
        variantId: String,
        variantRequest: UpsertVariantRequest,
    ): Boolean =
        transaction {
            val productEntityId = productEntityId(productId) ?: return@transaction false
            if (variantRequest.priceCents < 0) return@transaction false
            if (variantRequest.quantity < 0) return@transaction false
            if (!optionValueIdsBelongToProduct(productEntityId, variantRequest.optionValueIds)) return@transaction false
            val variantUuid = parseUuid(variantId) ?: return@transaction false
            val variantEntity = ProductVariantEntity.findById(variantUuid) ?: return@transaction false
            if (variantEntity.productId != productEntityId) return@transaction false
            variantEntity.sku = normalizeSku(variantRequest.SKU)
            variantEntity.priceCents = variantRequest.priceCents
            variantEntity.costCents = variantRequest.costCents
            variantEntity.quantity = variantRequest.quantity
            variantEntity.isActive = variantRequest.isActive
            variantEntity.imageUrl = variantRequest.imageUrl
            replaceVariantOptionValues(variantEntity, variantRequest.optionValueIds)
            logger.info("Variant updated: $variantId")
            true
        }

    fun deleteVariant(
        productId: String,
        variantId: String,
    ): Boolean =
        transaction {
            val productEntityId = productEntityId(productId) ?: return@transaction false
            val variantUuid = parseUuid(variantId) ?: return@transaction false
            val variantEntity = ProductVariantEntity.findById(variantUuid) ?: return@transaction false
            if (variantEntity.productId != productEntityId) return@transaction false
            variantEntity.delete()
            logger.info("Variant deleted: $variantId")
            true
        }

    fun adjustStock(adjustments: List<ProductStockAdjustment>): Boolean {
        if (adjustments.isEmpty()) return true
        if (adjustments.any { it.quantity < 0 }) return false
        return try {
            transaction {
                for (adjustment in adjustments) {
                    if (adjustment.quantity == 0) continue

                    val stockRowsUpdated =
                        if (adjustment.variantId != null) {
                            val variantEntityId =
                                EntityID(
                                    try {
                                        UUID.fromString(adjustment.variantId)
                                    } catch (_: IllegalArgumentException) {
                                        error("Invalid variantId: ${adjustment.variantId}")
                                    },
                                    ProductVariantsTable,
                                )
                            ProductVariantsTable.update({
                                (ProductVariantsTable.id eq variantEntityId) and
                                    (ProductVariantsTable.quantity greaterEq adjustment.quantity)
                            }) {
                                it[ProductVariantsTable.quantity] = ProductVariantsTable.quantity - adjustment.quantity
                            }
                        } else {
                            val productEntityId =
                                EntityID(
                                    try {
                                        UUID.fromString(adjustment.productId)
                                    } catch (_: IllegalArgumentException) {
                                        error("Invalid productId: ${adjustment.productId}")
                                    },
                                    ProductsTable,
                                )
                            val defaultVariant =
                                ProductVariantsTable
                                    .selectAll()
                                    .where { ProductVariantsTable.productId eq productEntityId }
                                    .firstOrNull() ?: error("No variant found for product: ${adjustment.productId}")
                            val defaultVariantId = defaultVariant[ProductVariantsTable.id]
                            ProductVariantsTable.update({
                                (ProductVariantsTable.id eq defaultVariantId) and
                                    (ProductVariantsTable.quantity greaterEq adjustment.quantity)
                            }) {
                                it[ProductVariantsTable.quantity] = ProductVariantsTable.quantity - adjustment.quantity
                            }
                        }

                    if (stockRowsUpdated == 0) error("Insufficient stock for adjustment")
                }
            }
            true
        } catch (_: Exception) {
            false
        }
    }
}
