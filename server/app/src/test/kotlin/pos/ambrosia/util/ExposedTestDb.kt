package pos.ambrosia.util

import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.SchemaUtils
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.BaseCurrencyTable
import pos.ambrosia.db.tables.CategoriesTable
import pos.ambrosia.db.tables.CategoryEntity
import pos.ambrosia.db.tables.ConfigTable
import pos.ambrosia.db.tables.CurrencyEntity
import pos.ambrosia.db.tables.CurrencyTable
import pos.ambrosia.db.tables.DiningTableEntity
import pos.ambrosia.db.tables.DiningTablesTable
import pos.ambrosia.db.tables.DishEntity
import pos.ambrosia.db.tables.DishesTable
import pos.ambrosia.db.tables.IngredientEntity
import pos.ambrosia.db.tables.IngredientSuppliersTable
import pos.ambrosia.db.tables.IngredientsTable
import pos.ambrosia.db.tables.OrderDishEntity
import pos.ambrosia.db.tables.OrderEntity
import pos.ambrosia.db.tables.OrdersDishesTable
import pos.ambrosia.db.tables.OrdersTable
import pos.ambrosia.db.tables.PaymentEntity
import pos.ambrosia.db.tables.PaymentMethodEntity
import pos.ambrosia.db.tables.PaymentMethodsTable
import pos.ambrosia.db.tables.PaymentsTable
import pos.ambrosia.db.tables.PermissionEntity
import pos.ambrosia.db.tables.PermissionsTable
import pos.ambrosia.db.tables.RoleEntity
import pos.ambrosia.db.tables.RolePermissionsTable
import pos.ambrosia.db.tables.RolesTable
import pos.ambrosia.db.tables.SpaceEntity
import pos.ambrosia.db.tables.SpacesTable
import pos.ambrosia.db.tables.SupplierEntity
import pos.ambrosia.db.tables.SuppliersTable
import pos.ambrosia.db.tables.TicketEntity
import pos.ambrosia.db.tables.TicketPaymentsTable
import pos.ambrosia.db.tables.TicketsTable
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.db.tables.WalletInvoiceRatesTable
import java.io.File
import java.util.UUID

/** Helper for unit tests that exercise services backed by Exposed `transaction { }` blocks. */
object ExposedTestDb {
    fun connect(): File {
        val file = File.createTempFile("ambrosia-test", ".db")
        file.deleteOnExit()
        Database.connect("jdbc:sqlite:${file.absolutePath}", driver = "org.sqlite.JDBC")
        transaction {
            SchemaUtils.create(
                UsersTable,
                RolesTable,
                PermissionsTable,
                RolePermissionsTable,
                CategoriesTable,
                DishesTable,
                OrdersTable,
                OrdersDishesTable,
                CurrencyTable,
                BaseCurrencyTable,
                ConfigTable,
                WalletInvoiceRatesTable,
                SpacesTable,
                DiningTablesTable,
                SuppliersTable,
                IngredientsTable,
                IngredientSuppliersTable,
                PaymentMethodsTable,
                PaymentsTable,
                TicketsTable,
                TicketPaymentsTable,
            )
        }
        return file
    }

    fun cleanup(file: File) {
        transaction {
            SchemaUtils.drop(
                TicketPaymentsTable,
                TicketsTable,
                PaymentsTable,
                PaymentMethodsTable,
                IngredientSuppliersTable,
                IngredientsTable,
                SuppliersTable,
                DiningTablesTable,
                SpacesTable,
                WalletInvoiceRatesTable,
                ConfigTable,
                BaseCurrencyTable,
                CurrencyTable,
                OrdersDishesTable,
                OrdersTable,
                DishesTable,
                CategoriesTable,
                RolePermissionsTable,
                PermissionsTable,
                UsersTable,
                RolesTable,
            )
        }
        file.delete()
    }

    fun seedRole(
        role: String,
        isAdmin: Boolean = false,
    ): String =
        transaction {
            RoleEntity
                .new(UUID.randomUUID()) {
                    this.role = role
                    this.isAdmin = isAdmin
                }.id.value
                .toString()
        }

    fun seedUser(
        name: String,
        roleId: String? = null,
    ): String =
        transaction {
            UserEntity
                .new(UUID.randomUUID()) {
                    this.name = name
                    this.pin = "****"
                    this.roleId = roleId?.let { EntityID(UUID.fromString(it), RolesTable) }
                }.id.value
                .toString()
        }

    fun seedCategory(
        name: String = "Category",
        type: String = "dish",
    ): String =
        transaction {
            CategoryEntity
                .new(UUID.randomUUID()) {
                    this.name = name
                    this.type = type
                }.id.value
                .toString()
        }

    fun seedDish(
        name: String = "Dish",
        price: Double = 10.0,
        categoryId: String = seedCategory(),
    ): String =
        transaction {
            DishEntity
                .new(UUID.randomUUID()) {
                    this.name = name
                    this.price = price
                    this.categoryId = EntityID(UUID.fromString(categoryId), CategoriesTable)
                }.id.value
                .toString()
        }

    fun seedPermission(
        name: String,
        description: String? = null,
        enabled: Boolean = true,
    ): String =
        transaction {
            PermissionEntity
                .new(UUID.randomUUID()) {
                    this.name = name
                    this.description = description
                    this.enabled = enabled
                }.id.value
                .toString()
        }

    fun seedCurrency(
        acronym: String,
        name: String? = null,
        symbol: String? = null,
        countryName: String? = null,
        countryCode: String? = null,
    ): String =
        transaction {
            CurrencyEntity
                .new(UUID.randomUUID()) {
                    this.acronym = acronym
                    this.name = name
                    this.symbol = symbol
                    this.countryName = countryName
                    this.countryCode = countryCode
                }.id.value
                .toString()
        }

    fun seedSpace(name: String = "Patio"): String =
        transaction {
            SpaceEntity
                .new(UUID.randomUUID()) {
                    this.name = name
                }.id.value
                .toString()
        }

    fun seedDiningTable(
        name: String = "Table 1",
        spaceId: String = seedSpace(),
        status: String = "available",
    ): String =
        transaction {
            DiningTableEntity
                .new(UUID.randomUUID()) {
                    this.name = name
                    this.status = status
                    this.spaceId = EntityID(UUID.fromString(spaceId), SpacesTable)
                }.id.value
                .toString()
        }

    fun seedSupplier(
        name: String = "Supplier",
        contact: String? = null,
        phone: String? = null,
        email: String? = null,
        address: String? = null,
    ): String =
        transaction {
            SupplierEntity
                .new(UUID.randomUUID()) {
                    this.name = name
                    this.contact = contact
                    this.phone = phone
                    this.email = email
                    this.address = address
                }.id.value
                .toString()
        }

    fun seedIngredient(
        name: String = "Ingredient",
        categoryId: String = seedCategory(),
    ): String =
        transaction {
            IngredientEntity
                .new(UUID.randomUUID()) {
                    this.name = name
                    this.categoryId = EntityID(UUID.fromString(categoryId), CategoriesTable)
                }.id.value
                .toString()
        }

    fun seedOrderDish(
        orderId: String,
        dishId: String,
        priceAtOrder: Double = 10.0,
    ): String =
        transaction {
            OrderDishEntity
                .new(UUID.randomUUID()) {
                    this.orderId = EntityID(UUID.fromString(orderId), OrdersTable)
                    this.dishId = EntityID(UUID.fromString(dishId), DishesTable)
                    this.priceAtOrder = priceAtOrder
                }.id.value
                .toString()
        }

    fun seedIngredientSupplier(
        supplierId: String,
        ingredientId: String,
        date: String = "2024-01-01T00:00:00",
        totalCost: Double = 10.0,
        quantity: Double = 1.0,
    ) {
        transaction {
            IngredientSuppliersTable.insert {
                it[IngredientSuppliersTable.supplierId] = EntityID(UUID.fromString(supplierId), SuppliersTable)
                it[IngredientSuppliersTable.ingredientId] = EntityID(UUID.fromString(ingredientId), IngredientsTable)
                it[IngredientSuppliersTable.date] = date
                it[IngredientSuppliersTable.totalCost] = totalCost
                it[IngredientSuppliersTable.quantity] = quantity
            }
        }
    }

    fun seedOrder(userId: String): String =
        transaction {
            OrderEntity
                .new(UUID.randomUUID()) {
                    this.userId = EntityID(UUID.fromString(userId), UsersTable)
                    this.createdAt = "2024-01-01T00:00:00"
                }.id.value
                .toString()
        }

    fun seedPaymentMethod(name: String = "Cash"): String =
        transaction {
            PaymentMethodEntity
                .new(UUID.randomUUID()) {
                    this.name = name
                }.id.value
                .toString()
        }

    fun seedPayment(
        methodId: String = seedPaymentMethod(),
        currencyId: String = seedCurrency("USD"),
        transactionId: String = "txn-1",
        amount: Double = 10.0,
        paymentHash: String? = null,
        exchangeRateAtPayment: Double? = null,
        exchangeRateCurrency: String? = null,
        fiatAmountAtPayment: Double? = null,
    ): String =
        transaction {
            PaymentEntity
                .new(UUID.randomUUID()) {
                    this.methodId = EntityID(UUID.fromString(methodId), PaymentMethodsTable)
                    this.currencyId = EntityID(UUID.fromString(currencyId), CurrencyTable)
                    this.transactionId = transactionId
                    this.amount = amount
                    this.date = "2024-01-01T00:00:00"
                    this.paymentHash = paymentHash
                    this.exchangeRateAtPayment = exchangeRateAtPayment
                    this.exchangeRateCurrency = exchangeRateCurrency
                    this.fiatAmountAtPayment = fiatAmountAtPayment
                }.id.value
                .toString()
        }

    fun seedTicket(
        orderId: String,
        userId: String,
    ): String =
        transaction {
            TicketEntity
                .new(UUID.randomUUID()) {
                    this.orderId = EntityID(UUID.fromString(orderId), OrdersTable)
                    this.userId = EntityID(UUID.fromString(userId), UsersTable)
                    this.ticketDate = "2024-01-01T00:00:00"
                }.id.value
                .toString()
        }

    fun seedTicketPayment(
        paymentId: String,
        ticketId: String,
    ) {
        transaction {
            TicketPaymentsTable.insert {
                it[TicketPaymentsTable.paymentId] = EntityID(UUID.fromString(paymentId), PaymentsTable)
                it[TicketPaymentsTable.ticketId] = EntityID(UUID.fromString(ticketId), TicketsTable)
            }
        }
    }
}
