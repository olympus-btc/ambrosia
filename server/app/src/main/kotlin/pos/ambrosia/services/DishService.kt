package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.Dish
import java.sql.Connection

class DishService(
    private val connection: Connection,
) {
    companion object {
        private const val ADD_DISH =
            "INSERT INTO dishes (id, name, price, category_id) VALUES (?, ?, ?, ?)"
        private const val GET_DISHES =
            "SELECT id, name, price, category_id FROM dishes WHERE is_deleted = 0"
        private const val GET_DISH_BY_ID =
            "SELECT id, name, price, category_id FROM dishes WHERE id = ? AND is_deleted = 0"
        private const val UPDATE_DISH =
            "UPDATE dishes SET name = ?, price = ?, category_id = ? WHERE id = ?"
        private const val DELETE_DISH = "UPDATE dishes SET is_deleted = 1 WHERE id = ?"
        private const val CHECK_CATEGORY_EXISTS =
            "SELECT id FROM categories WHERE id = ? AND type = 'dish' AND is_deleted = 0"
        private const val CHECK_DISH_IN_USE =
            "SELECT COUNT(*) as count FROM orders_dishes WHERE dish_id = ?"
        private const val GET_DISHES_BY_CATEGORY =
            "SELECT id, name, price, category_id FROM dishes WHERE category_id = ? AND is_deleted = 0"
    }

    private fun categoryExists(categoryId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_CATEGORY_EXISTS)
        statement.setString(1, categoryId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun dishInUse(dishId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_DISH_IN_USE)
        statement.setString(1, dishId)
        val resultSet = statement.executeQuery()
        if (resultSet.next()) {
            return resultSet.getInt("count") > 0
        }
        return false
    }

    private fun mapResultSetToDish(resultSet: java.sql.ResultSet): Dish =
        Dish(
            id = resultSet.getString("id"),
            name = resultSet.getString("name"),
            price = resultSet.getDouble("price"), // CORREGIDO: era getFloat
            category_id = resultSet.getString("category_id"),
        )

    suspend fun addDish(dish: Dish): String? {
        // Verificar que la categoría existe
        if (!categoryExists(dish.category_id)) {
            logger.error("Category does not exist: ${dish.category_id}")
            return null
        }

        // Validar datos
        if (dish.name.isBlank()) {
            logger.error("Dish name cannot be blank")
            return null
        }

        if (dish.price <= 0) {
            logger.error("Dish price must be greater than 0")
            return null
        }

        val generatedId =
            java.util.UUID
                .randomUUID()
                .toString()
        val statement = connection.prepareStatement(ADD_DISH)

        statement.setString(1, generatedId)
        statement.setString(2, dish.name)
        statement.setDouble(3, dish.price) // CORREGIDO: era setFloat
        statement.setString(4, dish.category_id)

        val rowsAffected = statement.executeUpdate()

        return if (rowsAffected > 0) {
            logger.info("Dish created successfully with ID: $generatedId")
            generatedId
        } else {
            logger.error("Failed to create dish")
            null
        }
    }

    suspend fun getDishes(): List<Dish> {
        val statement = connection.prepareStatement(GET_DISHES)
        val resultSet = statement.executeQuery()
        val dishes = mutableListOf<Dish>()
        while (resultSet.next()) {
            dishes.add(mapResultSetToDish(resultSet))
        }
        logger.info("Retrieved ${dishes.size} dishes")
        return dishes
    }

    suspend fun getDishById(id: String): Dish? {
        val statement = connection.prepareStatement(GET_DISH_BY_ID)
        statement.setString(1, id)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) {
            mapResultSetToDish(resultSet)
        } else {
            logger.warn("Dish not found with ID: $id")
            null
        }
    }

    suspend fun getDishesByCategory(categoryId: String): List<Dish> {
        val statement = connection.prepareStatement(GET_DISHES_BY_CATEGORY)
        statement.setString(1, categoryId)
        val resultSet = statement.executeQuery()
        val dishes = mutableListOf<Dish>()
        while (resultSet.next()) {
            dishes.add(mapResultSetToDish(resultSet))
        }
        logger.info("Retrieved ${dishes.size} dishes for category: $categoryId")
        return dishes
    }

    suspend fun updateDish(dish: Dish): Boolean {
        if (dish.id == null) {
            logger.error("Cannot update dish: ID is null")
            return false
        }

        // Verificar que la categoría existe
        if (!categoryExists(dish.category_id)) {
            logger.error("Category does not exist: ${dish.category_id}")
            return false
        }

        // Validar datos
        if (dish.name.isBlank()) {
            logger.error("Dish name cannot be blank")
            return false
        }

        if (dish.price <= 0) {
            logger.error("Dish price must be greater than 0")
            return false
        }

        val statement = connection.prepareStatement(UPDATE_DISH)
        statement.setString(1, dish.name)
        statement.setDouble(2, dish.price) // CORREGIDO: era setFloat
        statement.setString(3, dish.category_id)
        statement.setString(4, dish.id)

        val rowsUpdated = statement.executeUpdate()
        if (rowsUpdated > 0) {
            logger.info("Dish updated successfully: ${dish.id}")
        } else {
            logger.error("Failed to update dish: ${dish.id}")
        }
        return rowsUpdated > 0
    }

    suspend fun deleteDish(id: String): Boolean {
        // Verificar que el plato no esté siendo usado en órdenes
        if (dishInUse(id)) {
            logger.error("Cannot delete dish $id: it's being used in orders")
            return false
        }

        val statement = connection.prepareStatement(DELETE_DISH)
        statement.setString(1, id)
        val rowsDeleted = statement.executeUpdate()

        if (rowsDeleted > 0) {
            logger.info("Dish soft-deleted successfully: $id")
        } else {
            logger.error("Failed to delete dish: $id")
        }
        return rowsDeleted > 0
    }
}
