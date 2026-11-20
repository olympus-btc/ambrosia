package pos.ambrosia.utest

import pos.ambrosia.models.AddOrderDishRequest
import pos.ambrosia.models.AdminNotificationPreferenceUpdateRequest
import pos.ambrosia.models.AuthRequest
import pos.ambrosia.models.CategoryItem
import pos.ambrosia.models.CategoryUpsert
import pos.ambrosia.models.Config
import pos.ambrosia.models.CreateFreelanceInvoiceRequest
import pos.ambrosia.models.CreateTimeEntryRequest
import pos.ambrosia.models.Dish
import pos.ambrosia.models.FreelanceClient
import pos.ambrosia.models.FreelanceClientUpsert
import pos.ambrosia.models.FreelanceProject
import pos.ambrosia.models.FreelanceProjectUpsert
import pos.ambrosia.models.FreelanceTask
import pos.ambrosia.models.FreelanceTaskUpsert
import pos.ambrosia.models.Ingredient
import pos.ambrosia.models.InitialSetupRequest
import pos.ambrosia.models.OrderDish
import pos.ambrosia.models.PayoutAccount
import pos.ambrosia.models.PayoutAccountUpsert
import pos.ambrosia.models.Permission
import pos.ambrosia.models.PrinterConfigCreateRequest
import pos.ambrosia.models.PrinterConfigUpdateRequest
import pos.ambrosia.models.PrinterType
import pos.ambrosia.models.Role
import pos.ambrosia.models.SetPrinterRequest
import pos.ambrosia.models.Shift
import pos.ambrosia.models.Space
import pos.ambrosia.models.StoreCheckoutRequest
import pos.ambrosia.models.Supplier
import pos.ambrosia.models.Table
import pos.ambrosia.models.Ticket
import pos.ambrosia.models.UpdateTimeEntryRequest
import pos.ambrosia.models.UpdateUserRequest
import pos.ambrosia.models.UpsertRoleRequest
import pos.ambrosia.models.User
import pos.ambrosia.models.WebPushKeys
import pos.ambrosia.models.WebPushSubscriptionRequest
import pos.ambrosia.models.WebPushUnsubscribeRequest
import pos.ambrosia.utils.RequestValidationException
import kotlin.test.Test
import kotlin.test.assertFailsWith

class AppModelsValidationTest {
    @Test
    fun `rejects AuthRequest fields over their configured length limit`() {
        val validAuthRequest = AuthRequest(name = "Alice", pin = "1234")

        assertFailsWith<RequestValidationException> { validAuthRequest.copy(name = "x".repeat(256)) }
    }

    @Test
    fun `rejects User fields over their configured length limit`() {
        val validUser = User(name = "Alice", pin = "1234")

        assertFailsWith<RequestValidationException> { validUser.copy(name = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validUser.copy(email = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validUser.copy(phone = "x".repeat(51)) }
    }

    @Test
    fun `rejects UpdateUserRequest fields over their configured length limit`() {
        val validUpdateUserRequest = UpdateUserRequest()

        assertFailsWith<RequestValidationException> { validUpdateUserRequest.copy(name = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validUpdateUserRequest.copy(email = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validUpdateUserRequest.copy(phone = "x".repeat(51)) }
    }

    @Test
    fun `rejects Role fields over their configured length limit`() {
        val validRole = Role(role = "admin")

        assertFailsWith<RequestValidationException> { validRole.copy(role = "x".repeat(256)) }
    }

    @Test
    fun `rejects UpsertRoleRequest fields over their configured length limit`() {
        val validUpsertRoleRequest = UpsertRoleRequest(role = "admin")

        assertFailsWith<RequestValidationException> { validUpsertRoleRequest.copy(role = "x".repeat(256)) }
    }

    @Test
    fun `rejects Space fields over their configured length limit`() {
        val validSpace = Space(name = "Main Room")

        assertFailsWith<RequestValidationException> { validSpace.copy(name = "x".repeat(256)) }
    }

    @Test
    fun `rejects Table fields over their configured length limit`() {
        val validTable = Table(name = "Table 1", spaceId = "space-1")

        assertFailsWith<RequestValidationException> { validTable.copy(name = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validTable.copy(status = "x".repeat(21)) }
    }

    @Test
    fun `rejects Dish fields over their configured length limit`() {
        val validDish = Dish(name = "Burger", price = 10.0, categoryId = "category-1")

        assertFailsWith<RequestValidationException> { validDish.copy(name = "x".repeat(256)) }
    }

    @Test
    fun `rejects Ingredient fields over their configured length limit`() {
        val validIngredient =
            Ingredient(
                name = "Flour",
                categoryId = "category-1",
                quantity = 1.0,
                unit = "kg",
                lowStockThreshold = 1.0,
                costPerUnit = 1.0,
            )

        assertFailsWith<RequestValidationException> { validIngredient.copy(name = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validIngredient.copy(unit = "x".repeat(21)) }
    }

    @Test
    fun `rejects Supplier fields over their configured length limit`() {
        val validSupplier =
            Supplier(name = "Acme", contact = "Bob", phone = "555-1234", email = "bob@acme.com", address = "123 Main St")

        assertFailsWith<RequestValidationException> { validSupplier.copy(name = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validSupplier.copy(contact = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validSupplier.copy(phone = "x".repeat(51)) }
        assertFailsWith<RequestValidationException> { validSupplier.copy(email = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validSupplier.copy(address = "x".repeat(501)) }
    }

    @Test
    fun `rejects OrderDish fields over their configured length limit`() {
        val validOrderDish =
            OrderDish(orderId = "order-1", dishId = "dish-1", priceAtOrder = 10.0, status = "pending", shouldPrepare = true)

        assertFailsWith<RequestValidationException> { validOrderDish.copy(notes = "x".repeat(501)) }
    }

    @Test
    fun `rejects AddOrderDishRequest fields over their configured length limit`() {
        val validAddOrderDishRequest = AddOrderDishRequest(dishId = "dish-1", priceAtOrder = 10.0)

        assertFailsWith<RequestValidationException> { validAddOrderDishRequest.copy(notes = "x".repeat(501)) }
    }

    @Test
    fun `rejects Ticket fields over their configured length limit`() {
        val validTicket =
            Ticket(orderId = "order-1", userId = "user-1", ticketDate = "2026-01-01", status = 1, totalAmount = 10.0, notes = "thanks")

        assertFailsWith<RequestValidationException> { validTicket.copy(notes = "x".repeat(5001)) }
    }

    @Test
    fun `rejects Shift fields over their configured length limit`() {
        val validShift = Shift(userId = "user-1", shiftDate = "2026-01-01", startTime = "08:00", notes = "ok")

        assertFailsWith<RequestValidationException> { validShift.copy(notes = "x".repeat(256)) }
    }

    @Test
    fun `rejects Permission fields over their configured length limit`() {
        val validPermission = Permission(name = "orders_read")

        assertFailsWith<RequestValidationException> { validPermission.copy(name = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validPermission.copy(description = "x".repeat(5001)) }
    }

    @Test
    fun `rejects WebPushKeys fields over their configured length limit`() {
        val validWebPushKeys = WebPushKeys(p256dh = "abc", auth = "def")

        assertFailsWith<RequestValidationException> { validWebPushKeys.copy(p256dh = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validWebPushKeys.copy(auth = "x".repeat(256)) }
    }

    @Test
    fun `rejects WebPushSubscriptionRequest fields over their configured length limit`() {
        val validWebPushSubscriptionRequest =
            WebPushSubscriptionRequest(endpoint = "https://push.example.com/x", keys = WebPushKeys(p256dh = "abc", auth = "def"))

        assertFailsWith<RequestValidationException> { validWebPushSubscriptionRequest.copy(endpoint = "x".repeat(2049)) }
        assertFailsWith<RequestValidationException> { validWebPushSubscriptionRequest.copy(userAgent = "x".repeat(1001)) }
    }

    @Test
    fun `rejects WebPushUnsubscribeRequest fields over their configured length limit`() {
        val validWebPushUnsubscribeRequest = WebPushUnsubscribeRequest(endpoint = "https://push.example.com/x")

        assertFailsWith<RequestValidationException> { validWebPushUnsubscribeRequest.copy(endpoint = "x".repeat(2049)) }
    }

    @Test
    fun `rejects AdminNotificationPreferenceUpdateRequest fields over their configured length limit`() {
        val validPreferenceUpdateRequest = AdminNotificationPreferenceUpdateRequest(category = "orders")

        assertFailsWith<RequestValidationException> { validPreferenceUpdateRequest.copy(category = "x".repeat(51)) }
    }

    @Test
    fun `rejects PrinterConfigCreateRequest fields over their configured length limit`() {
        val validPrinterConfigCreateRequest = PrinterConfigCreateRequest(printerType = PrinterType.KITCHEN, printerName = "Kitchen 1")

        assertFailsWith<RequestValidationException> { validPrinterConfigCreateRequest.copy(printerName = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validPrinterConfigCreateRequest.copy(templateName = "x".repeat(256)) }
    }

    @Test
    fun `rejects PrinterConfigUpdateRequest fields over their configured length limit`() {
        val validPrinterConfigUpdateRequest = PrinterConfigUpdateRequest()

        assertFailsWith<RequestValidationException> { validPrinterConfigUpdateRequest.copy(printerName = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validPrinterConfigUpdateRequest.copy(templateName = "x".repeat(256)) }
    }

    @Test
    fun `rejects SetPrinterRequest fields over their configured length limit`() {
        val validSetPrinterRequest = SetPrinterRequest(printerType = PrinterType.KITCHEN, printerName = "Kitchen 1")

        assertFailsWith<RequestValidationException> { validSetPrinterRequest.copy(printerName = "x".repeat(256)) }
    }

    @Test
    fun `rejects Config fields over their configured length limit`() {
        val validConfig =
            Config(
                businessName = "Alice Store",
                businessAddress = null,
                businessPhone = null,
                businessEmail = null,
                businessTaxId = null,
                businessLogoUrl = null,
            )

        assertFailsWith<RequestValidationException> { validConfig.copy(businessType = "x".repeat(21)) }
        assertFailsWith<RequestValidationException> { validConfig.copy(businessName = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validConfig.copy(businessProfession = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validConfig.copy(businessAddress = "x".repeat(2001)) }
        assertFailsWith<RequestValidationException> { validConfig.copy(businessPhone = "x".repeat(51)) }
        assertFailsWith<RequestValidationException> { validConfig.copy(businessEmail = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validConfig.copy(businessTaxId = "x".repeat(101)) }
        assertFailsWith<RequestValidationException> { validConfig.copy(businessLogoUrl = "x".repeat(2049)) }
        assertFailsWith<RequestValidationException> { validConfig.copy(timezone = "x".repeat(51)) }
        assertFailsWith<RequestValidationException> { validConfig.copy(tipPercentages = "x".repeat(51)) }
    }

    @Test
    fun `rejects InitialSetupRequest fields over their configured length limit`() {
        val validInitialSetupRequest = InitialSetupRequest()

        assertFailsWith<RequestValidationException> { validInitialSetupRequest.copy(businessType = "x".repeat(21)) }
        assertFailsWith<RequestValidationException> { validInitialSetupRequest.copy(userName = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validInitialSetupRequest.copy(businessName = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validInitialSetupRequest.copy(businessProfession = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validInitialSetupRequest.copy(businessAddress = "x".repeat(2001)) }
        assertFailsWith<RequestValidationException> { validInitialSetupRequest.copy(businessPhone = "x".repeat(51)) }
        assertFailsWith<RequestValidationException> { validInitialSetupRequest.copy(businessEmail = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validInitialSetupRequest.copy(businessRFC = "x".repeat(21)) }
        assertFailsWith<RequestValidationException> { validInitialSetupRequest.copy(businessTaxId = "x".repeat(101)) }
        assertFailsWith<RequestValidationException> { validInitialSetupRequest.copy(businessCurrency = "x".repeat(4)) }
        assertFailsWith<RequestValidationException> { validInitialSetupRequest.copy(timezone = "x".repeat(51)) }
        assertFailsWith<RequestValidationException> { validInitialSetupRequest.copy(businessLogoUrl = "x".repeat(2049)) }
    }

    @Test
    fun `rejects FreelanceClient fields over their configured length limit`() {
        val validFreelanceClient =
            FreelanceClient(
                id = "client-1",
                name = "Acme",
                currencyId = "currency-1",
                hourlyRateCents = 5000,
                billingCycle = "monthly",
                paymentMethod = "bank",
                createdAt = "2026-01-01",
            )

        assertFailsWith<RequestValidationException> { validFreelanceClient.copy(name = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validFreelanceClient.copy(billingCycle = "x".repeat(21)) }
        assertFailsWith<RequestValidationException> { validFreelanceClient.copy(paymentMethod = "x".repeat(21)) }
    }

    @Test
    fun `rejects FreelanceClientUpsert fields over their configured length limit`() {
        val validFreelanceClientUpsert =
            FreelanceClientUpsert(name = "Acme", currencyId = "currency-1", hourlyRateCents = 5000, billingCycle = "monthly")

        assertFailsWith<RequestValidationException> { validFreelanceClientUpsert.copy(name = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validFreelanceClientUpsert.copy(billingCycle = "x".repeat(21)) }
        assertFailsWith<RequestValidationException> { validFreelanceClientUpsert.copy(paymentMethod = "x".repeat(21)) }
    }

    @Test
    fun `rejects FreelanceProject fields over their configured length limit`() {
        val validFreelanceProject =
            FreelanceProject(id = "project-1", clientId = "client-1", name = "Website", status = "active", createdAt = "2026-01-01")

        assertFailsWith<RequestValidationException> { validFreelanceProject.copy(name = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validFreelanceProject.copy(status = "x".repeat(21)) }
    }

    @Test
    fun `rejects FreelanceProjectUpsert fields over their configured length limit`() {
        val validFreelanceProjectUpsert = FreelanceProjectUpsert(name = "Website")

        assertFailsWith<RequestValidationException> { validFreelanceProjectUpsert.copy(name = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validFreelanceProjectUpsert.copy(status = "x".repeat(21)) }
    }

    @Test
    fun `rejects FreelanceTask fields over their configured length limit`() {
        val validFreelanceTask = FreelanceTask(id = "task-1", name = "Design", createdAt = "2026-01-01")

        assertFailsWith<RequestValidationException> { validFreelanceTask.copy(name = "x".repeat(256)) }
    }

    @Test
    fun `rejects FreelanceTaskUpsert fields over their configured length limit`() {
        val validFreelanceTaskUpsert = FreelanceTaskUpsert(name = "Design")

        assertFailsWith<RequestValidationException> { validFreelanceTaskUpsert.copy(name = "x".repeat(256)) }
    }

    @Test
    fun `rejects PayoutAccount fields over their configured length limit`() {
        val validPayoutAccount = PayoutAccount(id = "payout-1", type = "bank", createdAt = "2026-01-01")

        assertFailsWith<RequestValidationException> { validPayoutAccount.copy(type = "x".repeat(21)) }
        assertFailsWith<RequestValidationException> { validPayoutAccount.copy(accountHolder = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validPayoutAccount.copy(bankName = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validPayoutAccount.copy(accountNumber = "x".repeat(51)) }
        assertFailsWith<RequestValidationException> { validPayoutAccount.copy(swift = "x".repeat(16)) }
        assertFailsWith<RequestValidationException> { validPayoutAccount.copy(iban = "x".repeat(41)) }
        assertFailsWith<RequestValidationException> { validPayoutAccount.copy(clabe = "x".repeat(21)) }
        assertFailsWith<RequestValidationException> { validPayoutAccount.copy(lightningAddress = "x".repeat(256)) }
    }

    @Test
    fun `rejects PayoutAccountUpsert fields over their configured length limit`() {
        val validPayoutAccountUpsert = PayoutAccountUpsert(type = "bank")

        assertFailsWith<RequestValidationException> { validPayoutAccountUpsert.copy(type = "x".repeat(21)) }
        assertFailsWith<RequestValidationException> { validPayoutAccountUpsert.copy(accountHolder = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validPayoutAccountUpsert.copy(bankName = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validPayoutAccountUpsert.copy(accountNumber = "x".repeat(51)) }
        assertFailsWith<RequestValidationException> { validPayoutAccountUpsert.copy(swift = "x".repeat(16)) }
        assertFailsWith<RequestValidationException> { validPayoutAccountUpsert.copy(iban = "x".repeat(41)) }
        assertFailsWith<RequestValidationException> { validPayoutAccountUpsert.copy(clabe = "x".repeat(21)) }
        assertFailsWith<RequestValidationException> { validPayoutAccountUpsert.copy(lightningAddress = "x".repeat(256)) }
    }

    @Test
    fun `rejects CategoryItem fields over their configured length limit`() {
        val validCategoryItem = CategoryItem(name = "Drinks")

        assertFailsWith<RequestValidationException> { validCategoryItem.copy(name = "x".repeat(256)) }
    }

    @Test
    fun `rejects CategoryUpsert fields over their configured length limit`() {
        val validCategoryUpsert = CategoryUpsert(name = "Drinks")

        assertFailsWith<RequestValidationException> { validCategoryUpsert.copy(name = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validCategoryUpsert.copy(type = "x".repeat(21)) }
    }

    @Test
    fun `rejects CreateTimeEntryRequest fields over their configured length limit`() {
        val validCreateTimeEntryRequest = CreateTimeEntryRequest(projectId = "project-1", entryDate = "2026-01-01", durationMinutes = 60)

        assertFailsWith<RequestValidationException> { validCreateTimeEntryRequest.copy(taskName = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validCreateTimeEntryRequest.copy(description = "x".repeat(1001)) }
    }

    @Test
    fun `rejects UpdateTimeEntryRequest fields over their configured length limit`() {
        val validUpdateTimeEntryRequest = UpdateTimeEntryRequest(projectId = "project-1", entryDate = "2026-01-01", durationMinutes = 60)

        assertFailsWith<RequestValidationException> { validUpdateTimeEntryRequest.copy(taskName = "x".repeat(256)) }
        assertFailsWith<RequestValidationException> { validUpdateTimeEntryRequest.copy(description = "x".repeat(1001)) }
    }

    @Test
    fun `rejects StoreCheckoutRequest fields over their configured length limit`() {
        val validStoreCheckoutRequest =
            StoreCheckoutRequest(
                userId = "user-1",
                items = emptyList(),
                paymentMethodId = "method-1",
                currencyId = "currency-1",
                amount = 10.0,
            )

        assertFailsWith<RequestValidationException> { validStoreCheckoutRequest.copy(ticketNotes = "x".repeat(5001)) }
        assertFailsWith<RequestValidationException> { validStoreCheckoutRequest.copy(exchangeRateCurrency = "x".repeat(11)) }
    }

    @Test
    fun `rejects CreateFreelanceInvoiceRequest fields over their configured length limit`() {
        val validCreateFreelanceInvoiceRequest =
            CreateFreelanceInvoiceRequest(clientId = "client-1", periodStart = "2026-01-01", periodEnd = "2026-01-31")

        assertFailsWith<RequestValidationException> { validCreateFreelanceInvoiceRequest.copy(exchangeRateCurrency = "x".repeat(11)) }
    }
}
