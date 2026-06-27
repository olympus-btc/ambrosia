package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.DishEntity
import pos.ambrosia.db.tables.OrderDishEntity
import pos.ambrosia.db.tables.OrderEntity
import pos.ambrosia.db.tables.OrdersDishesTable
import pos.ambrosia.logger
import pos.ambrosia.models.OrderDish
import java.util.UUID

class OrderDishService {
    private fun toModel(entity: OrderDishEntity): OrderDish =
        OrderDish(
            id = entity.id.value.toString(),
            orderId = entity.orderId.value.toString(),
            dishId = entity.dishId.value.toString(),
            priceAtOrder = entity.priceAtOrder,
            notes = entity.notes,
            status = entity.status,
            shouldPrepare = entity.shouldPrepare,
        )

    fun addOrderDish(orderDish: OrderDish): String? =
        transaction {
            val orderId = UUID.fromString(orderDish.orderId)
            val dishId = UUID.fromString(orderDish.dishId)

            val order =
                OrderEntity.findById(orderId)?.takeIf { !it.isDeleted } ?: run {
                    logger.error("Order does not exist: ${orderDish.orderId}")
                    return@transaction null
                }

            val dish =
                DishEntity.findById(dishId)?.takeIf { !it.isDeleted } ?: run {
                    logger.error("Dish does not exist: ${orderDish.dishId}")
                    return@transaction null
                }

            val created =
                OrderDishEntity.new(UUID.randomUUID()) {
                    this.orderId = order.id
                    this.dishId = dish.id
                    this.priceAtOrder = orderDish.priceAtOrder
                    this.notes = orderDish.notes
                    this.status = orderDish.status
                    this.shouldPrepare = orderDish.shouldPrepare
                }

            logger.info("OrderDish created successfully with ID: ${created.id.value}")
            created.id.value.toString()
        }

    fun getOrderDishesByOrderId(orderId: String): List<OrderDish> =
        transaction {
            val orderEntityId = EntityID(UUID.fromString(orderId), OrdersDishesTable)
            val orderDishes =
                OrderDishEntity
                    .find { OrdersDishesTable.orderId eq orderEntityId }
                    .map { toModel(it) }
            logger.info("Retrieved ${orderDishes.size} dishes for order: $orderId")
            orderDishes
        }

    fun getOrderDishById(id: String): OrderDish? =
        transaction {
            val orderDish = OrderDishEntity.findById(UUID.fromString(id))
            if (orderDish != null) {
                toModel(orderDish)
            } else {
                logger.warn("OrderDish not found with ID: $id")
                null
            }
        }

    fun updateOrderDish(orderDish: OrderDish): Boolean {
        val id = orderDish.id
        if (id == null) {
            logger.error("Cannot update order dish: ID is null")
            return false
        }

        return transaction {
            val entity = OrderDishEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.error("Failed to update order dish: $id")
                return@transaction false
            }

            entity.priceAtOrder = orderDish.priceAtOrder
            entity.notes = orderDish.notes
            entity.status = orderDish.status
            entity.shouldPrepare = orderDish.shouldPrepare

            logger.info("OrderDish updated successfully: $id")
            true
        }
    }

    fun deleteOrderDish(id: String): Boolean =
        transaction {
            val entity = OrderDishEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.error("Failed to delete order dish: $id")
                false
            } else {
                entity.delete()
                logger.info("OrderDish deleted successfully: $id")
                true
            }
        }

    fun deleteOrderDishesByOrderId(orderId: String): Boolean =
        transaction {
            val orderEntityId = EntityID(UUID.fromString(orderId), OrdersDishesTable)
            val dishes = OrderDishEntity.find { OrdersDishesTable.orderId eq orderEntityId }
            val count = dishes.count()
            dishes.forEach { it.delete() }

            if (count > 0) {
                logger.info("Deleted $count dishes for order: $orderId")
            } else {
                logger.info("No dishes found for order: $orderId")
            }
            true
        }
}
