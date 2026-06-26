package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.dao.java.UUIDEntity
import org.jetbrains.exposed.v1.dao.java.UUIDEntityClass
import pos.ambrosia.db.SQLiteUUIDTable
import java.util.UUID

object SuppliersTable : SQLiteUUIDTable("suppliers") {
    val name = varchar("name", 255).uniqueIndex()
    val contact = varchar("contact", 255).nullable()
    val phone = varchar("phone", 50).nullable()
    val email = varchar("email", 255).nullable()
    val address = text("address").nullable()
    val isDeleted = bool("is_deleted").default(false)
}

class SupplierEntity(
    id: EntityID<UUID>,
) : UUIDEntity(id) {
    companion object : UUIDEntityClass<SupplierEntity>(SuppliersTable)

    var name by SuppliersTable.name
    var contact by SuppliersTable.contact
    var phone by SuppliersTable.phone
    var email by SuppliersTable.email
    var address by SuppliersTable.address
    var isDeleted by SuppliersTable.isDeleted
}

object IngredientSuppliersTable : Table("ingredient_suppliers") {
    val supplierId = reference("id_supplier", SuppliersTable)
    val ingredientId = reference("id_ingredient", IngredientsTable)
    val date = varchar("date", 50)
    val totalCost = double("total_cost")
    val quantity = double("quantity")
    override val primaryKey = PrimaryKey(supplierId, ingredientId, date)
}
