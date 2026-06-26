package pos.ambrosia.services

import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.ConfigEntity
import pos.ambrosia.models.Config

class ConfigService {
    private fun toModel(entity: ConfigEntity): Config =
        Config(
            id = entity.id.value,
            businessType = entity.businessType,
            businessName = entity.businessName,
            businessAddress = entity.businessAddress,
            businessPhone = entity.businessPhone,
            businessEmail = entity.businessEmail,
            businessTaxId = entity.businessTaxId,
            businessLogoUrl = entity.businessLogoUrl,
            businessTypeConfirmed = entity.businessTypeConfirmed,
        )

    fun getConfig(): Config? =
        transaction {
            ConfigEntity.findById(1)?.let { toModel(it) }
        }

    fun updateConfig(config: Config): Boolean =
        transaction {
            val entity = ConfigEntity.findById(1) ?: ConfigEntity.new(1) {}
            entity.businessType = config.businessType
            entity.businessName = config.businessName
            entity.businessAddress = config.businessAddress
            entity.businessPhone = config.businessPhone
            entity.businessEmail = config.businessEmail
            entity.businessTaxId = config.businessTaxId
            entity.businessLogoUrl = config.businessLogoUrl
            entity.businessTypeConfirmed = config.businessTypeConfirmed
            true
        }
}
