package pos.ambrosia.db.tables

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.dao.id.IntIdTable
import org.jetbrains.exposed.v1.dao.IntEntity
import org.jetbrains.exposed.v1.dao.IntEntityClass

object ConfigTable : IntIdTable("config") {
    val businessType = varchar("business_type", 20).default("restaurant")
    val businessName = varchar("business_name", 255)
    val businessProfession = varchar("business_profession", 255).nullable()
    val businessAddress = text("business_address").nullable()
    val businessPhone = varchar("business_phone", 50).nullable()
    val businessEmail = varchar("business_email", 255).nullable()
    val businessTaxId = varchar("business_tax_id", 100).nullable()
    val businessLogoUrl = text("business_logo_url").nullable()
    val businessTypeConfirmed = bool("business_type_confirmed").default(false)
    val timezone = varchar("timezone", 50).default("America/Mexico_City")
    val tipsEnabled = bool("tips_enabled").default(true)
    val tipPercentages = varchar("tip_percentages", 50).default("10,15,20")
    val customTipDefaultType = text("custom_tip_default_type").default("percentage")
    val priceStep = double("price_step").default(0.01)
}

class ConfigEntity(
    id: EntityID<Int>,
) : IntEntity(id) {
    companion object : IntEntityClass<ConfigEntity>(ConfigTable)

    var businessType by ConfigTable.businessType
    var businessName by ConfigTable.businessName
    var businessProfession by ConfigTable.businessProfession
    var businessAddress by ConfigTable.businessAddress
    var businessPhone by ConfigTable.businessPhone
    var businessEmail by ConfigTable.businessEmail
    var businessTaxId by ConfigTable.businessTaxId
    var businessLogoUrl by ConfigTable.businessLogoUrl
    var businessTypeConfirmed by ConfigTable.businessTypeConfirmed
    var timezone by ConfigTable.timezone
    var tipsEnabled by ConfigTable.tipsEnabled
    var tipPercentages by ConfigTable.tipPercentages
    var customTipDefaultType by ConfigTable.customTipDefaultType
    var priceStep by ConfigTable.priceStep
}
