package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.Supplier
import java.sql.Connection

class SupplierService(
    private val connection: Connection,
) {
    companion object {
        private const val ADD_SUPPLIER =
            "INSERT INTO suppliers (id, name, contact, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)"
        private const val GET_SUPPLIERS =
            "SELECT id, name, contact, phone, email, address FROM suppliers WHERE is_deleted = 0"
        private const val GET_SUPPLIER_BY_ID =
            "SELECT id, name, contact, phone, email, address FROM suppliers WHERE id = ? AND is_deleted = 0"
        private const val UPDATE_SUPPLIER =
            "UPDATE suppliers SET name = ?, contact = ?, phone = ?, email = ?, address = ? WHERE id = ?"
        private const val DELETE_SUPPLIER = "UPDATE suppliers SET is_deleted = 1 WHERE id = ?"
        private const val CHECK_SUPPLIER_NAME_EXISTS =
            "SELECT id FROM suppliers WHERE name = ? AND is_deleted = 0"
        private const val CHECK_SUPPLIER_IN_USE =
            "SELECT COUNT(*) as count FROM ingredient_suppliers WHERE id_supplier = ?"
    }

    private fun supplierNameExists(supplierName: String): Boolean {
        val statement = connection.prepareStatement(CHECK_SUPPLIER_NAME_EXISTS)
        statement.setString(1, supplierName)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun supplierNameExistsExcludingId(
        supplierName: String,
        excludeId: String,
    ): Boolean {
        val statement =
            connection.prepareStatement(
                "SELECT id FROM suppliers WHERE name = ? AND id != ? AND is_deleted = 0",
            )
        statement.setString(1, supplierName)
        statement.setString(2, excludeId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun supplierInUse(supplierId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_SUPPLIER_IN_USE)
        statement.setString(1, supplierId)
        val resultSet = statement.executeQuery()
        if (resultSet.next()) {
            return resultSet.getInt("count") > 0
        }
        return false
    }

    suspend fun addSupplier(supplier: Supplier): String? {
        // Verificar que el nombre del proveedor no exista ya
        if (supplierNameExists(supplier.name)) {
            logger.error("Supplier name already exists: ${supplier.name}")
            return null
        }

        val generatedId =
            java.util.UUID
                .randomUUID()
                .toString()
        val statement = connection.prepareStatement(ADD_SUPPLIER)

        statement.setString(1, generatedId)
        statement.setString(2, supplier.name)
        statement.setString(3, supplier.contact)
        statement.setString(4, supplier.phone)
        statement.setString(5, supplier.email)
        statement.setString(6, supplier.address)

        val rowsAffected = statement.executeUpdate()

        return if (rowsAffected > 0) {
            logger.info("Supplier created successfully with ID: $generatedId")
            generatedId
        } else {
            logger.error("Failed to create supplier")
            null
        }
    }

    suspend fun getSuppliers(): List<Supplier> {
        val statement = connection.prepareStatement(GET_SUPPLIERS)
        val resultSet = statement.executeQuery()
        val suppliers = mutableListOf<Supplier>()
        while (resultSet.next()) {
            val supplier =
                Supplier(
                    id = resultSet.getString("id"),
                    name = resultSet.getString("name"),
                    contact = resultSet.getString("contact"),
                    phone = resultSet.getString("phone"),
                    email = resultSet.getString("email"),
                    address = resultSet.getString("address"),
                )
            suppliers.add(supplier)
        }
        logger.info("Retrieved ${suppliers.size} suppliers")
        return suppliers
    }

    suspend fun getSupplierById(id: String): Supplier? {
        val statement = connection.prepareStatement(GET_SUPPLIER_BY_ID)
        statement.setString(1, id)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) {
            Supplier(
                id = resultSet.getString("id"),
                name = resultSet.getString("name"),
                contact = resultSet.getString("contact"),
                phone = resultSet.getString("phone"),
                email = resultSet.getString("email"),
                address = resultSet.getString("address"),
            )
        } else {
            logger.warn("Supplier not found with ID: $id")
            null
        }
    }

    suspend fun updateSupplier(supplier: Supplier): Boolean {
        if (supplier.id == null) {
            logger.error("Cannot update supplier: ID is null")
            return false
        }

        // Verificar que el nombre del proveedor no exista ya (excluyendo el proveedor actual)
        if (supplierNameExistsExcludingId(supplier.name, supplier.id)) {
            logger.error("Supplier name already exists: ${supplier.name}")
            return false
        }

        val statement = connection.prepareStatement(UPDATE_SUPPLIER)
        statement.setString(1, supplier.name)
        statement.setString(2, supplier.contact)
        statement.setString(3, supplier.phone)
        statement.setString(4, supplier.email)
        statement.setString(5, supplier.address)
        statement.setString(6, supplier.id)

        val rowsUpdated = statement.executeUpdate()
        if (rowsUpdated > 0) {
            logger.info("Supplier updated successfully: ${supplier.id}")
        } else {
            logger.error("Failed to update supplier: ${supplier.id}")
        }
        return rowsUpdated > 0
    }

    suspend fun deleteSupplier(id: String): Boolean {
        // Verificar que el proveedor no esté siendo usado en ingredient_suppliers
        if (supplierInUse(id)) {
            logger.error("Cannot delete supplier $id: it has ingredient associations")
            return false
        }

        val statement = connection.prepareStatement(DELETE_SUPPLIER)
        statement.setString(1, id)
        val rowsDeleted = statement.executeUpdate()

        if (rowsDeleted > 0) {
            logger.info("Supplier soft-deleted successfully: $id")
        } else {
            logger.error("Failed to delete supplier: $id")
        }
        return rowsDeleted > 0
    }
}
