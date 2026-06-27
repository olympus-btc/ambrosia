package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.less
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.CategoriesTable
import pos.ambrosia.db.tables.CategoryEntity
import pos.ambrosia.db.tables.DishesIngredientsTable
import pos.ambrosia.db.tables.IngredientEntity
import pos.ambrosia.db.tables.IngredientsTable
import pos.ambrosia.logger
import pos.ambrosia.models.Ingredient
import java.util.UUID

class IngredientService {
    private fun toModel(entity: IngredientEntity): Ingredient =
        Ingredient(
            id = entity.id.value.toString(),
            name = entity.name,
            categoryId = entity.categoryId.value.toString(),
            quantity = entity.quantity,
            unit = entity.unit,
            lowStockThreshold = entity.lowStockThreshold,
            costPerUnit = entity.costPerUnit,
        )

    private fun categoryExists(categoryId: String): Boolean {
        val entity = CategoryEntity.findById(UUID.fromString(categoryId)) ?: return false
        return entity.type == "ingredient" && !entity.isDeleted
    }

    private fun ingredientInUse(ingredientId: String): Boolean =
        !DishesIngredientsTable
            .selectAll()
            .where { DishesIngredientsTable.ingredientId eq EntityID(UUID.fromString(ingredientId), IngredientsTable) }
            .empty()

    fun addIngredient(ingredient: Ingredient): String? =
        transaction {
            if (!categoryExists(ingredient.categoryId)) {
                logger.error("Category does not exist: ${ingredient.categoryId}")
                return@transaction null
            }

            if (ingredient.name.isBlank()) {
                logger.error("Ingredient name cannot be blank")
                return@transaction null
            }

            if (ingredient.quantity < 0 ||
                ingredient.lowStockThreshold < 0 ||
                ingredient.costPerUnit < 0
            ) {
                logger.error("Quantity, threshold and cost cannot be negative")
                return@transaction null
            }

            val id =
                IngredientEntity
                    .new(UUID.randomUUID()) {
                        this.name = ingredient.name
                        this.categoryId = EntityID(UUID.fromString(ingredient.categoryId), CategoriesTable)
                        this.quantity = ingredient.quantity
                        this.unit = ingredient.unit
                        this.lowStockThreshold = ingredient.lowStockThreshold
                        this.costPerUnit = ingredient.costPerUnit
                    }.id.value
                    .toString()
            logger.info("Ingredient created successfully with ID: $id")
            id
        }

    fun getIngredients(): List<Ingredient> =
        transaction {
            val ingredients =
                IngredientEntity
                    .find { IngredientsTable.isDeleted eq false }
                    .map { toModel(it) }
            logger.info("Retrieved ${ingredients.size} ingredients")
            ingredients
        }

    fun getIngredientById(id: String): Ingredient? =
        transaction {
            val entity = IngredientEntity.findById(UUID.fromString(id))
            if (entity == null || entity.isDeleted) {
                logger.warn("Ingredient not found with ID: $id")
                null
            } else {
                toModel(entity)
            }
        }

    fun getIngredientsByCategory(categoryId: String): List<Ingredient> =
        transaction {
            val ingredients =
                IngredientEntity
                    .find {
                        (IngredientsTable.categoryId eq EntityID(UUID.fromString(categoryId), CategoriesTable)) and
                            (IngredientsTable.isDeleted eq false)
                    }.map { toModel(it) }
            logger.info("Retrieved ${ingredients.size} ingredients for category: $categoryId")
            ingredients
        }

    fun updateIngredient(ingredient: Ingredient): Boolean =
        transaction {
            if (ingredient.id == null) {
                logger.error("Cannot update ingredient: ID is null")
                return@transaction false
            }

            if (!categoryExists(ingredient.categoryId)) {
                logger.error("Category does not exist: ${ingredient.categoryId}")
                return@transaction false
            }

            if (ingredient.name.isBlank()) {
                logger.error("Ingredient name cannot be blank")
                return@transaction false
            }

            if (ingredient.quantity < 0 ||
                ingredient.lowStockThreshold < 0 ||
                ingredient.costPerUnit < 0
            ) {
                logger.error("Quantity, threshold and cost cannot be negative")
                return@transaction false
            }

            val entity = IngredientEntity.findById(UUID.fromString(ingredient.id))
            if (entity == null) {
                logger.error("Failed to update ingredient: ${ingredient.id}")
                false
            } else {
                entity.name = ingredient.name
                entity.categoryId = EntityID(UUID.fromString(ingredient.categoryId), CategoriesTable)
                entity.quantity = ingredient.quantity
                entity.unit = ingredient.unit
                entity.lowStockThreshold = ingredient.lowStockThreshold
                entity.costPerUnit = ingredient.costPerUnit
                logger.info("Ingredient updated successfully: ${ingredient.id}")
                true
            }
        }

    fun deleteIngredient(id: String): Boolean =
        transaction {
            if (ingredientInUse(id)) {
                logger.error("Cannot delete ingredient $id: it's being used in dishes")
                return@transaction false
            }

            val entity = IngredientEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.error("Failed to delete ingredient: $id")
                false
            } else {
                entity.isDeleted = true
                logger.info("Ingredient soft-deleted successfully: $id")
                true
            }
        }

    fun getLowStockIngredients(): List<Ingredient> =
        transaction {
            val lowStockIngredients =
                IngredientEntity
                    .find { (IngredientsTable.quantity less IngredientsTable.lowStockThreshold) and (IngredientsTable.isDeleted eq false) }
                    .map { toModel(it) }
            logger.info("Retrieved ${lowStockIngredients.size} low stock ingredients")
            lowStockIngredients
        }

    fun updateIngredientQuantity(
        id: String,
        newQuantity: Double,
    ): Boolean =
        transaction {
            if (newQuantity < 0) {
                logger.error("Quantity cannot be negative")
                return@transaction false
            }

            val entity = IngredientEntity.findById(UUID.fromString(id))
            if (entity == null || entity.isDeleted) {
                logger.error("Failed to update ingredient quantity: $id")
                false
            } else {
                entity.quantity = newQuantity
                logger.info("Ingredient quantity updated: $id -> $newQuantity")
                true
            }
        }
}
