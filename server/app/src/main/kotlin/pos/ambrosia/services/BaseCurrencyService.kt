package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.BaseCurrencyTable
import pos.ambrosia.db.tables.CurrencyTable
import pos.ambrosia.logger
import pos.ambrosia.models.BaseCurrencyResponse

class BaseCurrencyService {
    fun getBaseCurrency(): BaseCurrencyResponse? =
        transaction {
            (BaseCurrencyTable innerJoin CurrencyTable)
                .selectAll()
                .where { BaseCurrencyTable.id eq 1 }
                .firstOrNull()
                ?.let { row ->
                    val id = row[CurrencyTable.id].value.toString()
                    BaseCurrencyResponse(
                        currencyId = id,
                        id = id,
                        acronym = row[CurrencyTable.acronym],
                        name = row[CurrencyTable.name],
                        symbol = row[CurrencyTable.symbol],
                        countryName = row[CurrencyTable.countryName],
                        countryCode = row[CurrencyTable.countryCode],
                    )
                } ?: run {
                logger.error("Base currency not found")
                null
            }
        }
}
