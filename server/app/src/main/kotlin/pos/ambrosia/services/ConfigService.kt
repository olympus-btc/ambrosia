package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.Config
import java.sql.Connection

class ConfigService(
    private val connection: Connection,
) {
    companion object {
        private const val GET_CONFIG = """
            SELECT id, business_type, business_name, business_address, business_phone, business_email, business_tax_id, business_logo_url, business_type_confirmed FROM config WHERE id = 1
        """
        private const val UPDATE_CONFIG = """
            INSERT OR REPLACE INTO config (id, business_type, business_name, business_address, business_phone, business_email, business_tax_id, business_logo_url, business_type_confirmed) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
        """
    }

    suspend fun getConfig(): Config? {
        val statement = connection.prepareStatement(GET_CONFIG)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) {
            Config(
                id = resultSet.getInt("id"),
                businessType = resultSet.getString("business_type"),
                businessName = resultSet.getString("business_name"),
                businessAddress = resultSet.getString("business_address"),
                businessPhone = resultSet.getString("business_phone"),
                businessEmail = resultSet.getString("business_email"),
                businessTaxId = resultSet.getString("business_tax_id"),
                businessLogoUrl = resultSet.getString("business_logo_url"),
                businessTypeConfirmed = resultSet.getBoolean("business_type_confirmed"),
            )
        } else {
            logger.warn("Config not found")
            null
        }
    }

    suspend fun updateConfig(config: Config): Boolean {
        val statement = connection.prepareStatement(UPDATE_CONFIG)
        statement.setString(1, config.businessType)
        statement.setString(2, config.businessName)
        statement.setString(3, config.businessAddress)
        statement.setString(4, config.businessPhone)
        statement.setString(5, config.businessEmail)
        statement.setString(6, config.businessTaxId)
        statement.setString(7, config.businessLogoUrl)
        statement.setBoolean(8, config.businessTypeConfirmed)

        val rowsUpdated = statement.executeUpdate()
        if (rowsUpdated > 0) {
            logger.info("Config updated successfully")
        } else {
            logger.error("Failed to update config")
        }
        return rowsUpdated > 0
    }
}
