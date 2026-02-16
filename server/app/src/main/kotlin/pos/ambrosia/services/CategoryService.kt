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

    private fun map(rs: java.sql.ResultSet): CategoryItem = CategoryItem(id = rs.getString("id"), name = rs.getString("name"))

    private fun nameExists(
        name: String,
        type: String,
        excludeId: String? = null,
    ): Boolean {
        val st =
            connection.prepareStatement(
                "SELECT id FROM categories WHERE name = ? AND type = ? AND is_deleted = 0 AND id != ?",
            )
        st.setString(1, name)
        st.setString(2, type)
        st.setString(3, excludeId ?: "")
        val rs = st.executeQuery()
        return rs.next()
    }

    private fun categoryInUse(
        categoryId: String,
        type: String,
    ): Boolean {
        val table = usageTable(type)
        val sql = "SELECT COUNT(*) as count FROM $table WHERE category_id = ? AND is_deleted = 0"
        val st = connection.prepareStatement(sql)
        st.setString(1, categoryId)
        val rs = st.executeQuery()
        return if (rs.next()) rs.getInt("count") > 0 else false
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
        val st =
            connection.prepareStatement(
                "INSERT INTO categories (id, name, type, is_deleted) VALUES (?, ?, ?, 0)",
            )
        st.setString(1, id)
        st.setString(2, category.name)
        st.setString(3, type)
        val rows = st.executeUpdate()
        return if (rows > 0) {
            logger.info("Category created: $id type=$type")
            id
        } else {
            null
        }
    }

    suspend fun getCategories(type: String): List<CategoryItem> {
        if (!validateType(type)) return emptyList()
        val st =
            connection.prepareStatement(
                "SELECT id, name FROM categories WHERE type = ? AND is_deleted = 0",
            )
        st.setString(1, type)
        val rs = st.executeQuery()
        val out = mutableListOf<CategoryItem>()
        while (rs.next()) out.add(map(rs))
        return out
    }

    suspend fun getCategoryById(
        id: String,
        type: String,
    ): CategoryItem? {
        if (!validateType(type)) return null
        val st =
            connection.prepareStatement(
                "SELECT id, name FROM categories WHERE id = ? AND type = ? AND is_deleted = 0",
            )
        st.setString(1, id)
        st.setString(2, type)
        val rs = st.executeQuery()
        return if (rs.next()) map(rs) else null
    }

    suspend fun updateCategory(
        type: String,
        category: CategoryItem,
    ): Boolean {
        if (!validateType(type)) return false
        if (category.id == null) return false
        if (category.name.isBlank()) return false
        if (nameExists(category.name, type, category.id)) return false
        val st =
            connection.prepareStatement(
                "UPDATE categories SET name = ? WHERE id = ? AND type = ?",
            )
        st.setString(1, category.name)
        st.setString(2, category.id)
        st.setString(3, type)
        val rows = st.executeUpdate()
        if (rows > 0) logger.info("Category updated: ${category.id} type=$type")
        return rows > 0
    }

    suspend fun deleteCategory(
        id: String,
        type: String,
    ): Boolean {
        if (!validateType(type)) return false
        if (categoryInUse(id, type)) return false
        val st =
            connection.prepareStatement(
                "UPDATE categories SET is_deleted = 1 WHERE id = ? AND type = ?",
            )
        st.setString(1, id)
        st.setString(2, type)
        val rows = st.executeUpdate()
        if (rows > 0) logger.info("Category deleted: $id type=$type")
        return rows > 0
    }
}
