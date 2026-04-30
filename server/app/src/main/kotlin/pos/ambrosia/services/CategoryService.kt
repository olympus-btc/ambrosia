package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.CategoryItem
import java.sql.Connection

class CategoryService(
    private val connection: Connection,
) {
    private val validTypes = setOf("dish", "ingredient", "product")

    private fun validateType(type: String): Boolean = validTypes.contains(type)

    private fun usageTable(type: String): String =
        when (type) {
            "dish" -> "dishes"
            "ingredient" -> "ingredients"
            "product" -> "products"
            else -> throw IllegalArgumentException("Invalid type")
        }

    private fun map(resultSet: java.sql.ResultSet): CategoryItem =
        CategoryItem(id = resultSet.getString("id"), name = resultSet.getString("name"))

    private fun nameExists(
        name: String,
        type: String,
        excludeId: String? = null,
    ): Boolean {
        val statement =
            connection.prepareStatement(
                "SELECT id FROM categories WHERE name = ? AND type = ? AND is_deleted = 0 AND id != ?",
            )
        statement.setString(1, name)
        statement.setString(2, type)
        statement.setString(3, excludeId ?: "")
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun categoryInUse(
        categoryId: String,
        type: String,
    ): Boolean {
        val table = usageTable(type)
        val sql = "SELECT COUNT(*) as count FROM $table WHERE category_id = ? AND is_deleted = 0"
        val statement = connection.prepareStatement(sql)
        statement.setString(1, categoryId)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) resultSet.getInt("count") > 0 else false
    }

    suspend fun addCategory(
        type: String,
        category: CategoryItem,
    ): String? {
        if (!validateType(type)) return null
        if (category.name.isBlank()) return null
        if (nameExists(category.name, type)) return null

        val id =
            java.util.UUID
                .randomUUID()
                .toString()
        val statement =
            connection.prepareStatement(
                "INSERT INTO categories (id, name, type, is_deleted) VALUES (?, ?, ?, 0)",
            )
        statement.setString(1, id)
        statement.setString(2, category.name)
        statement.setString(3, type)
        val rows = statement.executeUpdate()
        return if (rows > 0) {
            logger.info("Category created: $id type=$type")
            id
        } else {
            null
        }
    }

    suspend fun getCategories(type: String): List<CategoryItem>? {
        if (!validateType(type)) return null
        val statement =
            connection.prepareStatement(
                "SELECT id, name FROM categories WHERE type = ? AND is_deleted = 0",
            )
        statement.setString(1, type)
        val resultSet = statement.executeQuery()
        val out = mutableListOf<CategoryItem>()
        while (resultSet.next()) out.add(map(resultSet))
        return out
    }

    suspend fun getCategoryById(
        id: String,
        type: String,
    ): CategoryItem? {
        if (!validateType(type)) return null
        val statement =
            connection.prepareStatement(
                "SELECT id, name FROM categories WHERE id = ? AND type = ? AND is_deleted = 0",
            )
        statement.setString(1, id)
        statement.setString(2, type)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) map(resultSet) else null
    }

    suspend fun updateCategory(
        type: String,
        category: CategoryItem,
    ): Boolean {
        if (!validateType(type)) return false
        if (category.id == null) return false
        if (category.name.isBlank()) return false
        if (nameExists(category.name, type, category.id)) return false
        val statement =
            connection.prepareStatement(
                "UPDATE categories SET name = ? WHERE id = ? AND type = ?",
            )
        statement.setString(1, category.name)
        statement.setString(2, category.id)
        statement.setString(3, type)
        val rows = statement.executeUpdate()
        if (rows > 0) logger.info("Category updated: ${category.id} type=$type")
        return rows > 0
    }

    suspend fun deleteCategory(
        id: String,
        type: String,
    ): Boolean {
        if (!validateType(type)) return false
        val prev = connection.autoCommit
        connection.autoCommit = false
        try {
            connection.prepareStatement(
                "DELETE FROM product_categories WHERE category_id = ?",
            ).use { statement ->
                statement.setString(1, id)
                statement.executeUpdate()
            }

            val rows = connection.prepareStatement(
                "UPDATE categories SET name = ?, is_deleted = 1 WHERE id = ? AND type = ?",
            ).use { statement ->
                statement.setString(1, "DELETED-$id")
                statement.setString(2, id)
                statement.setString(3, type)
                statement.executeUpdate()
            }
            connection.commit()
            if (rows > 0) logger.info("Category deleted: $id type=$type")
            return rows > 0
        } catch (e: Exception) {
            connection.rollback()
            throw e
        } finally {
            connection.autoCommit = prev
        }
    }
}
