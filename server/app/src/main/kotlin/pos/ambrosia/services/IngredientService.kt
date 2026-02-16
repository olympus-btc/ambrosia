package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.Ingredient
import java.sql.Connection

class IngredientService(
    private val connection: Connection,
) {
    companion object {
        private const val ADD_INGREDIENT =
            "INSERT INTO ingredients (id, name, category_id, quantity, unit, low_stock_threshold, cost_per_unit) VALUES (?, ?, ?, ?, ?, ?, ?)"
        private const val GET_INGREDIENTS =
            "SELECT id, name, category_id, quantity, unit, low_stock_threshold, cost_per_unit FROM ingredients WHERE is_deleted = 0"
        private const val GET_INGREDIENT_BY_ID =
            "SELECT id, name, category_id, quantity, unit, low_stock_threshold, cost_per_unit FROM ingredients WHERE id = ? AND is_deleted = 0"
        private const val UPDATE_INGREDIENT =
            "UPDATE ingredients SET name = ?, category_id = ?, quantity = ?, unit = ?, low_stock_threshold = ?, cost_per_unit = ? WHERE id = ?"
        private const val DELETE_INGREDIENT = "UPDATE ingredients SET is_deleted = 1 WHERE id = ?"
        private const val CHECK_CATEGORY_EXISTS =
            "SELECT id FROM categories WHERE id = ? AND type = 'ingredient' AND is_deleted = 0"
        private const val CHECK_INGREDIENT_IN_USE =
            "SELECT COUNT(*) as count FROM dishes_ingredient WHERE id_ingredient = ?"
        private const val GET_LOW_STOCK_INGREDIENTS =
            "SELECT id, name, category_id, quantity, unit, low_stock_threshold, cost_per_unit FROM ingredients WHERE quantity < low_stock_threshold AND is_deleted = 0"
        private const val GET_INGREDIENTS_BY_CATEGORY =
            "SELECT id, name, category_id, quantity, unit, low_stock_threshold, cost_per_unit FROM ingredients WHERE category_id = ? AND is_deleted = 0"
    }

    private fun categoryExists(categoryId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_CATEGORY_EXISTS)
        statement.setString(1, categoryId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun ingredientInUse(ingredientId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_INGREDIENT_IN_USE)
        statement.setString(1, ingredientId)
        val resultSet = statement.executeQuery()
        if (resultSet.next()) {
            return resultSet.getInt("count") > 0
        }
        return false
    }

    private fun mapResultSetToIngredient(resultSet: java.sql.ResultSet): Ingredient =
        Ingredient(
            id = resultSet.getString("id"),
            name = resultSet.getString("name"), // CORREGIDO: era "naame"
            category_id = resultSet.getString("category_id"),
            quantity = resultSet.getDouble("quantity"), // CORREGIDO: era Float
            unit = resultSet.getString("unit"),
            low_stock_threshold =
                resultSet.getDouble("low_stock_threshold"), // CORREGIDO: era Float
            cost_per_unit = resultSet.getDouble("cost_per_unit"), // CORREGIDO: era Float
        )

    suspend fun addIngredient(ingredient: Ingredient): String? {
        // Verificar que la categoría existe
        if (!categoryExists(ingredient.category_id)) {
            logger.error("Category does not exist: ${ingredient.category_id}")
            return null
        }

        // Validar datos
        if (ingredient.name.isBlank()) {
            logger.error("Ingredient name cannot be blank")
            return null
        }

        if (ingredient.quantity < 0 ||
            ingredient.low_stock_threshold < 0 ||
            ingredient.cost_per_unit < 0
        ) {
            logger.error("Quantity, threshold and cost cannot be negative")
            return null
        }

        val generatedId =
            java.util.UUID
                .randomUUID()
                .toString()
        val statement = connection.prepareStatement(ADD_INGREDIENT)

        statement.setString(1, generatedId)
        statement.setString(2, ingredient.name) // CORREGIDO: era ingredient.naame
        statement.setString(3, ingredient.category_id)
        statement.setDouble(4, ingredient.quantity) // CORREGIDO: era setFloat
        statement.setString(5, ingredient.unit)
        statement.setDouble(6, ingredient.low_stock_threshold) // CORREGIDO: era setFloat
        statement.setDouble(7, ingredient.cost_per_unit) // CORREGIDO: era setFloat

        val rowsAffected = statement.executeUpdate()

        return if (rowsAffected > 0) {
            logger.info("Ingredient created successfully with ID: $generatedId")
            generatedId
        } else {
            logger.error("Failed to create ingredient")
            null
        }
    }

    suspend fun getIngredients(): List<Ingredient> {
        val statement = connection.prepareStatement(GET_INGREDIENTS)
        val resultSet = statement.executeQuery()
        val ingredients = mutableListOf<Ingredient>()
        while (resultSet.next()) {
            ingredients.add(mapResultSetToIngredient(resultSet))
        }
        logger.info("Retrieved ${ingredients.size} ingredients")
        return ingredients
    }

    suspend fun getIngredientById(id: String): Ingredient? {
        val statement = connection.prepareStatement(GET_INGREDIENT_BY_ID)
        statement.setString(1, id)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) {
            mapResultSetToIngredient(resultSet)
        } else {
            logger.warn("Ingredient not found with ID: $id")
            null
        }
    }

    suspend fun getIngredientsByCategory(categoryId: String): List<Ingredient> {
        val statement = connection.prepareStatement(GET_INGREDIENTS_BY_CATEGORY)
        statement.setString(1, categoryId)
        val resultSet = statement.executeQuery()
        val ingredients = mutableListOf<Ingredient>()
        while (resultSet.next()) {
            ingredients.add(mapResultSetToIngredient(resultSet))
        }
        logger.info("Retrieved ${ingredients.size} ingredients for category: $categoryId")
        return ingredients
    }

    suspend fun updateIngredient(ingredient: Ingredient): Boolean {
        if (ingredient.id == null) {
            logger.error("Cannot update ingredient: ID is null")
            return false
        }

        // Verificar que la categoría existe
        if (!categoryExists(ingredient.category_id)) {
            logger.error("Category does not exist: ${ingredient.category_id}")
            return false
        }

        // Validar datos
        if (ingredient.name.isBlank()) {
            logger.error("Ingredient name cannot be blank")
            return false
        }

        if (ingredient.quantity < 0 ||
            ingredient.low_stock_threshold < 0 ||
            ingredient.cost_per_unit < 0
        ) {
            logger.error("Quantity, threshold and cost cannot be negative")
            return false
        }

        val statement = connection.prepareStatement(UPDATE_INGREDIENT)
        statement.setString(1, ingredient.name)
        statement.setString(2, ingredient.category_id)
        statement.setDouble(3, ingredient.quantity)
        statement.setString(4, ingredient.unit)
        statement.setDouble(5, ingredient.low_stock_threshold)
        statement.setDouble(6, ingredient.cost_per_unit)
        statement.setString(7, ingredient.id)

        val rowsUpdated = statement.executeUpdate()
        if (rowsUpdated > 0) {
            logger.info("Ingredient updated successfully: ${ingredient.id}")
        } else {
            logger.error("Failed to update ingredient: ${ingredient.id}")
        }
        return rowsUpdated > 0
    }

    suspend fun deleteIngredient(id: String): Boolean {
        // Verificar que el ingrediente no esté siendo usado en platos
        if (ingredientInUse(id)) {
            logger.error("Cannot delete ingredient $id: it's being used in dishes")
            return false
        }

        val statement = connection.prepareStatement(DELETE_INGREDIENT)
        statement.setString(1, id)
        val rowsDeleted = statement.executeUpdate()

        if (rowsDeleted > 0) {
            logger.info("Ingredient soft-deleted successfully: $id")
        } else {
            logger.error("Failed to delete ingredient: $id")
        }
        return rowsDeleted > 0
    }

    suspend fun getLowStockIngredients(): List<Ingredient> {
        val statement = connection.prepareStatement(GET_LOW_STOCK_INGREDIENTS)
        val resultSet = statement.executeQuery()
        val lowStockIngredients = mutableListOf<Ingredient>()
        while (resultSet.next()) {
            lowStockIngredients.add(mapResultSetToIngredient(resultSet))
        }
        logger.info("Retrieved ${lowStockIngredients.size} low stock ingredients")
        return lowStockIngredients
    }

    suspend fun updateIngredientQuantity(
        id: String,
        newQuantity: Double,
    ): Boolean {
        if (newQuantity < 0) {
            logger.error("Quantity cannot be negative")
            return false
        }

        val statement =
            connection.prepareStatement(
                "UPDATE ingredients SET quantity = ? WHERE id = ? AND is_deleted = 0",
            )
        statement.setDouble(1, newQuantity)
        statement.setString(2, id)

        val rowsUpdated = statement.executeUpdate()
        if (rowsUpdated > 0) {
            logger.info("Ingredient quantity updated: $id -> $newQuantity")
        } else {
            logger.error("Failed to update ingredient quantity: $id")
        }
        return rowsUpdated > 0
    }
}
