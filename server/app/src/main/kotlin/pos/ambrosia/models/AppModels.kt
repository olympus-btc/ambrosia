package pos.ambrosia.models

import kotlinx.serialization.Serializable

@Serializable data class AuthRequest(
  val name: String,
  val pin: String,
)

@Serializable
data class AuthResponse(
  val id: String,
  val name: String,
  val refreshToken: String? = null,
  val role: String,
  val role_id: String? = null,
  val isAdmin: Boolean,
  val email: String? = null,
  val phone: String? = null,
)

@Serializable data class TokenResponse(
  val accessToken: String,
  val refreshToken: String,
)

@Serializable
data class UserResponse(
  val user_id: String,
  val name: String,
  val email: String? = null,
  val phone: String? = null,
  val role: String,
  val role_id: String? = null,
  val isAdmin: Boolean,
)

@Serializable
data class LoginResponse(
  val message: String,
  val user: UserResponse,
  val perms: List<Permission>,
)

@Serializable data class UserMeResponse(
  val user: UserResponse,
  val perms: List<Permission>,
)

@Serializable data class Message(
  val message: String,
)

@Serializable
data class WalletAuthResponse(
  val message: String,
  val walletTokenExpiresAt: Long,
)

@Serializable
data class User(
  val id: String? = null,
  val name: String,
  val pin: String,
  val refreshToken: String? = null,
  val role: String? = null,
  val role_id: String? = null,
  val email: String? = null,
  val phone: String? = null,
  val isAdmin: Boolean? = false,
)

@Serializable
data class UpdateUserRequest(
  val name: String? = null,
  val pin: String? = null,
  val refreshToken: String? = null,
  val role_id: String? = null,
  val email: String? = null,
  val phone: String? = null,
)

@Serializable
data class Role(
  val id: String? = null,
  val role: String,
  val password: String? = null,
  val isAdmin: Boolean? = false,
)

@Serializable data class Space(
  val id: String? = null,
  val name: String,
)

@Serializable
data class Table(
  val id: String? = null,
  val name: String,
  val status: String? = null,
  val space_id: String,
  val order_id: String? = null,
)

@Serializable
data class Dish(
  val id: String? = null,
  val name: String,
  val price: Double,
  val category_id: String,
)

@Serializable
data class Ingredient(
  val id: String? = null,
  val name: String,
  val category_id: String,
  val quantity: Double,
  val unit: String,
  val low_stock_threshold: Double,
  val cost_per_unit: Double,
)

@Serializable
data class Supplier(
  val id: String? = null,
  val name: String,
  val contact: String,
  val phone: String,
  val email: String,
  val address: String,
)

@Serializable
data class Order(
  val id: String? = null,
  val user_id: String,
  val table_id: String? = null,
  val waiter: String,
  val status: String,
  val total: Double,
  val created_at: String,
)

@Serializable
data class OrderWithPayment(
  val id: String,
  val user_id: String,
  val table_id: String? = null,
  val waiter: String? = null,
  val status: String,
  val total: Double,
  val created_at: String,
  val payment_method: String? = null,
  val payment_method_ids: List<String> = emptyList(),
)

@Serializable
data class OrderDish(
  val id: String? = null,
  val order_id: String,
  val dish_id: String,
  val price_at_order: Double,
  val notes: String? = null,
  val status: String,
  val should_prepare: Boolean,
)

@Serializable
data class AddOrderDishRequest(
  val dish_id: String,
  val price_at_order: Double,
  val notes: String? = null,
)

data class CompleteOrder(
  val order: Order,
  val dishes: List<OrderDish>,
)

data class OrderWithDishesRequest(
  val order: Order,
  val dishes: List<OrderDish>,
)

@Serializable
data class Payment(
  val id: String? = null,
  val method_id: String,
  val currency_id: String,
  val transaction_id: String? = null,
  val amount: Double,
)

@Serializable data class PaymentMethod(
  val id: String? = null,
  val name: String,
)

@Serializable
data class Ticket(
  val id: String? = null,
  val order_id: String,
  val user_id: String,
  val ticket_date: String,
  val status: Int,
  val total_amount: Double,
  val notes: String,
)

@Serializable data class Currency(
  val id: String? = null,
  val acronym: String,
  val name: String? = null,
  val symbol: String? = null,
  val country_name: String? = null,
  val country_code: String? = null,
)

@Serializable
data class BaseCurrencyResponse(
  val currency_id: String? = null,
  val id: String? = null,
  val acronym: String? = null,
  val name: String? = null,
  val symbol: String? = null,
  val country_name: String? = null,
  val country_code: String? = null,
)

@Serializable data class TicketPayment(
  val payment_id: String,
  val ticket_id: String,
)

@Serializable
data class Shift(
  val id: String? = null,
  val user_id: String,
  val shift_date: String,
  val start_time: String,
  val end_time: String? = null,
  val notes: String,
)

@Serializable data class RolePassword(
  val password: String,
)

@Serializable
data class Permission(
  val id: String? = null,
  val name: String,
  val description: String? = null,
  val enabled: Boolean = true,
)

@Serializable data class RolePermissionsUpdateRequest(
  val permissions: List<String>,
)

@Serializable data class RolePermissionsUpdateResult(
  val roleId: String,
  val assigned: Int,
)

enum class PrinterType {
  KITCHEN,
  CUSTOMER,
  BAR
}

@Serializable
data class PrinterConfig(
  val id: String,
  val printerType: PrinterType,
  val printerName: String,
  val isDefault: Boolean = false,
  val enabled: Boolean = true,
  val createdAt: String? = null,
)

@Serializable
data class PrinterConfigCreateRequest(
  val printerType: PrinterType,
  val printerName: String,
  val isDefault: Boolean = false,
  val enabled: Boolean = true,
)

@Serializable
data class PrinterConfigUpdateRequest(
  val printerType: PrinterType? = null,
  val printerName: String? = null,
  val isDefault: Boolean? = null,
  val enabled: Boolean? = null,
)

@Serializable data class SetPrinterRequest(
  val printerType: PrinterType,
  val printerName: String,
)

@Serializable
data class Config(
  val id: Int = 1,
  val businessType: String = "restaurant",
  val businessName: String,
  val businessAddress: String?,
  val businessPhone: String?,
  val businessEmail: String?,
  val businessTaxId: String?,
  val businessLogoUrl: String?,
  val businessTypeConfirmed: Boolean = false,
)

@Serializable
data class Product(
  val id: String? = null,
  val SKU: String,
  val name: String,
  val description: String? = null,
  val image_url: String? = null,
  val cost_cents: Int,
  val category_id: String,
  val quantity: Int,
  val price_cents: Int,
)

@Serializable data class CategoryItem(
  val id: String? = null,
  val name: String,
)

@Serializable data class CategoryUpsert(
  val name: String,
  val type: String? = null,
)

@Serializable
data class InitialSetupRequest(
  val businessType: String? = null,
  val userName: String? = null,
  val userPassword: String? = null,
  val userPin: String? = null,
  val businessName: String? = null,
  val businessAddress: String? = null,
  val businessPhone: String? = null,
  val businessEmail: String? = null,
  val businessRFC: String? = null,
  val businessTaxId: String? = null,
  val businessCurrency: String? = null,
  val businessLogo: String? = null,
  val businessLogoUrl: String? = null,
)

@Serializable
data class InitialSetupStatus(
  val initialized: Boolean,
  val needsBusinessType: Boolean = false,
)

@Serializable
data class SetBaseCurrencyRequest(
  val acronym: String,
)
