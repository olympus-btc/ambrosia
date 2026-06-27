package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.CategoriesTable
import pos.ambrosia.db.tables.CategoryEntity
import pos.ambrosia.db.tables.DishEntity
import pos.ambrosia.db.tables.DishesTable
import pos.ambrosia.db.tables.OrdersDishesTable
import pos.ambrosia.logger
import pos.ambrosia.models.Dish
import java.util.UUID

class DishService {
    private fun toModel(entity: DishEntity): Dish =
        Dish(
            id = entity.id.value.toString(),
            name = entity.name,
            price = entity.price,
            categoryId = entity.categoryId.value.toString(),
        )

    private fun categoryExists(categoryId: String): Boolean =
        !CategoryEntity
            .find {
                (CategoriesTable.id eq EntityID(UUID.fromString(categoryId), CategoriesTable)) and
                    (CategoriesTable.type eq "dish") and
                    (CategoriesTable.isDeleted eq false)
            }.empty()

    private fun dishInUse(dishId: String): Boolean =
        !OrdersDishesTable
            .selectAll()
            .where { OrdersDishesTable.dishId eq EntityID(UUID.fromString(dishId), DishesTable) }
            .empty()

    fun addDish(dish: Dish): String? =
        transaction {
            if (!categoryExists(dish.categoryId)) {
                logger.error("Category does not exist: ${dish.categoryId}")
                return@transaction null
            }

            if (dish.name.isBlank()) {
                logger.error("Dish name cannot be blank")
                return@transaction null
            }

            if (dish.price <= 0) {
                logger.error("Dish price must be greater than 0")
                return@transaction null
            }

            val id =
                DishEntity
                    .new(UUID.randomUUID()) {
                        this.name = dish.name
                        this.price = dish.price
                        this.categoryId = EntityID(UUID.fromString(dish.categoryId), CategoriesTable)
                    }.id.value
                    .toString()
            logger.info("Dish created successfully with ID: $id")
            id
        }

    fun getDishes(): List<Dish> =
        transaction {
            val dishes = DishEntity.find { DishesTable.isDeleted eq false }.map { toModel(it) }
            logger.info("Retrieved ${dishes.size} dishes")
            dishes
        }

    fun getDishById(id: String): Dish? =
        transaction {
            val entity = DishEntity.findById(UUID.fromString(id))?.takeIf { !it.isDeleted }
            if (entity == null) {
                logger.warn("Dish not found with ID: $id")
                null
            } else {
                toModel(entity)
            }
        }

    fun getDishesByCategory(categoryId: String): List<Dish> =
        transaction {
            val dishes =
                DishEntity
                    .find {
                        (DishesTable.categoryId eq EntityID(UUID.fromString(categoryId), CategoriesTable)) and
                            (DishesTable.isDeleted eq false)
                    }.map { toModel(it) }
            logger.info("Retrieved ${dishes.size} dishes for category: $categoryId")
            dishes
        }

    fun updateDish(dish: Dish): Boolean =
        transaction {
            if (dish.id == null) {
                logger.error("Cannot update dish: ID is null")
                return@transaction false
            }

            if (!categoryExists(dish.categoryId)) {
                logger.error("Category does not exist: ${dish.categoryId}")
                return@transaction false
            }

            if (dish.name.isBlank()) {
                logger.error("Dish name cannot be blank")
                return@transaction false
            }

            if (dish.price <= 0) {
                logger.error("Dish price must be greater than 0")
                return@transaction false
            }

            val entity = DishEntity.findById(UUID.fromString(dish.id))
            if (entity == null) {
                logger.error("Failed to update dish: ${dish.id}")
                false
            } else {
                entity.name = dish.name
                entity.price = dish.price
                entity.categoryId = EntityID(UUID.fromString(dish.categoryId), CategoriesTable)
                logger.info("Dish updated successfully: ${dish.id}")
                true
            }
        }

    fun deleteDish(id: String): Boolean =
        transaction {
            if (dishInUse(id)) {
                logger.error("Cannot delete dish $id: it's being used in orders")
                return@transaction false
            }

            val entity = DishEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.error("Failed to delete dish: $id")
                false
            } else {
                entity.isDeleted = true
                logger.info("Dish soft-deleted successfully: $id")
                true
            }
        }
}
