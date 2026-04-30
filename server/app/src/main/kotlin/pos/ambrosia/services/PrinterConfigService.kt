package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.PrinterConfig
import pos.ambrosia.models.PrinterConfigCreateRequest
import pos.ambrosia.models.PrinterConfigUpdateRequest
import pos.ambrosia.models.PrinterType
import pos.ambrosia.util.executeInTransaction
import pos.ambrosia.util.toBytes
import pos.ambrosia.util.toUUID
import java.sql.Connection
import java.sql.ResultSet
import java.util.UUID

enum class PrinterConfigUpdateStatus {
    UPDATED,
    NOT_FOUND,
    CONFLICT,
}

open class PrinterConfigService(
    private val connection: Connection,
) {
    companion object {
        private const val ADD_PRINTER_CONFIG = """
      INSERT INTO printer_configs (id, printer_type, printer_name, template_name, is_default, enabled)
      VALUES (?, ?, ?, ?, ?, ?)
    """
        private const val GET_PRINTER_CONFIGS =
            "SELECT id, printer_type, printer_name, template_name, is_default, enabled, created_at FROM printer_configs"
        private const val GET_PRINTER_CONFIG_BY_ID =
            "SELECT id, printer_type, printer_name, template_name, is_default, enabled, created_at FROM printer_configs WHERE id = ?"
        private const val GET_PRINTER_CONFIG_BY_TYPE_NAME =
            "SELECT id, printer_type, printer_name, template_name, is_default, enabled, created_at FROM printer_configs WHERE printer_type = ? AND printer_name = ?"
        private const val GET_DEFAULT_BY_TYPE =
            "SELECT id, printer_type, printer_name, template_name, is_default, enabled, created_at FROM printer_configs WHERE printer_type = ? AND is_default = 1 AND enabled = 1 LIMIT 1"
        private const val GET_ENABLED_BY_TYPE =
            "SELECT id, printer_type, printer_name, template_name, is_default, enabled, created_at FROM printer_configs WHERE printer_type = ? AND enabled = 1"
        private const val UPDATE_PRINTER_CONFIG = """
      UPDATE printer_configs
      SET printer_type = ?, printer_name = ?, template_name = ?, is_default = ?, enabled = ?
      WHERE id = ?
    """
        private const val DELETE_PRINTER_CONFIG = "DELETE FROM printer_configs WHERE id = ?"
        private const val CLEAR_DEFAULT_FOR_TYPE =
            "UPDATE printer_configs SET is_default = 0 WHERE printer_type = ? AND is_default = 1"
        private const val CHECK_CONFIG_EXISTS =
            "SELECT id FROM printer_configs WHERE printer_type = ? AND printer_name = ?"
        private const val CHECK_CONFIG_EXISTS_EXCLUDING_ID =
            "SELECT id FROM printer_configs WHERE printer_type = ? AND printer_name = ? AND id != ?"
        private const val SET_DEFAULT_BY_ID = "UPDATE printer_configs SET is_default = 1 WHERE id = ?"
    }

    private fun configExists(
        printerType: PrinterType,
        printerName: String,
    ): Boolean {
        connection.prepareStatement(CHECK_CONFIG_EXISTS).use { statement ->
            statement.setString(1, printerType.name)
            statement.setString(2, printerName)
            val resultSet = statement.executeQuery()
            return resultSet.next()
        }
    }

    private fun configExistsExcludingId(
        printerType: PrinterType,
        printerName: String,
        excludeId: UUID,
    ): Boolean {
        connection.prepareStatement(CHECK_CONFIG_EXISTS_EXCLUDING_ID).use { statement ->
            statement.setString(1, printerType.name)
            statement.setString(2, printerName)
            statement.setBytes(3, excludeId.toBytes())
            val resultSet = statement.executeQuery()
            return resultSet.next()
        }
    }

    private fun clearDefaultForType(printerType: PrinterType) {
        connection.prepareStatement(CLEAR_DEFAULT_FOR_TYPE).use { statement ->
            statement.setString(1, printerType.name)
            statement.executeUpdate()
        }
    }

    suspend fun createPrinterConfig(request: PrinterConfigCreateRequest): String? {
        if (configExists(request.printerType, request.printerName)) {
            logger.error("Printer config already exists: ${request.printerType} ${request.printerName}")
            return null
        }

        val configId = UUID.randomUUID()
        return executeInTransaction(connection) {
            if (request.isDefault) {
                clearDefaultForType(request.printerType)
            }

            connection.prepareStatement(ADD_PRINTER_CONFIG).use { statement ->
                statement.setBytes(1, configId.toBytes())
                statement.setString(2, request.printerType.name)
                statement.setString(3, request.printerName)
                statement.setString(4, request.templateName)
                statement.setBoolean(5, request.isDefault)
                statement.setBoolean(6, request.enabled)
                statement.executeUpdate()
            }

            logger.info("Printer config created: ${request.printerType} ${request.printerName}")
            configId.toString()
        }
    }

    suspend fun upsertDefaultByTypeName(
        printerType: PrinterType,
        printerName: String,
    ): String? =
        executeInTransaction(connection) {
            clearDefaultForType(printerType)

            val existing = getPrinterConfigByTypeName(printerType, printerName)
            if (existing != null) {
                connection.prepareStatement(UPDATE_PRINTER_CONFIG).use { statement ->
                    statement.setString(1, existing.printerType.name)
                    statement.setString(2, existing.printerName)
                    statement.setString(3, existing.templateName)
                    statement.setBoolean(4, true)
                    statement.setBoolean(5, true)
                    statement.setBytes(6, UUID.fromString(existing.id).toBytes())
                    statement.executeUpdate()
                }
                existing.id
            } else {
                val configId = UUID.randomUUID()
                connection.prepareStatement(ADD_PRINTER_CONFIG).use { statement ->
                    statement.setBytes(1, configId.toBytes())
                    statement.setString(2, printerType.name)
                    statement.setString(3, printerName)
                    statement.setString(4, null)
                    statement.setBoolean(5, true)
                    statement.setBoolean(6, true)
                    statement.executeUpdate()
                }
                configId.toString()
            }
        }

    suspend fun getPrinterConfigs(): List<PrinterConfig> {
        connection.createStatement().use { statement ->
            val resultSet = statement.executeQuery(GET_PRINTER_CONFIGS)
            val configs = mutableListOf<PrinterConfig>()
            while (resultSet.next()) {
                configs.add(mapPrinterConfig(resultSet))
            }
            return configs
        }
    }

    suspend fun getPrinterConfigById(id: String): PrinterConfig? {
        val uuid =
            try {
                UUID.fromString(id)
            } catch (e: IllegalArgumentException) {
                logger.error("Invalid UUID format for printer config ID: $id")
                return null
            }

        connection.prepareStatement(GET_PRINTER_CONFIG_BY_ID).use { statement ->
            statement.setBytes(1, uuid.toBytes())
            val resultSet = statement.executeQuery()
            return if (resultSet.next()) {
                mapPrinterConfig(resultSet)
            } else {
                null
            }
        }
    }

    private fun getPrinterConfigByTypeName(
        printerType: PrinterType,
        printerName: String,
    ): PrinterConfig? {
        connection.prepareStatement(GET_PRINTER_CONFIG_BY_TYPE_NAME).use { statement ->
            statement.setString(1, printerType.name)
            statement.setString(2, printerName)
            val resultSet = statement.executeQuery()
            return if (resultSet.next()) {
                mapPrinterConfig(resultSet)
            } else {
                null
            }
        }
    }

    open suspend fun getDefaultByType(printerType: PrinterType): PrinterConfig? {
        connection.prepareStatement(GET_DEFAULT_BY_TYPE).use { statement ->
            statement.setString(1, printerType.name)
            val resultSet = statement.executeQuery()
            return if (resultSet.next()) {
                mapPrinterConfig(resultSet)
            } else {
                null
            }
        }
    }

    open suspend fun getEnabledByType(printerType: PrinterType): List<PrinterConfig> {
        connection.prepareStatement(GET_ENABLED_BY_TYPE).use { statement ->
            statement.setString(1, printerType.name)
            val resultSet = statement.executeQuery()
            val configs = mutableListOf<PrinterConfig>()
            while (resultSet.next()) {
                configs.add(mapPrinterConfig(resultSet))
            }
            return configs
        }
    }

    suspend fun updatePrinterConfig(
        id: String,
        request: PrinterConfigUpdateRequest,
    ): PrinterConfigUpdateStatus {
        val configId =
            try {
                UUID.fromString(id)
            } catch (e: IllegalArgumentException) {
                logger.error("Invalid UUID format for printer config ID: $id")
                return PrinterConfigUpdateStatus.NOT_FOUND
            }

        val existing = getPrinterConfigById(id) ?: return PrinterConfigUpdateStatus.NOT_FOUND
        val newType = request.printerType ?: existing.printerType
        val newName = request.printerName ?: existing.printerName
        val newTemplateName = request.templateName ?: existing.templateName
        val newDefault = request.isDefault ?: existing.isDefault
        val newEnabled = request.enabled ?: existing.enabled

        if (configExistsExcludingId(newType, newName, configId)) {
            logger.error("Printer config already exists: $newType $newName")
            return PrinterConfigUpdateStatus.CONFLICT
        }

        val result =
            executeInTransaction(connection) {
                if (newDefault) {
                    clearDefaultForType(newType)
                }

                connection.prepareStatement(UPDATE_PRINTER_CONFIG).use { statement ->
                    statement.setString(1, newType.name)
                    statement.setString(2, newName)
                    statement.setString(3, newTemplateName)
                    statement.setBoolean(4, newDefault)
                    statement.setBoolean(5, newEnabled)
                    statement.setBytes(6, configId.toBytes())
                    statement.executeUpdate()
                }

                PrinterConfigUpdateStatus.UPDATED
            }

        return result ?: PrinterConfigUpdateStatus.CONFLICT
    }

    suspend fun deletePrinterConfig(id: String): Boolean {
        val configId =
            try {
                UUID.fromString(id)
            } catch (e: IllegalArgumentException) {
                logger.error("Invalid UUID format for printer config ID: $id")
                return false
            }

        connection.prepareStatement(DELETE_PRINTER_CONFIG).use { statement ->
            statement.setBytes(1, configId.toBytes())
            return statement.executeUpdate() > 0
        }
    }

    suspend fun setDefault(id: String): Boolean {
        val config = getPrinterConfigById(id) ?: return false
        return executeInTransaction(connection) {
            clearDefaultForType(config.printerType)
            connection.prepareStatement(SET_DEFAULT_BY_ID).use { statement ->
                statement.setBytes(1, UUID.fromString(id).toBytes())
                statement.executeUpdate()
            }
            true
        } ?: false
    }

    private fun mapPrinterConfig(resultSet: ResultSet): PrinterConfig =
        PrinterConfig(
            id = resultSet.getBytes("id").toUUID().toString(),
            printerType = PrinterType.valueOf(resultSet.getString("printer_type")),
            printerName = resultSet.getString("printer_name"),
            templateName = resultSet.getString("template_name"),
            isDefault = resultSet.getBoolean("is_default"),
            enabled = resultSet.getBoolean("enabled"),
            createdAt = resultSet.getString("created_at"),
        )
}
