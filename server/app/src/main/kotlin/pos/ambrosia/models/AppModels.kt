package pos.ambrosia.models

import kotlinx.serialization.SerialName
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
    val roleId: String? = null,
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
    val userId: String,
    val name: String,
    val email: String? = null,
    val phone: String? = null,
    val role: String,
    val roleId: String? = null,
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
data class WalletErrorResponse(
    val message: String,
    val code: String,
    val source: String,
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
    val roleId: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val isAdmin: Boolean? = false,
)

@Serializable
data class UpdateUserRequest(
    val name: String? = null,
    val pin: String? = null,
    val refreshToken: String? = null,
    val roleId: String? = null,
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
    val spaceId: String,
    val orderId: String? = null,
)

@Serializable
data class Dish(
    val id: String? = null,
    val name: String,
    val price: Double,
    val categoryId: String,
)

@Serializable
data class Ingredient(
    val id: String? = null,
    val name: String,
    val categoryId: String,
    val quantity: Double,
    val unit: String,
    val lowStockThreshold: Double,
    val costPerUnit: Double,
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
    val userId: String,
    val tableId: String? = null,
    val status: String,
    val total: Double,
    val createdAt: String,
)

@Serializable
data class OrderItem(
    val productName: String,
    val quantity: Int,
    val priceAtOrder: Int,
)

@Serializable
data class OrderWithPayment(
    val id: String,
    val userId: String,
    val userName: String? = null,
    val tableId: String? = null,
    val status: String,
    val total: Double,
    val createdAt: String,
    val paymentMethod: String? = null,
    val paymentMethodIds: List<String> = emptyList(),
    val satoshiAmount: Long? = null,
    val exchangeRateAtPayment: Double? = null,
    val exchangeRateCurrency: String? = null,
    val fiatAmountAtPayment: Double? = null,
    val paymentHash: String? = null,
    val items: List<OrderItem> = emptyList(),
)

data class OrderWithPaymentFilters(
    val startDate: String? = null,
    val endDate: String? = null,
    val status: String? = null,
    val userId: String? = null,
    val paymentMethod: String? = null,
    val minTotal: Double? = null,
    val maxTotal: Double? = null,
    val sortBy: String? = null,
    val sortOrder: String? = null,
)

@Serializable
data class OrderDish(
    val id: String? = null,
    val orderId: String,
    val dishId: String,
    val priceAtOrder: Double,
    val notes: String? = null,
    val status: String,
    val shouldPrepare: Boolean,
)

@Serializable
data class AddOrderDishRequest(
    val dishId: String,
    val priceAtOrder: Double,
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
    val methodId: String,
    val currencyId: String,
    val transactionId: String? = null,
    val amount: Double,
)

@Serializable data class PaymentMethod(
    val id: String? = null,
    val name: String,
)

@Serializable
data class Ticket(
    val id: String? = null,
    val orderId: String,
    val userId: String,
    val ticketDate: String,
    val status: Int,
    val totalAmount: Double,
    val notes: String,
)

@Serializable data class Currency(
    val id: String? = null,
    val acronym: String,
    val name: String? = null,
    val symbol: String? = null,
    val countryName: String? = null,
    val countryCode: String? = null,
)

@Serializable
data class BaseCurrencyResponse(
    val currencyId: String? = null,
    val id: String? = null,
    val acronym: String? = null,
    val name: String? = null,
    val symbol: String? = null,
    val countryName: String? = null,
    val countryCode: String? = null,
)

@Serializable data class TicketPayment(
    val paymentId: String,
    val ticketId: String,
)

@Serializable
data class Shift(
    val id: String? = null,
    val userId: String,
    val shiftDate: String,
    val startTime: String,
    val endTime: String? = null,
    val notes: String,
    val initialAmount: Double = 0.0,
    val finalAmount: Double? = null,
    val difference: Double? = null,
)

@Serializable
data class CloseShiftRequest(
    val finalAmount: Double? = null,
    val difference: Double? = null,
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
    BAR,
}

@Serializable
data class PrinterConfig(
    val id: String,
    val printerType: PrinterType,
    val printerName: String,
    val templateName: String? = null,
    val isDefault: Boolean = false,
    val enabled: Boolean = true,
    val createdAt: String? = null,
)

@Serializable
data class PrinterConfigCreateRequest(
    val printerType: PrinterType,
    val printerName: String,
    val templateName: String? = null,
    val isDefault: Boolean = false,
    val enabled: Boolean = true,
)

@Serializable
data class PrinterConfigUpdateRequest(
    val printerType: PrinterType? = null,
    val printerName: String? = null,
    val templateName: String? = null,
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
data class ProductOptionValue(
    val id: String? = null,
    val optionTypeId: String? = null,
    val value: String,
    val displayOrder: Int = 0,
)

@Serializable
data class ProductOptionType(
    val id: String? = null,
    val productId: String? = null,
    val name: String,
    val displayOrder: Int = 0,
    val values: List<ProductOptionValue> = emptyList(),
)

@Serializable
data class ProductVariant(
    val id: String? = null,
    val productId: String? = null,
    val SKU: String? = null,
    val priceCents: Int,
    val costCents: Int? = null,
    val quantity: Int = 0,
    val isActive: Boolean = true,
    val imageUrl: String? = null,
    val optionValueIds: List<String> = emptyList(),
)

@Serializable
data class UpsertVariantRequest(
    val SKU: String? = null,
    val priceCents: Int,
    val costCents: Int? = null,
    val quantity: Int = 0,
    val isActive: Boolean = true,
    val imageUrl: String? = null,
    val optionValueIds: List<String> = emptyList(),
)

@Serializable
data class UpsertOptionTypeRequest(
    val name: String,
    val displayOrder: Int = 0,
    val values: List<UpsertOptionValueRequest> = emptyList(),
)

@Serializable
data class UpsertOptionValueRequest(
    val value: String,
    val displayOrder: Int = 0,
)

@Serializable
data class Product(
    val id: String? = null,
    val SKU: String? = null,
    val name: String,
    val description: String? = null,
    val imageUrl: String? = null,
    val priceCents: Int = 0,
    val maxPriceCents: Int = 0,
    val quantity: Int = 0,
    val minStockThreshold: Int = 0,
    val maxStockThreshold: Int = 0,
    val hasVariants: Boolean = false,
    val categoryIds: List<String> = emptyList(),
    val options: List<ProductOptionType> = emptyList(),
    val variants: List<ProductVariant> = emptyList(),
)

@Serializable
data class ProductStockAdjustment(
    val productId: String,
    val variantId: String? = null,
    val quantity: Int,
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

@Serializable
data class CreateStoreOrderItemRequest(
    val productId: String,
    val variantId: String? = null,
    val quantity: Int,
)

@Serializable
data class CreateStoreOrderRequest(
    val items: List<CreateStoreOrderItemRequest>,
)

@Serializable
data class StoreOrderItem(
    val productId: String,
    val variantId: String? = null,
    val quantity: Int,
    val priceAtOrder: Int,
)

@Serializable
data class StoreOrder(
    val id: String,
    val userId: String,
    val userName: String? = null,
    val status: String,
    val total: Int,
    val createdAt: String,
    val items: List<StoreOrderItem>,
)

@Serializable
data class StoreCheckoutItem(
    val productId: String,
    val variantId: String? = null,
    val quantity: Int,
    val priceAtOrder: Int,
)

@Serializable
data class StoreCheckoutRequest(
    val userId: String,
    val items: List<StoreCheckoutItem>,
    val paymentMethodId: String,
    val currencyId: String,
    val amount: Double,
    val transactionId: String? = null,
    val ticketNotes: String = "",
    val satoshiAmount: Long? = null,
    val exchangeRateAtPayment: Double? = null,
    val paymentHash: String? = null,
    val exchangeRateCurrency: String? = null,
    val fiatAmountAtPayment: Double? = null,
    val discountAmount: Double = 0.0,
)

@Serializable
data class StoreCheckoutResponse(
    val orderId: String,
    val ticketId: String,
    val paymentId: String,
)

@Serializable
data class ProductSaleItem(
    val orderId: String,
    val productName: String,
    val variantId: String? = null,
    val quantity: Int,
    val priceAtOrder: Int,
    val userName: String,
    val paymentMethod: String,
    val saleDate: String,
    val satoshiAmount: Long? = null,
    val exchangeRateAtPayment: Double? = null,
    val exchangeRateCurrency: String? = null,
    val fiatAmountAtPayment: Double? = null,
    val paymentId: String? = null,
)

@Serializable
data class ProductSalesReport(
    val totalRevenueCents: Long,
    val totalItemsSold: Int,
    val sales: List<ProductSaleItem>,
    val totalBtcSatoshis: Long = 0L,
)

@Serializable
data class OutgoingPaymentWithRate(
    val type: String,
    val subType: String,
    val paymentId: String,
    val paymentHash: String? = null,
    val txId: String? = null,
    val preimage: String? = null,
    val isPaid: Boolean,
    val sent: Long,
    val fees: Long,
    val invoice: String? = null,
    val description: String? = null,
    val completedAt: Long? = null,
    val createdAt: Long,
    val exchangeRateAtPayment: Double? = null,
    val exchangeRateCurrency: String? = null,
    val fiatAmountAtPayment: Double? = null,
)

data class WalletInvoiceRate(
    val paymentHash: String,
    val satoshiAmount: Long?,
    val exchangeRate: Double,
    val exchangeRateCurrency: String,
    val fiatAmount: Double?,
)

data class PaymentBitcoinData(
    val exchangeRateAtPayment: Double,
    val exchangeRateCurrency: String?,
    val fiatAmountAtPayment: Double?,
)

@Serializable
data class IncomingPaymentWithRate(
    val type: String,
    val subType: String,
    val paymentHash: String,
    val preimage: String? = null,
    val externalId: String? = null,
    val description: String? = null,
    val invoice: String? = null,
    val isPaid: Boolean,
    val isExpired: Boolean? = null,
    val requestedSat: Long? = null,
    val receivedSat: Long,
    val fees: Long,
    val payerKey: String? = null,
    val expiresAt: Long? = null,
    val completedAt: Long? = null,
    val createdAt: Long,
    val exchangeRateAtPayment: Double? = null,
    val exchangeRateCurrency: String? = null,
    val fiatAmountAtPayment: Double? = null,
)
