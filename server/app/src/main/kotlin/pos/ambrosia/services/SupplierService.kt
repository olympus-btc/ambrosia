package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.neq
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.IngredientSuppliersTable
import pos.ambrosia.db.tables.SupplierEntity
import pos.ambrosia.db.tables.SuppliersTable
import pos.ambrosia.logger
import pos.ambrosia.models.Supplier
import java.util.UUID

class SupplierService {
    private fun toModel(entity: SupplierEntity): Supplier =
        Supplier(
            id = entity.id.value.toString(),
            name = entity.name,
            contact = entity.contact ?: "",
            phone = entity.phone ?: "",
            email = entity.email ?: "",
            address = entity.address ?: "",
        )

    private fun supplierNameExists(supplierName: String): Boolean =
        !SupplierEntity.find { (SuppliersTable.name eq supplierName) and (SuppliersTable.isDeleted eq false) }.empty()

    private fun supplierNameExistsExcludingId(
        supplierName: String,
        excludeId: String,
    ): Boolean =
        !SupplierEntity
            .find {
                (SuppliersTable.name eq supplierName) and
                    (SuppliersTable.id neq EntityID(UUID.fromString(excludeId), SuppliersTable)) and
                    (SuppliersTable.isDeleted eq false)
            }.empty()

    private fun supplierInUse(supplierId: String): Boolean =
        !IngredientSuppliersTable
            .selectAll()
            .where { IngredientSuppliersTable.supplierId eq EntityID(UUID.fromString(supplierId), SuppliersTable) }
            .empty()

    fun addSupplier(supplier: Supplier): String? =
        transaction {
            if (supplierNameExists(supplier.name)) {
                logger.error("Supplier name already exists: ${supplier.name}")
                return@transaction null
            }

            val id =
                SupplierEntity
                    .new(UUID.randomUUID()) {
                        this.name = supplier.name
                        this.contact = supplier.contact
                        this.phone = supplier.phone
                        this.email = supplier.email
                        this.address = supplier.address
                    }.id.value
                    .toString()
            logger.info("Supplier created successfully with ID: $id")
            id
        }

    fun getSuppliers(): List<Supplier> =
        transaction {
            val suppliers = SupplierEntity.find { SuppliersTable.isDeleted eq false }.map { toModel(it) }
            logger.info("Retrieved ${suppliers.size} suppliers")
            suppliers
        }

    fun getSupplierById(id: String): Supplier? =
        transaction {
            val entity = SupplierEntity.findById(UUID.fromString(id))?.takeIf { !it.isDeleted }
            if (entity == null) {
                logger.warn("Supplier not found with ID: $id")
                null
            } else {
                toModel(entity)
            }
        }

    fun updateSupplier(supplier: Supplier): Boolean =
        transaction {
            if (supplier.id == null) {
                logger.error("Cannot update supplier: ID is null")
                return@transaction false
            }

            if (supplierNameExistsExcludingId(supplier.name, supplier.id)) {
                logger.error("Supplier name already exists: ${supplier.name}")
                return@transaction false
            }

            val entity = SupplierEntity.findById(UUID.fromString(supplier.id))
            if (entity == null) {
                logger.error("Failed to update supplier: ${supplier.id}")
                false
            } else {
                entity.name = supplier.name
                entity.contact = supplier.contact
                entity.phone = supplier.phone
                entity.email = supplier.email
                entity.address = supplier.address
                logger.info("Supplier updated successfully: ${supplier.id}")
                true
            }
        }

    fun deleteSupplier(id: String): Boolean =
        transaction {
            if (supplierInUse(id)) {
                logger.error("Cannot delete supplier $id: it has ingredient associations")
                return@transaction false
            }

            val entity = SupplierEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.error("Failed to delete supplier: $id")
                false
            } else {
                entity.isDeleted = true
                logger.info("Supplier soft-deleted successfully: $id")
                true
            }
        }
}
