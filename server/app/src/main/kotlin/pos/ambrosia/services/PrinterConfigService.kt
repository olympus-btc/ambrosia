package pos.ambrosia.services

import java.sql.Connection
import java.sql.ResultSet
import java.util.UUID
import pos.ambrosia.logger
import pos.ambrosia.models.PrinterConfig
import pos.ambrosia.models.PrinterConfigCreateRequest
import pos.ambrosia.models.PrinterConfigUpdateRequest
import pos.ambrosia.models.PrinterType

enum class PrinterConfigUpdateStatus {
  UPDATED,
  NOT_FOUND,
  CONFLICT
}

open class PrinterConfigService(private val connection: Connection) {
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

  private fun configExists(printerType: PrinterType, printerName: String): Boolean {
    connection.prepareStatement(CHECK_CONFIG_EXISTS).use { stmt ->
      stmt.setString(1, printerType.name)
      stmt.setString(2, printerName)
      val rs = stmt.executeQuery()
      return rs.next()
    }
  }

  private fun configExistsExcludingId(
      printerType: PrinterType,
      printerName: String,
      excludeId: UUID
  ): Boolean {
    connection.prepareStatement(CHECK_CONFIG_EXISTS_EXCLUDING_ID).use { stmt ->
      stmt.setString(1, printerType.name)
      stmt.setString(2, printerName)
      stmt.setBytes(3, excludeId.toBytes())
      val rs = stmt.executeQuery()
      return rs.next()
    }
  }

  private fun clearDefaultForType(printerType: PrinterType) {
    connection.prepareStatement(CLEAR_DEFAULT_FOR_TYPE).use { stmt ->
      stmt.setString(1, printerType.name)
      stmt.executeUpdate()
    }
  }

  suspend fun createPrinterConfig(request: PrinterConfigCreateRequest): String? {
    if (configExists(request.printerType, request.printerName)) {
      logger.error("Printer config already exists: ${request.printerType} ${request.printerName}")
      return null
    }

    val configId = UUID.randomUUID()
    connection.autoCommit = false
    try {
      if (request.isDefault) {
        clearDefaultForType(request.printerType)
      }

      connection.prepareStatement(ADD_PRINTER_CONFIG).use { stmt ->
        stmt.setBytes(1, configId.toBytes())
        stmt.setString(2, request.printerType.name)
        stmt.setString(3, request.printerName)
        stmt.setString(4, request.templateName)
        stmt.setBoolean(5, request.isDefault)
        stmt.setBoolean(6, request.enabled)
        stmt.executeUpdate()
      }

      connection.commit()
      logger.info("Printer config created: ${request.printerType} ${request.printerName}")
      return configId.toString()
    } catch (e: Exception) {
      connection.rollback()
      logger.error("Failed to create printer config: ${e.message}")
      return null
    } finally {
      connection.autoCommit = true
    }
  }

  suspend fun upsertDefaultByTypeName(printerType: PrinterType, printerName: String): String? {
    connection.autoCommit = false
    try {
      clearDefaultForType(printerType)

      val existing = getPrinterConfigByTypeName(printerType, printerName)
      if (existing != null) {
        connection.prepareStatement(UPDATE_PRINTER_CONFIG).use { stmt ->
          stmt.setString(1, existing.printerType.name)
          stmt.setString(2, existing.printerName)
          stmt.setString(3, existing.templateName)
          stmt.setBoolean(4, true)
          stmt.setBoolean(5, true)
          stmt.setBytes(6, UUID.fromString(existing.id).toBytes())
          stmt.executeUpdate()
        }
        connection.commit()
        return existing.id
      }

      val configId = UUID.randomUUID()
      connection.prepareStatement(ADD_PRINTER_CONFIG).use { stmt ->
        stmt.setBytes(1, configId.toBytes())
        stmt.setString(2, printerType.name)
        stmt.setString(3, printerName)
        stmt.setString(4, null)
        stmt.setBoolean(5, true)
        stmt.setBoolean(6, true)
        stmt.executeUpdate()
      }
      connection.commit()
      return configId.toString()
    } catch (e: Exception) {
      connection.rollback()
      logger.error("Failed to upsert default printer config: ${e.message}")
      return null
    } finally {
      connection.autoCommit = true
    }
  }

  suspend fun getPrinterConfigs(): List<PrinterConfig> {
    connection.createStatement().use { stmt ->
      val rs = stmt.executeQuery(GET_PRINTER_CONFIGS)
      val configs = mutableListOf<PrinterConfig>()
      while (rs.next()) {
        configs.add(mapPrinterConfig(rs))
      }
      return configs
    }
  }

  suspend fun getPrinterConfigById(id: String): PrinterConfig? {
    val uuid = try {
      UUID.fromString(id)
    } catch (e: IllegalArgumentException) {
      logger.error("Invalid UUID format for printer config ID: $id")
      return null
    }

    connection.prepareStatement(GET_PRINTER_CONFIG_BY_ID).use { stmt ->
      stmt.setBytes(1, uuid.toBytes())
      val rs = stmt.executeQuery()
      return if (rs.next()) {
        mapPrinterConfig(rs)
      } else {
        null
      }
    }
  }

  private fun getPrinterConfigByTypeName(
      printerType: PrinterType,
      printerName: String
  ): PrinterConfig? {
    connection.prepareStatement(GET_PRINTER_CONFIG_BY_TYPE_NAME).use { stmt ->
      stmt.setString(1, printerType.name)
      stmt.setString(2, printerName)
      val rs = stmt.executeQuery()
      return if (rs.next()) {
        mapPrinterConfig(rs)
      } else {
        null
      }
    }
  }

  open suspend fun getDefaultByType(printerType: PrinterType): PrinterConfig? {
    connection.prepareStatement(GET_DEFAULT_BY_TYPE).use { stmt ->
      stmt.setString(1, printerType.name)
      val rs = stmt.executeQuery()
      return if (rs.next()) {
        mapPrinterConfig(rs)
      } else {
        null
      }
    }
  }

  open suspend fun getEnabledByType(printerType: PrinterType): List<PrinterConfig> {
    connection.prepareStatement(GET_ENABLED_BY_TYPE).use { stmt ->
      stmt.setString(1, printerType.name)
      val rs = stmt.executeQuery()
      val configs = mutableListOf<PrinterConfig>()
      while (rs.next()) {
        configs.add(mapPrinterConfig(rs))
      }
      return configs
    }
  }

  suspend fun updatePrinterConfig(
      id: String,
      request: PrinterConfigUpdateRequest
  ): PrinterConfigUpdateStatus {
    val configId = try {
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

    connection.autoCommit = false
    try {
      if (newDefault) {
        clearDefaultForType(newType)
      }

      connection.prepareStatement(UPDATE_PRINTER_CONFIG).use { stmt ->
        stmt.setString(1, newType.name)
        stmt.setString(2, newName)
        stmt.setString(3, newTemplateName)
        stmt.setBoolean(4, newDefault)
        stmt.setBoolean(5, newEnabled)
        stmt.setBytes(6, configId.toBytes())
        stmt.executeUpdate()
      }

      connection.commit()
      return PrinterConfigUpdateStatus.UPDATED
    } catch (e: Exception) {
      connection.rollback()
      logger.error("Failed to update printer config: ${e.message}")
      return PrinterConfigUpdateStatus.CONFLICT
    } finally {
      connection.autoCommit = true
    }
  }

  suspend fun deletePrinterConfig(id: String): Boolean {
    val configId = try {
      UUID.fromString(id)
    } catch (e: IllegalArgumentException) {
      logger.error("Invalid UUID format for printer config ID: $id")
      return false
    }

    connection.prepareStatement(DELETE_PRINTER_CONFIG).use { stmt ->
      stmt.setBytes(1, configId.toBytes())
      return stmt.executeUpdate() > 0
    }
  }

  suspend fun setDefault(id: String): Boolean {
    val config = getPrinterConfigById(id) ?: return false
    connection.autoCommit = false
    try {
      clearDefaultForType(config.printerType)
      connection.prepareStatement(SET_DEFAULT_BY_ID).use { stmt ->
        stmt.setBytes(1, UUID.fromString(id).toBytes())
        stmt.executeUpdate()
      }
      connection.commit()
      return true
    } catch (e: Exception) {
      connection.rollback()
      logger.error("Failed to set default printer config: ${e.message}")
      return false
    } finally {
      connection.autoCommit = true
    }
  }

  private fun mapPrinterConfig(rs: ResultSet): PrinterConfig {
    return PrinterConfig(
        id = rs.getBytes("id").toUUID().toString(),
        printerType = PrinterType.valueOf(rs.getString("printer_type")),
        printerName = rs.getString("printer_name"),
        templateName = rs.getString("template_name"),
        isDefault = rs.getBoolean("is_default"),
        enabled = rs.getBoolean("enabled"),
        createdAt = rs.getString("created_at")
    )
  }
}
