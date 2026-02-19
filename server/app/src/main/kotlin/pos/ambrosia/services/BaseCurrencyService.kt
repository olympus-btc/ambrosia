package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.BaseCurrencyResponse
import java.sql.Connection

class BaseCurrencyService(
    private val connection: Connection,
) {
    fun getBaseCurrency(): BaseCurrencyResponse? {
        val query =
            """
            SELECT c.id, c.acronym, c.name, c.symbol, c.country_name, c.country_code
            FROM base_currency b
            JOIN currency c ON c.id = b.currency_id
            WHERE b.id = 1
            """.trimIndent()

        connection.prepareStatement(query).use { statement ->
            val resultSet = statement.executeQuery()
            return if (resultSet.next()) {
                BaseCurrencyResponse(
                    currency_id = resultSet.getString("id"),
                    id = resultSet.getString("id"),
                    acronym = resultSet.getString("acronym"),
                    name = resultSet.getString("name"),
                    symbol = resultSet.getString("symbol"),
                    country_name = resultSet.getString("country_name"),
                    country_code = resultSet.getString("country_code"),
                )
            } else {
                logger.error("Base currency not found")
                null
            }
        }
    }
}
