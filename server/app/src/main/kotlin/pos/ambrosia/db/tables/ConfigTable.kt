package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.dao.id.IntIdTable
import org.jetbrains.exposed.v1.dao.IntEntity
import org.jetbrains.exposed.v1.dao.IntEntityClass

object ConfigTable : IntIdTable("config") {
    val businessType = varchar("business_type", 20).default("restaurant")
    val businessName = varchar("business_name", 255)
    val businessAddress = text("business_address").nullable()
    val businessPhone = varchar("business_phone", 50).nullable()
    val businessEmail = varchar("business_email", 255).nullable()
    val businessTaxId = varchar("business_tax_id", 100).nullable()
    val businessLogoUrl = text("business_logo_url").nullable()
    val businessTypeConfirmed = bool("business_type_confirmed").default(false)
}

class ConfigEntity(
    id: EntityID<Int>,
) : IntEntity(id) {
    companion object : IntEntityClass<ConfigEntity>(ConfigTable)

    var businessType by ConfigTable.businessType
    var businessName by ConfigTable.businessName
    var businessAddress by ConfigTable.businessAddress
    var businessPhone by ConfigTable.businessPhone
    var businessEmail by ConfigTable.businessEmail
    var businessTaxId by ConfigTable.businessTaxId
    var businessLogoUrl by ConfigTable.businessLogoUrl
    var businessTypeConfirmed by ConfigTable.businessTypeConfirmed
}
