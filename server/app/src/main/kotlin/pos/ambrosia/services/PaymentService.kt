package pos.ambrosia.services

import pos.ambrosia.logger
import pos.ambrosia.models.Currency
import pos.ambrosia.models.Payment
import pos.ambrosia.models.PaymentMethod
import java.sql.Connection

class PaymentService(
    private val connection: Connection,
) {
    companion object {
        private const val ADD_PAYMENT =
            "INSERT INTO payments (id, method_id, currency_id, transaction_id, amount, date) VALUES (?, ?, ?, ?, ?, datetime('now'))"
        private const val GET_PAYMENTS =
            "SELECT id, method_id, currency_id, transaction_id, amount, date FROM payments"
        private const val GET_PAYMENT_BY_ID =
            "SELECT id, method_id, currency_id, transaction_id, amount, date FROM payments WHERE id = ?"
        private const val UPDATE_PAYMENT =
            "UPDATE payments SET method_id = ?, currency_id = ?, transaction_id = ?, amount = ? WHERE id = ?"
        private const val DELETE_PAYMENT = "DELETE FROM payments WHERE id = ?"
        private const val CHECK_PAYMENT_IN_USE =
            "SELECT COUNT(*) as count FROM ticket_payments WHERE payment_id = ?"

        private const val GET_PAYMENT_METHODS = "SELECT id, name FROM payment_methods"
        private const val GET_PAYMENT_METHOD_BY_ID = "SELECT id, name FROM payment_methods WHERE id = ?"
        private const val CHECK_PAYMENT_METHOD_EXISTS = "SELECT id FROM payment_methods WHERE id = ?"

        private const val GET_CURRENCIES = "SELECT id, acronym, name, symbol, country_name, country_code FROM currency"
        private const val GET_CURRENCY_BY_ID = "SELECT id, acronym, name, symbol, country_name, country_code FROM currency WHERE id = ?"
        private const val CHECK_CURRENCY_EXISTS = "SELECT id FROM currency WHERE id = ?"
    }

    private fun paymentInUse(paymentId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_PAYMENT_IN_USE)
        statement.setString(1, paymentId)
        val resultSet = statement.executeQuery()
        if (resultSet.next()) {
            return resultSet.getInt("count") > 0
        }
        return false
    }

    private fun paymentMethodExists(methodId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_PAYMENT_METHOD_EXISTS)
        statement.setString(1, methodId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    private fun currencyExists(currencyId: String): Boolean {
        val statement = connection.prepareStatement(CHECK_CURRENCY_EXISTS)
        statement.setString(1, currencyId)
        val resultSet = statement.executeQuery()
        return resultSet.next()
    }

    suspend fun getPaymentMethods(): List<PaymentMethod> {
        val statement = connection.prepareStatement(GET_PAYMENT_METHODS)
        val resultSet = statement.executeQuery()
        val paymentMethods = mutableListOf<PaymentMethod>()
        while (resultSet.next()) {
            val paymentMethod =
                PaymentMethod(id = resultSet.getString("id"), name = resultSet.getString("name"))
            paymentMethods.add(paymentMethod)
        }
        logger.info("Retrieved ${paymentMethods.size} payment methods")
        return paymentMethods
    }

    suspend fun getPaymentMethodById(id: String): PaymentMethod? {
        val statement = connection.prepareStatement(GET_PAYMENT_METHOD_BY_ID)
        statement.setString(1, id)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) {
            PaymentMethod(id = resultSet.getString("id"), name = resultSet.getString("name"))
        } else {
            logger.warn("Payment method not found with ID: $id")
            null
        }
    }

    suspend fun getCurrencies(): List<Currency> {
        val statement = connection.prepareStatement(GET_CURRENCIES)
        val resultSet = statement.executeQuery()
        val currencies = mutableListOf<Currency>()
        while (resultSet.next()) {
            val currency =
                Currency(
                    id = resultSet.getString("id"),
                    acronym = resultSet.getString("acronym"),
                    name = resultSet.getString("name"),
                    symbol = resultSet.getString("symbol"),
                    country_name = resultSet.getString("country_name"),
                    country_code = resultSet.getString("country_code"),
                )
            currencies.add(currency)
        }
        logger.info("Retrieved ${currencies.size} currencies")
        return currencies
    }

    suspend fun getCurrencyById(id: String): Currency? {
        val statement = connection.prepareStatement(GET_CURRENCY_BY_ID)
        statement.setString(1, id)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) {
            Currency(
                id = resultSet.getString("id"),
                acronym = resultSet.getString("acronym"),
                name = resultSet.getString("name"),
                symbol = resultSet.getString("symbol"),
                country_name = resultSet.getString("country_name"),
                country_code = resultSet.getString("country_code"),
            )
        } else {
            logger.warn("Currency not found with ID: $id")
            null
        }
    }

    suspend fun addPayment(payment: Payment): String? {
        if (payment.method_id.isBlank() || payment.currency_id.isBlank()) {
            logger.error("Method ID, currency ID and transaction ID are required fields")
            return null
        }

        if (!paymentMethodExists(payment.method_id)) {
            logger.error("Payment method ID does not exist: ${payment.method_id}")
            return null
        }

        if (!currencyExists(payment.currency_id)) {
            logger.error("Currency ID does not exist: ${payment.currency_id}")
            return null
        }

        val generatedId =
            java.util.UUID
                .randomUUID()
                .toString()
        val statement = connection.prepareStatement(ADD_PAYMENT)

        statement.setString(1, generatedId)
        statement.setString(2, payment.method_id)
        statement.setString(3, payment.currency_id)
        statement.setString(4, payment.transaction_id)
        statement.setDouble(5, payment.amount)

        val rowsAffected = statement.executeUpdate()

        return if (rowsAffected > 0) {
            logger.info("Payment created successfully with ID: $generatedId")
            generatedId
        } else {
            logger.error("Failed to create payment")
            null
        }
    }

    suspend fun getPayments(): List<Payment> {
        val statement = connection.prepareStatement(GET_PAYMENTS)
        val resultSet = statement.executeQuery()
        val payments = mutableListOf<Payment>()
        while (resultSet.next()) {
            val payment =
                Payment(
                    id = resultSet.getString("id"),
                    method_id = resultSet.getString("method_id"),
                    currency_id = resultSet.getString("currency_id"),
                    transaction_id = resultSet.getString("transaction_id"),
                    amount = resultSet.getDouble("amount"),
                )
            payments.add(payment)
        }
        logger.info("Retrieved ${payments.size} payments")
        return payments
    }

    suspend fun getPaymentById(id: String): Payment? {
        val statement = connection.prepareStatement(GET_PAYMENT_BY_ID)
        statement.setString(1, id)
        val resultSet = statement.executeQuery()
        return if (resultSet.next()) {
            Payment(
                id = resultSet.getString("id"),
                method_id = resultSet.getString("method_id"),
                currency_id = resultSet.getString("currency_id"),
                transaction_id = resultSet.getString("transaction_id"),
                amount = resultSet.getDouble("amount"),
            )
        } else {
            logger.warn("Payment not found with ID: $id")
            null
        }
    }

    suspend fun updatePayment(payment: Payment): Boolean {
        if (payment.id == null) {
            logger.error("Cannot update payment: ID is null")
            return false
        }

        if (payment.method_id.isBlank() || payment.currency_id.isBlank()) {
            logger.error("Method ID, currency ID and transaction ID are required fields")
            return false
        }

        if (!paymentMethodExists(payment.method_id)) {
            logger.error("Payment method ID does not exist: ${payment.method_id}")
            return false
        }

        if (!currencyExists(payment.currency_id)) {
            logger.error("Currency ID does not exist: ${payment.currency_id}")
            return false
        }

        val statement = connection.prepareStatement(UPDATE_PAYMENT)
        statement.setString(1, payment.method_id)
        statement.setString(2, payment.currency_id)
        statement.setString(3, payment.transaction_id)
        statement.setDouble(4, payment.amount)
        statement.setString(5, payment.id)

        val rowsUpdated = statement.executeUpdate()
        if (rowsUpdated > 0) {
            logger.info("Payment updated successfully: ${payment.id}")
        } else {
            logger.error("Failed to update payment: ${payment.id}")
        }
        return rowsUpdated > 0
    }

    suspend fun deletePayment(id: String): Boolean {
        if (paymentInUse(id)) {
            logger.error("Cannot delete payment $id: it's being used in transactions")
            return false
        }

        val statement = connection.prepareStatement(DELETE_PAYMENT)
        statement.setString(1, id)
        val rowsDeleted = statement.executeUpdate()

        if (rowsDeleted > 0) {
            logger.info("Payment deleted successfully: $id")
        } else {
            logger.error("Failed to delete payment: $id")
        }
        return rowsDeleted > 0
    }
}
