package pos.ambrosia.utils

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
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
import pos.ambrosia.db.tables.DishesIngredientsTable
import pos.ambrosia.db.tables.DishesTable
import pos.ambrosia.db.tables.IngredientEntity
import pos.ambrosia.db.tables.IngredientSuppliersTable
import pos.ambrosia.db.tables.IngredientsTable
import pos.ambrosia.db.tables.OrderDishEntity
import pos.ambrosia.db.tables.OrderEntity
import pos.ambrosia.db.tables.OrderProductsTable
import pos.ambrosia.db.tables.OrdersDishesTable
import pos.ambrosia.db.tables.OrdersTable
import pos.ambrosia.db.tables.PaymentEntity
import pos.ambrosia.db.tables.PaymentMethodEntity
import pos.ambrosia.db.tables.PaymentMethodsTable
import pos.ambrosia.db.tables.PaymentsTable
import pos.ambrosia.db.tables.PermissionEntity
import pos.ambrosia.db.tables.PermissionsTable
import pos.ambrosia.db.tables.PrinterConfigEntity
import pos.ambrosia.db.tables.PrinterConfigsTable
import pos.ambrosia.db.tables.ProductCategoriesTable
import pos.ambrosia.db.tables.ProductEntity
import pos.ambrosia.db.tables.ProductOptionTypesTable
import pos.ambrosia.db.tables.ProductOptionValuesTable
import pos.ambrosia.db.tables.ProductVariantEntity
import pos.ambrosia.db.tables.ProductVariantsTable
import pos.ambrosia.db.tables.ProductsTable
import pos.ambrosia.db.tables.RoleEntity
import pos.ambrosia.db.tables.RolePermissionsTable
import pos.ambrosia.db.tables.RolesTable
import pos.ambrosia.db.tables.ShiftEntity
import pos.ambrosia.db.tables.ShiftsTable
import pos.ambrosia.db.tables.SpaceEntity
import pos.ambrosia.db.tables.SpacesTable
import pos.ambrosia.db.tables.SupplierEntity
import pos.ambrosia.db.tables.SuppliersTable
import pos.ambrosia.db.tables.TicketEntity
import pos.ambrosia.db.tables.TicketPaymentsTable
import pos.ambrosia.db.tables.TicketTemplateElementEntity
import pos.ambrosia.db.tables.TicketTemplateElementsTable
import pos.ambrosia.db.tables.TicketTemplateEntity
import pos.ambrosia.db.tables.TicketTemplatesTable
import pos.ambrosia.db.tables.TicketsDishTable
import pos.ambrosia.db.tables.TicketsTable
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.db.tables.VariantOptionValuesTable
import pos.ambrosia.db.tables.WalletInvoiceRatesTable
import java.io.File
import java.util.UUID

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
                TicketsDishTable,
                TicketPaymentsTable,
                ProductsTable,
                ProductCategoriesTable,
                ProductOptionTypesTable,
                ProductOptionValuesTable,
                ProductVariantsTable,
                VariantOptionValuesTable,
                DishesIngredientsTable,
                ShiftsTable,
                PrinterConfigsTable,
                TicketTemplatesTable,
                TicketTemplateElementsTable,
                OrderProductsTable,
            )
        }
        return file
    }

    fun cleanup(file: File) {
        transaction {
            SchemaUtils.drop(
                OrderProductsTable,
                TicketTemplateElementsTable,
                TicketTemplatesTable,
                PrinterConfigsTable,
                ShiftsTable,
                DishesIngredientsTable,
                VariantOptionValuesTable,
                ProductVariantsTable,
                ProductOptionValuesTable,
                ProductOptionTypesTable,
                ProductCategoriesTable,
                ProductsTable,
                TicketPaymentsTable,
                TicketsDishTable,
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
                .find { RolesTable.role eq role }
                .firstOrNull()
                ?.id
                ?.value
                ?.toString()
                ?: RoleEntity
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
                .find { UsersTable.name eq name }
                .firstOrNull()
                ?.id
                ?.value
                ?.toString()
                ?: UserEntity
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
                .find { (CategoriesTable.type eq type) and (CategoriesTable.name eq name) }
                .firstOrNull()
                ?.id
                ?.value
                ?.toString()
                ?: CategoryEntity
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
                .find { CurrencyTable.acronym eq acronym }
                .firstOrNull()
                ?.id
                ?.value
                ?.toString()
                ?: CurrencyEntity
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

    fun seedOrder(
        userId: String,
        createdAt: String = "2024-01-01T00:00:00",
        status: String = "open",
        total: Double = 0.0,
        tableId: String? = null,
    ): String =
        transaction {
            OrderEntity
                .new(UUID.randomUUID()) {
                    this.userId = EntityID(UUID.fromString(userId), UsersTable)
                    this.createdAt = createdAt
                    this.status = status
                    this.total = total
                    this.tableId = tableId
                }.id.value
                .toString()
        }

    fun seedOrderProduct(
        orderId: String,
        productId: String,
        variantId: String? = null,
        quantity: Int = 1,
        priceAtOrder: Int,
    ) {
        transaction {
            OrderProductsTable.insert {
                it[OrderProductsTable.orderId] = EntityID(UUID.fromString(orderId), OrdersTable)
                it[OrderProductsTable.productId] = EntityID(UUID.fromString(productId), ProductsTable)
                it[OrderProductsTable.variantId] = variantId
                it[OrderProductsTable.quantity] = quantity
                it[OrderProductsTable.priceAtOrder] = priceAtOrder
            }
        }
    }

    fun seedPaymentMethod(name: String = "Cash"): String =
        transaction {
            PaymentMethodEntity
                .find { PaymentMethodsTable.name eq name }
                .firstOrNull()
                ?.id
                ?.value
                ?.toString()
                ?: PaymentMethodEntity
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
        satoshiAmount: Long? = null,
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
                    this.satoshiAmount = satoshiAmount
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

    fun seedProduct(
        name: String = "Product",
        sku: String? = null,
        description: String? = null,
        imageUrl: String? = null,
        quantity: Int = 1,
        minStockThreshold: Int = 0,
        maxStockThreshold: Int = 0,
        hasVariants: Boolean = false,
        isDeleted: Boolean = false,
        priceCents: Int = 200,
        costCents: Int? = null,
    ): String =
        transaction {
            val productId =
                ProductEntity
                    .new(UUID.randomUUID()) {
                        this.name = name
                        this.sku = sku
                        this.description = description
                        this.imageUrl = imageUrl
                        this.minStockThreshold = minStockThreshold
                        this.maxStockThreshold = maxStockThreshold
                        this.hasVariants = hasVariants
                        this.isDeleted = isDeleted
                    }.id.value
            ProductVariantEntity.new(UUID.randomUUID()) {
                this.productId = EntityID(productId, ProductsTable)
                this.priceCents = priceCents
                this.costCents = costCents
                this.quantity = quantity
                this.isActive = true
            }
            productId.toString()
        }

    fun seedProductCategory(
        productId: String,
        categoryId: String,
    ) {
        transaction {
            ProductCategoriesTable.insert {
                it[ProductCategoriesTable.productId] = EntityID(UUID.fromString(productId), ProductsTable)
                it[ProductCategoriesTable.categoryId] = EntityID(UUID.fromString(categoryId), CategoriesTable)
            }
        }
    }

    fun seedShift(
        userId: String,
        shiftDate: String = "2024-01-01",
        startTime: String = "08:00:00",
        endTime: String? = null,
        notes: String = "",
        initialAmount: Double = 0.0,
    ): String =
        transaction {
            ShiftEntity
                .new(UUID.randomUUID()) {
                    this.userId = EntityID(UUID.fromString(userId), UsersTable)
                    this.shiftDate = shiftDate
                    this.startTime = startTime
                    this.endTime = endTime
                    this.notes = notes
                    this.initialAmount = initialAmount
                }.id.value
                .toString()
        }

    fun seedDishIngredient(
        dishId: String,
        ingredientId: String,
        quantity: Double = 1.0,
    ) {
        transaction {
            DishesIngredientsTable.insert {
                it[DishesIngredientsTable.dishId] = EntityID(UUID.fromString(dishId), DishesTable)
                it[DishesIngredientsTable.ingredientId] = EntityID(UUID.fromString(ingredientId), IngredientsTable)
                it[DishesIngredientsTable.quantity] = quantity
            }
        }
    }

    fun seedPrinterConfig(
        printerType: String = "KITCHEN",
        printerName: String = "Printer 1",
        templateName: String? = null,
        isDefault: Boolean = false,
        enabled: Boolean = true,
        createdAt: String = "2024-01-01T00:00:00",
    ): String =
        transaction {
            PrinterConfigEntity
                .new(UUID.randomUUID()) {
                    this.printerType = printerType
                    this.printerName = printerName
                    this.templateName = templateName
                    this.isDefault = isDefault
                    this.enabled = enabled
                    this.createdAt = createdAt
                }.id.value
                .toString()
        }

    fun seedTicketTemplate(name: String = "Template"): String =
        transaction {
            TicketTemplateEntity
                .new(UUID.randomUUID()) {
                    this.name = name
                }.id.value
                .toString()
        }

    fun seedTicketTemplateElement(
        templateId: String,
        order: Int = 0,
        type: String = "TEXT",
        value: String = "Hello",
    ) {
        transaction {
            TicketTemplateElementEntity.new(UUID.randomUUID()) {
                this.templateId = EntityID(UUID.fromString(templateId), TicketTemplatesTable)
                this.elementOrder = order
                this.type = type
                this.value = value
            }
        }
    }
}
