package pos.ambrosia.services

import com.github.anastaciocintra.escpos.EscPos
import com.github.anastaciocintra.output.PrinterOutputStream
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.OrdersTable
import pos.ambrosia.db.tables.PaymentsTable
import pos.ambrosia.db.tables.TicketPaymentsTable
import pos.ambrosia.db.tables.TicketsTable
import pos.ambrosia.logger
import pos.ambrosia.models.CashDrawerPin
import pos.ambrosia.models.PrinterConfig
import java.io.IOException
import java.util.UUID

enum class CashDrawerTrigger {
    SHIFT_OPEN,
    SHIFT_CLOSE,
}

fun interface CashDrawerPulseSender {
    fun sendPulse(
        printerName: String,
        cashDrawerPin: CashDrawerPin,
    )
}

object EscPosCashDrawerPulseSender : CashDrawerPulseSender {
    private const val PULSE_ON_TIME = 25
    private const val PULSE_OFF_TIME = 250

    override fun sendPulse(
        printerName: String,
        cashDrawerPin: CashDrawerPin,
    ) {
        val printService =
            PrinterOutputStream.getPrintServiceByName(printerName)
                ?: throw IOException("Printer '$printerName' not found on this system.")
        val escpos = EscPos(PrinterOutputStream(printService))
        val pinConnector =
            when (cashDrawerPin) {
                CashDrawerPin.PIN_2 -> EscPos.PinConnector.Pin_2
                CashDrawerPin.PIN_5 -> EscPos.PinConnector.Pin_5
            }
        escpos.pulsePin(pinConnector, PULSE_ON_TIME, PULSE_OFF_TIME)
        escpos.close()
    }
}

open class CashDrawerService(
    private val printerConfigService: PrinterConfigService = PrinterConfigService(),
    private val pulseSender: CashDrawerPulseSender = EscPosCashDrawerPulseSender,
) {
    fun openForPaymentMethod(paymentMethodId: String) {
        openCashDrawers { printerConfig -> paymentMethodId in printerConfig.cashDrawerPaymentMethodIds }
    }

    fun openForTrigger(trigger: CashDrawerTrigger) {
        openCashDrawers { printerConfig ->
            when (trigger) {
                CashDrawerTrigger.SHIFT_OPEN -> printerConfig.openCashDrawerOnShiftOpen
                CashDrawerTrigger.SHIFT_CLOSE -> printerConfig.openCashDrawerOnShiftClose
            }
        }
    }

    fun openForRefundedOrder(orderId: String) {
        val paidPaymentMethodIds = findPaymentMethodIdsForOrder(orderId)
        openCashDrawers { printerConfig ->
            printerConfig.openCashDrawerOnRefund &&
                printerConfig.cashDrawerPaymentMethodIds.any { paymentMethodId -> paymentMethodId in paidPaymentMethodIds }
        }
    }

    fun openManually(printerConfigId: String?): Int {
        val openedCashDrawerCount =
            openCashDrawers { printerConfig -> printerConfigId == null || printerConfig.id == printerConfigId }
        if (openedCashDrawerCount == 0) {
            throw IOException("No printer with a cash drawer could be opened.")
        }
        return openedCashDrawerCount
    }

    private fun openCashDrawers(shouldOpen: (PrinterConfig) -> Boolean): Int =
        findPrinterConfigsWithCashDrawer()
            .filter(shouldOpen)
            .count { printerConfig ->
                try {
                    pulseSender.sendPulse(printerConfig.printerName, printerConfig.cashDrawerPin)
                    logger.info("Cash drawer opened on printer '${printerConfig.printerName}'")
                    true
                } catch (pulseException: Exception) {
                    logger.error(
                        "Failed to open the cash drawer on '${printerConfig.printerName}': ${pulseException.message}",
                        pulseException,
                    )
                    false
                }
            }

    private fun findPrinterConfigsWithCashDrawer(): List<PrinterConfig> =
        try {
            printerConfigService.getEnabledWithCashDrawer()
        } catch (lookupException: Exception) {
            logger.error("Failed to load the printers with a cash drawer: ${lookupException.message}", lookupException)
            emptyList()
        }

    private fun findPaymentMethodIdsForOrder(orderId: String): Set<String> {
        val orderUuid = runCatching { UUID.fromString(orderId) }.getOrNull() ?: return emptySet()
        return transaction {
            (TicketsTable innerJoin TicketPaymentsTable innerJoin PaymentsTable)
                .selectAll()
                .where { TicketsTable.orderId eq EntityID(orderUuid, OrdersTable) }
                .map { paymentRow -> paymentRow[PaymentsTable.methodId].value.toString() }
                .toSet()
        }
    }
}
