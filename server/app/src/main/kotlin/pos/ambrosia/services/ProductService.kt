package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.Product
import pos.ambrosia.utils.DuplicateProductSkuException
import java.sql.Connection
import java.sql.SQLException

class ProductService(
    private val connection: Connection,
) {
    companion object {
        private const val ADD_PRODUCT =
            "INSERT INTO products (id, SKU, name, description, image_url, cost_cents, quantity, min_stock_threshold, max_stock_threshold, price_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        private const val GET_PRODUCTS =
            "SELECT id, SKU, name, description, image_url, cost_cents, quantity, min_stock_threshold, max_stock_threshold, price_cents FROM products WHERE is_deleted = 0"
        private const val GET_PRODUCT_BY_ID =
            "SELECT id, SKU, name, description, image_url, cost_cents, quantity, min_stock_threshold, max_stock_threshold, price_cents FROM products WHERE id = ? AND is_deleted = 0"
        private const val GET_PRODUCT_BY_SKU =
            "SELECT id, SKU, name, description, image_url, cost_cents, quantity, min_stock_threshold, max_stock_threshold, price_cents FROM products WHERE SKU = ? AND is_deleted = 0"
        private const val UPDATE_PRODUCT =
            "UPDATE products SET SKU = ?, name = ?, description = ?, image_url = ?, cost_cents = ?, quantity = ?, min_stock_threshold = ?, max_stock_threshold = ?, price_cents = ? WHERE id = ?"
        private const val DELETE_PRODUCT = "UPDATE products SET is_deleted = 1, SKU = ? WHERE id = ?"
        private const val GET_CATEGORY_IDS =
            "SELECT category_id FROM product_categories WHERE product_id = ?"
        private const val INSERT_CATEGORY =
            "INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)"
        private const val DELETE_CATEGORIES =
            "DELETE FROM product_categories WHERE product_id = ?"
        private const val GET_PRODUCTS_BY_CATEGORY =
            "SELECT DISTINCT p.id, p.SKU, p.name, p.description, p.image_url, p.cost_cents, p.quantity, p.min_stock_threshold, p.max_stock_threshold, p.price_cents FROM products p INNER JOIN product_categories pc ON p.id = pc.product_id WHERE pc.category_id = ? AND p.is_deleted = 0"
    }

    private fun map(result: java.sql.ResultSet): Product {
        val productId = result.getString("id")
        return Product(
            id = productId,
            SKU = result.getString("SKU"),
            name = result.getString("name"),
            description = result.getString("description"),
            imageUrl = result.getString("image_url"),
            costCents = result.getInt("cost_cents"),
            categoryIds = getCategoryIds(productId),
            quantity = result.getInt("quantity"),
            minStockThreshold = result.getInt("min_stock_threshold"),
            maxStockThreshold = result.getInt("max_stock_threshold"),
            priceCents = result.getInt("price_cents"),
        )
    }

    private fun getCategoryIds(productId: String): List<String> {
        val statement = connection.prepareStatement(GET_CATEGORY_IDS)
        statement.setString(1, productId)
        val resultSet = statement.executeQuery()
        val ids = mutableListOf<String>()
        while (resultSet.next()) ids.add(resultSet.getString("category_id"))
        return ids
    }

    private fun insertCategories(
        productId: String,
        categoryIds: List<String>,
    ) {
        val statement = connection.prepareStatement(INSERT_CATEGORY)
        for (categoryId in categoryIds) {
            statement.setString(1, productId)
            statement.setString(2, categoryId)
            statement.addBatch()
        }
        statement.executeBatch()
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

    suspend fun addProduct(product: Product): String? {
        if (!valid(product)) return null
        val normalizedSku = normalizeSku(product.SKU)
        if (normalizedSku != null) {
            val existing = getProductBySKU(normalizedSku)
            if (existing != null) throw DuplicateProductSkuException()
        }
        val id =
            java.util.UUID
                .randomUUID()
                .toString()
        val prev = connection.autoCommit
        connection.autoCommit = false
        try {
            val statement = connection.prepareStatement(ADD_PRODUCT)
            statement.setString(1, id)
            statement.setString(2, normalizedSku)
            statement.setString(3, product.name)
            statement.setString(4, product.description)
            statement.setString(5, product.imageUrl)
            statement.setInt(6, product.costCents)
            statement.setInt(7, product.quantity)
            statement.setInt(8, product.minStockThreshold)
            statement.setInt(9, product.maxStockThreshold)
            statement.setInt(10, product.priceCents)
            val rows = statement.executeUpdate()
            if (rows == 0) {
                connection.rollback()
                return null
            }
            insertCategories(id, product.categoryIds)
            connection.commit()
            logger.info("Product created: $id")
            return id
        } catch (e: SQLException) {
            connection.rollback()
            if (isDuplicateSkuViolation(e)) throw DuplicateProductSkuException()
            throw e
        } catch (e: Exception) {
            connection.rollback()
            throw e
        } finally {
            connection.autoCommit = prev
        }
    }

    suspend fun getProducts(): List<Product> {
        val statement = connection.prepareStatement(GET_PRODUCTS)
        val resultSet = statement.executeQuery()
        val out = mutableListOf<Product>()
        while (resultSet.next()) out.add(map(resultSet))
        return out
    }

    suspend fun getProductById(id: String): Product? {
        val statement = connection.prepareStatement(GET_PRODUCT_BY_ID)
        statement.setString(1, id)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) map(resultSet) else null
    }

    suspend fun getProductBySKU(sku: String?): Product? {
        val normalizedSku = normalizeSku(sku) ?: return null
        val statement = connection.prepareStatement(GET_PRODUCT_BY_SKU)
        statement.setString(1, normalizedSku)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) map(resultSet) else null
    }

    suspend fun getProductsByCategory(category: String): List<Product> {
        val statement = connection.prepareStatement(GET_PRODUCTS_BY_CATEGORY)
        statement.setString(1, category)
        val resultSet = statement.executeQuery()
        val out = mutableListOf<Product>()
        while (resultSet.next()) out.add(map(resultSet))
        return out
    }

    suspend fun updateProduct(product: Product): Boolean {
        if (product.id == null) return false
        if (!valid(product)) return false
        val normalizedSku = normalizeSku(product.SKU)
        if (normalizedSku != null) {
            val current = getProductBySKU(normalizedSku)
            if (current != null && current.id != product.id) throw DuplicateProductSkuException()
        }
        val prev = connection.autoCommit
        connection.autoCommit = false
        try {
            val rows =
                connection.prepareStatement(UPDATE_PRODUCT).use { statement ->
                    statement.setString(1, normalizedSku)
                    statement.setString(2, product.name)
                    statement.setString(3, product.description)
                    statement.setString(4, product.imageUrl)
                    statement.setInt(5, product.costCents)
                    statement.setInt(6, product.quantity)
                    statement.setInt(7, product.minStockThreshold)
                    statement.setInt(8, product.maxStockThreshold)
                    statement.setInt(9, product.priceCents)
                    statement.setString(10, product.id)
                    statement.executeUpdate()
                }
            if (rows == 0) {
                connection.rollback()
                return false
            }
            connection.prepareStatement(DELETE_CATEGORIES).use { statement ->
                statement.setString(1, product.id)
                statement.executeUpdate()
            }
            insertCategories(product.id, product.categoryIds)
            connection.commit()
            logger.info("Product updated: ${product.id}")
            return true
        } catch (e: SQLException) {
            connection.rollback()
            if (isDuplicateSkuViolation(e)) throw DuplicateProductSkuException()
            throw e
        } catch (e: Exception) {
            connection.rollback()
            throw e
        } finally {
            connection.autoCommit = prev
        }
    }

    suspend fun deleteProduct(id: String): Boolean {
        val statement = connection.prepareStatement(DELETE_PRODUCT)
        statement.setString(1, deletedSku(id))
        statement.setString(2, id)
        val rows = statement.executeUpdate()
        if (rows > 0) logger.info("Product deleted: $id")
        return rows > 0
    }

    private fun deletedSku(id: String): String = "DELETED-$id"

    private fun isDuplicateSkuViolation(error: SQLException): Boolean =
        error.message?.contains("UNIQUE constraint failed: products.SKU", ignoreCase = true) == true

    suspend fun adjustStock(adjustments: List<pos.ambrosia.models.ProductStockAdjustment>): Boolean {
        if (adjustments.isEmpty()) return true
        if (adjustments.any { it.productId.isBlank() || it.quantity < 0 }) return false

        val previousAutoCommit = connection.autoCommit
        connection.autoCommit = false
        try {
            val statement =
                connection.prepareStatement(
                    "UPDATE products SET quantity = quantity - ? WHERE id = ? AND is_deleted = 0 AND quantity >= ?",
                )
            for (adjustment in adjustments) {
                if (adjustment.quantity == 0) continue
                statement.setInt(1, adjustment.quantity)
                statement.setString(2, adjustment.productId)
                statement.setInt(3, adjustment.quantity)
                val rows = statement.executeUpdate()
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
            connection.autoCommit = previousAutoCommit
        }
    }
}
