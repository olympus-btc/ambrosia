package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.Product
import java.sql.Connection

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
            image_url = result.getString("image_url"),
            cost_cents = result.getInt("cost_cents"),
            category_ids = getCategoryIds(productId),
            quantity = result.getInt("quantity"),
            min_stock_threshold = result.getInt("min_stock_threshold"),
            max_stock_threshold = result.getInt("max_stock_threshold"),
            price_cents = result.getInt("price_cents"),
        )
    }

    private fun getCategoryIds(productId: String): List<String> {
        val st = connection.prepareStatement(GET_CATEGORY_IDS)
        st.setString(1, productId)
        val rs = st.executeQuery()
        val ids = mutableListOf<String>()
        while (rs.next()) ids.add(rs.getString("category_id"))
        return ids
    }

    private fun insertCategories(
        productId: String,
        categoryIds: List<String>,
    ) {
        val st = connection.prepareStatement(INSERT_CATEGORY)
        for (categoryId in categoryIds) {
            st.setString(1, productId)
            st.setString(2, categoryId)
            st.addBatch()
        }
        st.executeBatch()
    }

    private fun valid(p: Product): Boolean {
        if (p.SKU.isBlank()) return false
        if (p.name.isBlank()) return false
        if (p.cost_cents < 0) return false
        if (p.price_cents < 0) return false
        if (p.quantity < 0) return false
        if (p.min_stock_threshold < 0) return false
        if (p.max_stock_threshold < 0) return false
        if (p.max_stock_threshold > 0 && p.min_stock_threshold > p.max_stock_threshold) return false
        if (p.category_ids.isEmpty()) return false
        return true
    }

    suspend fun addProduct(product: Product): String? {
        if (!valid(product)) return null
        val existing = getProductBySKU(product.SKU)
        if (existing != null) return null
        val id =
            java.util.UUID
                .randomUUID()
                .toString()
        val prev = connection.autoCommit
        connection.autoCommit = false
        try {
            val st = connection.prepareStatement(ADD_PRODUCT)
            st.setString(1, id)
            st.setString(2, product.SKU)
            st.setString(3, product.name)
            st.setString(4, product.description)
            st.setString(5, product.image_url)
            st.setInt(6, product.cost_cents)
            st.setInt(7, product.quantity)
            st.setInt(8, product.min_stock_threshold)
            st.setInt(9, product.max_stock_threshold)
            st.setInt(10, product.price_cents)
            val rows = st.executeUpdate()
            if (rows == 0) {
                connection.rollback()
                return null
            }
            insertCategories(id, product.category_ids)
            connection.commit()
            logger.info("Product created: $id")
            return id
        } catch (e: Exception) {
            connection.rollback()
            throw e
        } finally {
            connection.autoCommit = prev
        }
    }

    suspend fun getProducts(): List<Product> {
        val st = connection.prepareStatement(GET_PRODUCTS)
        val rs = st.executeQuery()
        val out = mutableListOf<Product>()
        while (rs.next()) out.add(map(rs))
        return out
    }

    suspend fun getProductById(id: String): Product? {
        val st = connection.prepareStatement(GET_PRODUCT_BY_ID)
        st.setString(1, id)
        val rs = st.executeQuery()
        return if (rs.next()) map(rs) else null
    }

    suspend fun getProductBySKU(sku: String): Product? {
        val st = connection.prepareStatement(GET_PRODUCT_BY_SKU)
        st.setString(1, sku)
        val rs = st.executeQuery()
        return if (rs.next()) map(rs) else null
    }

    suspend fun getProductsByCategory(category: String): List<Product> {
        val st = connection.prepareStatement(GET_PRODUCTS_BY_CATEGORY)
        st.setString(1, category)
        val rs = st.executeQuery()
        val out = mutableListOf<Product>()
        while (rs.next()) out.add(map(rs))
        return out
    }

    suspend fun updateProduct(product: Product): Boolean {
        if (product.id == null) return false
        if (!valid(product)) return false
        val current = getProductBySKU(product.SKU)
        if (current != null && current.id != product.id) return false
        val prev = connection.autoCommit
        connection.autoCommit = false
        try {
            val st = connection.prepareStatement(UPDATE_PRODUCT)
            st.setString(1, product.SKU)
            st.setString(2, product.name)
            st.setString(3, product.description)
            st.setString(4, product.image_url)
            st.setInt(5, product.cost_cents)
            st.setInt(6, product.quantity)
            st.setInt(7, product.min_stock_threshold)
            st.setInt(8, product.max_stock_threshold)
            st.setInt(9, product.price_cents)
            st.setString(10, product.id)
            val rows = st.executeUpdate()
            if (rows == 0) {
                connection.rollback()
                return false
            }
            val deleteSt = connection.prepareStatement(DELETE_CATEGORIES)
            deleteSt.setString(1, product.id)
            deleteSt.executeUpdate()
            insertCategories(product.id, product.category_ids)
            connection.commit()
            logger.info("Product updated: ${product.id}")
            return true
        } catch (e: Exception) {
            connection.rollback()
            throw e
        } finally {
            connection.autoCommit = prev
        }
    }

    suspend fun deleteProduct(id: String): Boolean {
        val st = connection.prepareStatement(DELETE_PRODUCT)
        st.setString(1, deletedSku(id))
        st.setString(2, id)
        val rows = st.executeUpdate()
        if (rows > 0) logger.info("Product deleted: $id")
        return rows > 0
    }

    private fun deletedSku(id: String): String = "DELETED-$id"

    suspend fun adjustStock(adjustments: List<pos.ambrosia.models.ProductStockAdjustment>): Boolean {
        if (adjustments.isEmpty()) return true
        if (adjustments.any { it.product_id.isBlank() || it.quantity < 0 }) return false

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
                statement.setString(2, adjustment.product_id)
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
