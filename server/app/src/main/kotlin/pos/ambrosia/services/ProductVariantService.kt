package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.greaterEq
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

    private fun toVariantModel(entity: ProductVariantEntity): ProductVariant {
        val optionValueIds =
            VariantOptionValuesTable.selectAll()
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

    private fun insertOptionValues(
        optionTypeId: UUID,
        values: List<pos.ambrosia.models.UpsertOptionValueRequest>,
    ) {
        for ((index, valueReq) in values.withIndex()) {
            ProductOptionValueEntity.new(UUID.randomUUID()) {
                this.optionTypeId = EntityID(optionTypeId, ProductOptionTypesTable)
                this.value = valueReq.value
                this.displayOrder = if (valueReq.displayOrder != 0) valueReq.displayOrder else index
            }
        }
    }

    open fun getOptionTypes(productId: String): List<ProductOptionType> =
        transaction {
            val productEntityId = EntityID(UUID.fromString(productId), ProductsTable)
            ProductOptionTypesTable.selectAll()
                .where { ProductOptionTypesTable.productId eq productEntityId }
                .orderBy(ProductOptionTypesTable.displayOrder)
                .map { row ->
                    val typeId = row[ProductOptionTypesTable.id].value
                    val values =
                        ProductOptionValuesTable.selectAll()
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
                        productId = productId,
                        name = row[ProductOptionTypesTable.name],
                        displayOrder = row[ProductOptionTypesTable.displayOrder],
                        values = values,
                    )
                }
        }

    fun addOptionType(
        productId: String,
        req: UpsertOptionTypeRequest,
    ): String =
        transaction {
            val typeId =
                ProductOptionTypeEntity
                    .new(UUID.randomUUID()) {
                        this.productId = EntityID(UUID.fromString(productId), ProductsTable)
                        this.name = req.name
                        this.displayOrder = req.displayOrder
                    }.id.value
            insertOptionValues(typeId, req.values)
            logger.info("Option type created: $typeId for product $productId")
            typeId.toString()
        }

    fun updateOptionType(
        optionTypeId: String,
        req: UpsertOptionTypeRequest,
    ): Boolean =
        transaction {
            val uuid = UUID.fromString(optionTypeId)
            val entity = ProductOptionTypeEntity.findById(uuid) ?: return@transaction false
            entity.name = req.name
            entity.displayOrder = req.displayOrder
            ProductOptionValuesTable.deleteWhere {
                ProductOptionValuesTable.optionTypeId eq EntityID(uuid, ProductOptionTypesTable)
            }
            insertOptionValues(uuid, req.values)
            logger.info("Option type updated: $optionTypeId")
            true
        }

    fun deleteOptionType(optionTypeId: String): Boolean =
        transaction {
            val entity = ProductOptionTypeEntity.findById(UUID.fromString(optionTypeId)) ?: return@transaction false
            entity.delete()
            logger.info("Option type deleted: $optionTypeId")
            true
        }

    open fun getVariants(productId: String): List<ProductVariant> =
        transaction {
            val productEntityId = EntityID(UUID.fromString(productId), ProductsTable)
            ProductVariantEntity.find { ProductVariantsTable.productId eq productEntityId }
                .map { toVariantModel(it) }
        }

    fun getVariantById(variantId: String): ProductVariant? =
        transaction {
            val uuid =
                try {
                    UUID.fromString(variantId)
                } catch (_: IllegalArgumentException) {
                    return@transaction null
                }
            ProductVariantEntity.findById(uuid)?.let { toVariantModel(it) }
        }

    fun getDefaultVariant(productId: String): ProductVariant? =
        transaction {
            val productEntityId = EntityID(UUID.fromString(productId), ProductsTable)
            ProductVariantEntity.find { ProductVariantsTable.productId eq productEntityId }
                .firstOrNull()
                ?.let { toVariantModel(it) }
        }

    fun addVariant(
        productId: String,
        req: UpsertVariantRequest,
    ): String? =
        transaction {
            if (req.priceCents < 0) return@transaction null
            if (req.quantity < 0) return@transaction null
            val entity =
                ProductVariantEntity.new(UUID.randomUUID()) {
                    this.productId = EntityID(UUID.fromString(productId), ProductsTable)
                    this.sku = normalizeSku(req.SKU)
                    this.priceCents = req.priceCents
                    this.costCents = req.costCents
                    this.quantity = req.quantity
                    this.isActive = req.isActive
                    this.imageUrl = req.imageUrl
                }
            for (optionValueId in req.optionValueIds) {
                VariantOptionValuesTable.insert {
                    it[VariantOptionValuesTable.variantId] = entity.id
                    it[VariantOptionValuesTable.optionValueId] = EntityID(UUID.fromString(optionValueId), ProductOptionValuesTable)
                }
            }
            logger.info("Variant created: ${entity.id.value} for product $productId")
            entity.id.value.toString()
        }

    fun updateVariant(
        variantId: String,
        req: UpsertVariantRequest,
    ): Boolean =
        transaction {
            if (req.priceCents < 0) return@transaction false
            if (req.quantity < 0) return@transaction false
            val uuid = UUID.fromString(variantId)
            val entity = ProductVariantEntity.findById(uuid) ?: return@transaction false
            entity.sku = normalizeSku(req.SKU)
            entity.priceCents = req.priceCents
            entity.costCents = req.costCents
            entity.quantity = req.quantity
            entity.isActive = req.isActive
            entity.imageUrl = req.imageUrl
            VariantOptionValuesTable.deleteWhere { VariantOptionValuesTable.variantId eq entity.id }
            for (optionValueId in req.optionValueIds) {
                VariantOptionValuesTable.insert {
                    it[VariantOptionValuesTable.variantId] = entity.id
                    it[VariantOptionValuesTable.optionValueId] = EntityID(UUID.fromString(optionValueId), ProductOptionValuesTable)
                }
            }
            logger.info("Variant updated: $variantId")
            true
        }

    fun deleteVariant(variantId: String): Boolean =
        transaction {
            val entity = ProductVariantEntity.findById(UUID.fromString(variantId)) ?: return@transaction false
            entity.delete()
            logger.info("Variant deleted: $variantId")
            true
        }

    fun adjustStock(adjustments: List<ProductStockAdjustment>): Boolean =
        transaction {
            if (adjustments.isEmpty()) return@transaction true
            if (adjustments.any { it.quantity < 0 }) return@transaction false

            for (adjustment in adjustments) {
                if (adjustment.quantity == 0) continue

                val updated =
                    if (adjustment.variantId != null) {
                        val variantEntityId =
                            EntityID(
                                try {
                                    UUID.fromString(adjustment.variantId)
                                } catch (_: IllegalArgumentException) {
                                    return@transaction false
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
                                    return@transaction false
                                },
                                ProductsTable,
                            )
                        val defaultVariant =
                            ProductVariantsTable.selectAll()
                                .where { ProductVariantsTable.productId eq productEntityId }
                                .firstOrNull() ?: return@transaction false
                        val defaultVariantId = defaultVariant[ProductVariantsTable.id]
                        ProductVariantsTable.update({
                            (ProductVariantsTable.id eq defaultVariantId) and
                                (ProductVariantsTable.quantity greaterEq adjustment.quantity)
                        }) {
                            it[ProductVariantsTable.quantity] = ProductVariantsTable.quantity - adjustment.quantity
                        }
                    }

                if (updated == 0) return@transaction false
            }
            true
        }
}
