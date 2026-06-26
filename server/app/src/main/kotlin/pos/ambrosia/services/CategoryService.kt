package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.neq
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.CategoriesTable
import pos.ambrosia.db.tables.CategoryEntity
import pos.ambrosia.db.tables.ProductCategoriesTable
import pos.ambrosia.logger
import pos.ambrosia.models.CategoryItem
import java.util.UUID

class CategoryService {
    private val validTypes = setOf("dish", "ingredient", "product")

    private fun validateType(type: String): Boolean = validTypes.contains(type)

    private fun nameExists(
        name: String,
        type: String,
        excludeId: String? = null,
    ): Boolean =
        !CategoriesTable
            .selectAll()
            .where {
                val condition = (CategoriesTable.name eq name) and (CategoriesTable.type eq type) and (CategoriesTable.isDeleted eq false)
                if (excludeId != null) {
                    condition and (CategoriesTable.id neq EntityID(UUID.fromString(excludeId), CategoriesTable))
                } else {
                    condition
                }
            }.empty()

    fun addCategory(
        type: String,
        category: CategoryItem,
    ): String? =
        transaction {
            if (!validateType(type)) return@transaction null
            if (category.name.isBlank()) return@transaction null
            if (nameExists(category.name, type)) return@transaction null

            val id =
                CategoryEntity
                    .new(UUID.randomUUID()) {
                        this.name = category.name
                        this.type = type
                    }.id.value
                    .toString()
            logger.info("Category created: $id type=$type")
            id
        }

    fun getCategories(type: String): List<CategoryItem>? =
        transaction {
            if (!validateType(type)) return@transaction null
            CategoryEntity
                .find { (CategoriesTable.type eq type) and (CategoriesTable.isDeleted eq false) }
                .map { CategoryItem(id = it.id.value.toString(), name = it.name) }
        }

    fun getCategoryById(
        id: String,
        type: String,
    ): CategoryItem? =
        transaction {
            if (!validateType(type)) return@transaction null
            val entity = CategoryEntity.findById(UUID.fromString(id))
            if (entity == null || entity.type != type || entity.isDeleted) {
                null
            } else {
                CategoryItem(id = entity.id.value.toString(), name = entity.name)
            }
        }

    fun updateCategory(
        type: String,
        category: CategoryItem,
    ): Boolean =
        transaction {
            if (!validateType(type)) return@transaction false
            if (category.id == null) return@transaction false
            if (category.name.isBlank()) return@transaction false
            if (nameExists(category.name, type, category.id)) return@transaction false

            val entity = CategoryEntity.findById(UUID.fromString(category.id))
            if (entity == null || entity.type != type) {
                false
            } else {
                entity.name = category.name
                logger.info("Category updated: ${category.id} type=$type")
                true
            }
        }

    fun deleteCategory(
        id: String,
        type: String,
    ): Boolean =
        transaction {
            if (!validateType(type)) return@transaction false

            ProductCategoriesTable.deleteWhere {
                ProductCategoriesTable.categoryId eq EntityID(UUID.fromString(id), CategoriesTable)
            }

            val entity = CategoryEntity.findById(UUID.fromString(id))
            if (entity == null || entity.type != type) {
                false
            } else {
                entity.name = "DELETED-$id"
                entity.isDeleted = true
                logger.info("Category deleted: $id type=$type")
                true
            }
        }
}
