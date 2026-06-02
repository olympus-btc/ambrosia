package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.ProductOptionType
import pos.ambrosia.models.ProductOptionValue
import pos.ambrosia.models.ProductStockAdjustment
import pos.ambrosia.models.ProductVariant
import pos.ambrosia.models.UpsertOptionTypeRequest
import pos.ambrosia.models.UpsertOptionValueRequest
import pos.ambrosia.models.UpsertVariantRequest
import pos.ambrosia.utils.DuplicateVariantSkuException
import java.sql.Connection
import java.sql.ResultSet
import java.sql.SQLException
import java.sql.Types
import java.util.UUID

open class ProductVariantService(
    private val connection: Connection,
) {
    companion object {
        private const val GET_OPTION_TYPES =
            "SELECT id, product_id, name, display_order FROM product_option_types WHERE product_id = ? ORDER BY display_order"
        private const val ADD_OPTION_TYPE =
            "INSERT INTO product_option_types (id, product_id, name, display_order) VALUES (?, ?, ?, ?)"
        private const val UPDATE_OPTION_TYPE =
            "UPDATE product_option_types SET name = ?, display_order = ? WHERE id = ?"
        private const val DELETE_OPTION_TYPE =
            "DELETE FROM product_option_types WHERE id = ?"

        private const val GET_OPTION_VALUES =
            "SELECT id, option_type_id, value, display_order FROM product_option_values WHERE option_type_id = ? ORDER BY display_order"
        private const val ADD_OPTION_VALUE =
            "INSERT INTO product_option_values (id, option_type_id, value, display_order) VALUES (?, ?, ?, ?)"
        private const val DELETE_OPTION_VALUES =
            "DELETE FROM product_option_values WHERE option_type_id = ?"

        private const val GET_VARIANTS =
            "SELECT id, product_id, sku, price_cents, cost_cents, quantity, is_active, image_url FROM product_variants WHERE product_id = ?"
        private const val GET_VARIANT_BY_ID =
            "SELECT id, product_id, sku, price_cents, cost_cents, quantity, is_active, image_url FROM product_variants WHERE id = ?"
        private const val GET_DEFAULT_VARIANT =
            "SELECT id, product_id, sku, price_cents, cost_cents, quantity, is_active, image_url FROM product_variants WHERE product_id = ? LIMIT 1"
        private const val ADD_VARIANT =
            "INSERT INTO product_variants (id, product_id, sku, price_cents, cost_cents, quantity, is_active, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        private const val UPDATE_VARIANT =
            "UPDATE product_variants SET sku = ?, price_cents = ?, cost_cents = ?, quantity = ?, is_active = ?, image_url = ? WHERE id = ?"
        private const val DELETE_VARIANT =
            "DELETE FROM product_variants WHERE id = ?"

        private const val INSERT_VARIANT_OPTION =
            "INSERT INTO variant_option_values (variant_id, option_value_id) VALUES (?, ?)"
        private const val DELETE_VARIANT_OPTIONS =
            "DELETE FROM variant_option_values WHERE variant_id = ?"
        private const val GET_VARIANT_OPTION_IDS =
            "SELECT option_value_id FROM variant_option_values WHERE variant_id = ?"

        private const val ADJUST_STOCK =
            "UPDATE product_variants SET quantity = quantity - ? WHERE id = ? AND quantity >= ?"
        private const val ADJUST_STOCK_BY_PRODUCT =
            "UPDATE product_variants SET quantity = quantity - ? WHERE product_id = ? AND quantity >= ?"
    }

    private fun mapOptionValue(rs: ResultSet): ProductOptionValue =
        ProductOptionValue(
            id = rs.getString("id"),
            optionTypeId = rs.getString("option_type_id"),
            value = rs.getString("value"),
            displayOrder = rs.getInt("display_order"),
        )

    private fun mapVariant(rs: ResultSet): ProductVariant {
        val variantId = rs.getString("id")
        val rawCost = rs.getInt("cost_cents")
        return ProductVariant(
            id = variantId,
            productId = rs.getString("product_id"),
            SKU = rs.getString("sku"),
            priceCents = rs.getInt("price_cents"),
            costCents = if (rs.wasNull()) null else rawCost,
            quantity = rs.getInt("quantity"),
            isActive = rs.getInt("is_active") == 1,
            imageUrl = rs.getString("image_url"),
            optionValueIds = getVariantOptionIds(variantId),
        )
    }

    private fun getOptionValues(optionTypeId: String): List<ProductOptionValue> {
        val statement = connection.prepareStatement(GET_OPTION_VALUES)
        statement.setString(1, optionTypeId)
        val rs = statement.executeQuery()
        val values = mutableListOf<ProductOptionValue>()
        while (rs.next()) values.add(mapOptionValue(rs))
        return values
    }

    private fun getVariantOptionIds(variantId: String): List<String> {
        val statement = connection.prepareStatement(GET_VARIANT_OPTION_IDS)
        statement.setString(1, variantId)
        val rs = statement.executeQuery()
        val ids = mutableListOf<String>()
        while (rs.next()) ids.add(rs.getString("option_value_id"))
        return ids
    }

    private fun insertOptionValues(
        optionTypeId: String,
        values: List<UpsertOptionValueRequest>,
    ) {
        if (values.isEmpty()) return
        val statement = connection.prepareStatement(ADD_OPTION_VALUE)
        for ((index, valueReq) in values.withIndex()) {
            statement.setString(1, UUID.randomUUID().toString())
            statement.setString(2, optionTypeId)
            statement.setString(3, valueReq.value)
            statement.setInt(4, index)
            statement.addBatch()
        }
        statement.executeBatch()
    }

    private fun insertVariantOptionLinks(
        variantId: String,
        optionValueIds: List<String>,
    ) {
        if (optionValueIds.isEmpty()) return
        val statement = connection.prepareStatement(INSERT_VARIANT_OPTION)
        for (optionValueId in optionValueIds) {
            statement.setString(1, variantId)
            statement.setString(2, optionValueId)
            statement.addBatch()
        }
        statement.executeBatch()
    }

    private fun normalizeVariantSku(sku: String?): String? = sku?.takeIf { it.isNotBlank() }

    private fun isDuplicateVariantSkuViolation(e: SQLException): Boolean =
        e.message?.contains("UNIQUE constraint failed: product_variants.sku", ignoreCase = true) == true

    open suspend fun getOptionTypes(productId: String): List<ProductOptionType> {
        val statement = connection.prepareStatement(GET_OPTION_TYPES)
        statement.setString(1, productId)
        val rs = statement.executeQuery()
        val types = mutableListOf<ProductOptionType>()
        while (rs.next()) {
            val id = rs.getString("id")
            types.add(
                ProductOptionType(
                    id = id,
                    productId = rs.getString("product_id"),
                    name = rs.getString("name"),
                    displayOrder = rs.getInt("display_order"),
                    values = getOptionValues(id),
                ),
            )
        }
        return types
    }

    suspend fun addOptionType(
        productId: String,
        req: UpsertOptionTypeRequest,
    ): String {
        val id = UUID.randomUUID().toString()
        val prev = connection.autoCommit
        connection.autoCommit = false
        try {
            connection.prepareStatement(ADD_OPTION_TYPE).use { statement ->
                statement.setString(1, id)
                statement.setString(2, productId)
                statement.setString(3, req.name)
                statement.setInt(4, req.displayOrder)
                statement.executeUpdate()
            }
            insertOptionValues(id, req.values)
            connection.commit()
            logger.info("Option type created: $id for product $productId")
            return id
        } catch (e: Exception) {
            connection.rollback()
            throw e
        } finally {
            connection.autoCommit = prev
        }
    }

    suspend fun updateOptionType(
        optionTypeId: String,
        req: UpsertOptionTypeRequest,
    ): Boolean {
        val prev = connection.autoCommit
        connection.autoCommit = false
        try {
            val rows =
                connection.prepareStatement(UPDATE_OPTION_TYPE).use { statement ->
                    statement.setString(1, req.name)
                    statement.setInt(2, req.displayOrder)
                    statement.setString(3, optionTypeId)
                    statement.executeUpdate()
                }
            if (rows == 0) {
                connection.rollback()
                return false
            }
            connection.prepareStatement(DELETE_OPTION_VALUES).use { statement ->
                statement.setString(1, optionTypeId)
                statement.executeUpdate()
            }
            insertOptionValues(optionTypeId, req.values)
            connection.commit()
            logger.info("Option type updated: $optionTypeId")
            return true
        } catch (e: Exception) {
            connection.rollback()
            throw e
        } finally {
            connection.autoCommit = prev
        }
    }

    suspend fun deleteOptionType(optionTypeId: String): Boolean {
        val statement = connection.prepareStatement(DELETE_OPTION_TYPE)
        statement.setString(1, optionTypeId)
        val rows = statement.executeUpdate()
        if (rows > 0) logger.info("Option type deleted: $optionTypeId")
        return rows > 0
    }

    open suspend fun getVariants(productId: String): List<ProductVariant> {
        val statement = connection.prepareStatement(GET_VARIANTS)
        statement.setString(1, productId)
        val rs = statement.executeQuery()
        val variants = mutableListOf<ProductVariant>()
        while (rs.next()) variants.add(mapVariant(rs))
        return variants
    }

    suspend fun getVariantById(variantId: String): ProductVariant? {
        val statement = connection.prepareStatement(GET_VARIANT_BY_ID)
        statement.setString(1, variantId)
        val rs = statement.executeQuery()
        return if (rs.next()) mapVariant(rs) else null
    }

    suspend fun getDefaultVariant(productId: String): ProductVariant? {
        val statement = connection.prepareStatement(GET_DEFAULT_VARIANT)
        statement.setString(1, productId)
        val rs = statement.executeQuery()
        return if (rs.next()) mapVariant(rs) else null
    }

    suspend fun addVariant(
        productId: String,
        req: UpsertVariantRequest,
    ): String? {
        if (req.priceCents < 0) return null
        if (req.quantity < 0) return null
        val normalizedSku = normalizeVariantSku(req.SKU)
        val id = UUID.randomUUID().toString()
        val prev = connection.autoCommit
        connection.autoCommit = false
        try {
            connection.prepareStatement(ADD_VARIANT).use { statement ->
                statement.setString(1, id)
                statement.setString(2, productId)
                statement.setString(3, normalizedSku)
                statement.setInt(4, req.priceCents)
                if (req.costCents != null) statement.setInt(5, req.costCents) else statement.setNull(5, Types.INTEGER)
                statement.setInt(6, req.quantity)
                statement.setInt(7, if (req.isActive) 1 else 0)
                statement.setString(8, req.imageUrl)
                statement.executeUpdate()
            }
            insertVariantOptionLinks(id, req.optionValueIds)
            connection.commit()
            logger.info("Variant created: $id for product $productId")
            return id
        } catch (e: SQLException) {
            connection.rollback()
            if (isDuplicateVariantSkuViolation(e)) throw DuplicateVariantSkuException()
            throw e
        } catch (e: Exception) {
            connection.rollback()
            throw e
        } finally {
            connection.autoCommit = prev
        }
    }

    suspend fun updateVariant(
        variantId: String,
        req: UpsertVariantRequest,
    ): Boolean {
        if (req.priceCents < 0) return false
        if (req.quantity < 0) return false
        val normalizedSku = normalizeVariantSku(req.SKU)
        val prev = connection.autoCommit
        connection.autoCommit = false
        try {
            val rows =
                connection.prepareStatement(UPDATE_VARIANT).use { statement ->
                    statement.setString(1, normalizedSku)
                    statement.setInt(2, req.priceCents)
                    if (req.costCents != null) statement.setInt(3, req.costCents) else statement.setNull(3, Types.INTEGER)
                    statement.setInt(4, req.quantity)
                    statement.setInt(5, if (req.isActive) 1 else 0)
                    statement.setString(6, req.imageUrl)
                    statement.setString(7, variantId)
                    statement.executeUpdate()
                }
            if (rows == 0) {
                connection.rollback()
                return false
            }
            connection.prepareStatement(DELETE_VARIANT_OPTIONS).use { statement ->
                statement.setString(1, variantId)
                statement.executeUpdate()
            }
            insertVariantOptionLinks(variantId, req.optionValueIds)
            connection.commit()
            logger.info("Variant updated: $variantId")
            return true
        } catch (e: SQLException) {
            connection.rollback()
            if (isDuplicateVariantSkuViolation(e)) throw DuplicateVariantSkuException()
            throw e
        } catch (e: Exception) {
            connection.rollback()
            throw e
        } finally {
            connection.autoCommit = prev
        }
    }

    suspend fun deleteVariant(variantId: String): Boolean {
        val statement = connection.prepareStatement(DELETE_VARIANT)
        statement.setString(1, variantId)
        val rows = statement.executeUpdate()
        if (rows > 0) logger.info("Variant deleted: $variantId")
        return rows > 0
    }

    suspend fun adjustStock(adjustments: List<ProductStockAdjustment>): Boolean {
        if (adjustments.isEmpty()) return true
        if (adjustments.any { it.quantity < 0 }) return false
        val prev = connection.autoCommit
        connection.autoCommit = false
        try {
            for (adjustment in adjustments) {
                if (adjustment.quantity == 0) continue
                val sql = if (adjustment.variantId != null) ADJUST_STOCK else ADJUST_STOCK_BY_PRODUCT
                val rows =
                    connection.prepareStatement(sql).use { statement ->
                        statement.setInt(1, adjustment.quantity)
                        statement.setString(2, adjustment.variantId ?: adjustment.productId)
                        statement.setInt(3, adjustment.quantity)
                        statement.executeUpdate()
                    }
                if (rows == 0) {
                    connection.rollback()
                    return false
                }
            }
            connection.commit()
            return true
        } catch (e: Exception) {
            connection.rollback()
            throw e
        } finally {
            connection.autoCommit = prev
        }
    }
}
