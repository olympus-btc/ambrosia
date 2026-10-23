package pos.ambrosia.services

import org.jetbrains.exposed.v1.core.JoinType
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.greaterEq
import org.jetbrains.exposed.v1.core.less
import org.jetbrains.exposed.v1.core.lessEq
import org.jetbrains.exposed.v1.jdbc.andWhere
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.db.tables.OrdersTable
import pos.ambrosia.db.tables.PaymentMethodsTable
import pos.ambrosia.db.tables.PaymentsTable
import pos.ambrosia.db.tables.RefundsTable
import pos.ambrosia.db.tables.ShiftEntity
import pos.ambrosia.db.tables.ShiftsTable
import pos.ambrosia.db.tables.TicketPaymentsTable
import pos.ambrosia.db.tables.TicketsTable
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.db.tables.UsersTable
import pos.ambrosia.logger
import pos.ambrosia.models.Shift
import pos.ambrosia.models.ShiftBreakdown
import pos.ambrosia.models.ShiftPaymentMethodTotal
import pos.ambrosia.models.ShiftReportLabels
import pos.ambrosia.models.ShiftReportPrintData
import pos.ambrosia.models.ShiftSummary
import pos.ambrosia.models.ShiftsReport
import pos.ambrosia.utils.SqlDateFunctions
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

class ShiftService {
    private val configService = ConfigService()

    private fun toModel(entity: ShiftEntity): Shift =
        Shift(
            id = entity.id.value.toString(),
            userId = entity.userId.value.toString(),
            shiftDate = entity.shiftDate,
            startTime = entity.startTime,
            endTime = entity.endTime,
            notes = entity.notes ?: "",
            initialAmount = entity.initialAmount ?: 0.0,
            finalAmount = entity.finalAmount,
            difference = entity.difference,
        )

    private fun userExists(userId: String): Boolean {
        val entity = UserEntity.findById(UUID.fromString(userId))
        return entity != null && !entity.isDeleted
    }

    fun addShift(shift: Shift): String? =
        transaction {
            val existingOpen = findOpenShift(null)
            if (existingOpen != null) {
                logger.warn("Attempt to open a new shift while one is already open: ${existingOpen.id}")
                return@transaction null
            }
            if (!userExists(shift.userId)) {
                logger.error("User does not exist: ${shift.userId}")
                return@transaction null
            }

            val openedAt = ZonedDateTime.now(configService.getConfiguredZoneId())
            val id =
                ShiftEntity
                    .new(UUID.randomUUID()) {
                        this.userId = EntityID(UUID.fromString(shift.userId), UsersTable)
                        this.shiftDate = openedAt.toLocalDate().toString()
                        this.startTime = openedAt.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm:ss"))
                        this.endTime = shift.endTime
                        this.notes = shift.notes
                        this.initialAmount = shift.initialAmount
                    }.id.value
                    .toString()
            logger.info("Shift created successfully with ID: $id")
            id
        }

    fun getShifts(): List<Shift> =
        transaction {
            val shifts =
                ShiftEntity
                    .find { ShiftsTable.isDeleted eq false }
                    .map { toModel(it) }
            logger.info("Retrieved ${shifts.size} shifts")
            shifts
        }

    fun getShiftById(id: String): Shift? =
        transaction {
            val entity = ShiftEntity.findById(UUID.fromString(id))
            if (entity == null || entity.isDeleted) {
                logger.warn("Shift not found with ID: $id")
                null
            } else {
                toModel(entity)
            }
        }

    fun getShiftsByUser(userId: String): List<Shift> =
        transaction {
            val shifts =
                ShiftEntity
                    .find {
                        (ShiftsTable.userId eq EntityID(UUID.fromString(userId), UsersTable)) and (ShiftsTable.isDeleted eq false)
                    }.map { toModel(it) }
            logger.info("Retrieved ${shifts.size} shifts for user: $userId")
            shifts
        }

    fun getShiftsByDate(date: String): List<Shift> =
        transaction {
            val shifts =
                ShiftEntity
                    .find { (ShiftsTable.shiftDate eq date) and (ShiftsTable.isDeleted eq false) }
                    .map { toModel(it) }
            logger.info("Retrieved ${shifts.size} shifts for date: $date")
            shifts
        }

    private fun resolveDateRange(
        period: String?,
        startDate: String?,
        endDate: String?,
    ): Pair<String, String>? {
        if (period != null) {
            val today = LocalDate.now(configService.getConfiguredZoneId())
            val start =
                when (period) {
                    "day" -> today

                    "week" -> today.with(DayOfWeek.MONDAY)

                    "month" -> today.withDayOfMonth(1)

                    "year" -> today.withDayOfYear(1)

                    else -> throw IllegalArgumentException(
                        "Invalid period: $period. Must be day, week, month, or year",
                    )
                }
            return Pair(start.toString(), today.toString())
        }
        if (startDate != null && endDate != null) return Pair(startDate, endDate)
        return null
    }

    fun getShiftsByRange(
        startDate: String,
        endDate: String,
    ): List<Shift> =
        transaction {
            val shifts =
                ShiftEntity
                    .find {
                        (ShiftsTable.shiftDate greaterEq startDate) and
                            (ShiftsTable.shiftDate lessEq endDate) and
                            (ShiftsTable.isDeleted eq false)
                    }.orderBy(ShiftsTable.shiftDate to SortOrder.DESC, ShiftsTable.startTime to SortOrder.DESC)
                    .map { toModel(it) }
            logger.info("Retrieved ${shifts.size} shifts between $startDate and $endDate")
            shifts
        }

    private fun getPaymentMethodTotals(
        startDate: String,
        endDate: String,
    ): List<ShiftPaymentMethodTotal> =
        transaction {
            val join =
                TicketsTable
                    .join(TicketPaymentsTable, JoinType.INNER, TicketsTable.id, TicketPaymentsTable.ticketId)
                    .join(PaymentsTable, JoinType.INNER, PaymentsTable.id, TicketPaymentsTable.paymentId)
                    .join(PaymentMethodsTable, JoinType.INNER, PaymentMethodsTable.id, PaymentsTable.methodId)

            val amountsByMethodName =
                join
                    .selectAll()
                    .andWhere { SqlDateFunctions.dateOnly(TicketsTable.ticketDate) greaterEq startDate }
                    .andWhere { SqlDateFunctions.dateOnly(TicketsTable.ticketDate) lessEq endDate }
                    .map { row -> row[PaymentMethodsTable.name] to row[TicketsTable.totalAmount] }

            amountsByMethodName
                .groupBy({ it.first }, { it.second })
                .map { (methodName, amounts) -> ShiftPaymentMethodTotal(name = methodName, total = amounts.sum()) }
                .sortedByDescending { it.total }
        }

    fun getShiftsReport(
        period: String?,
        startDate: String?,
        endDate: String?,
    ): ShiftsReport =
        transaction {
            val (start, end) =
                resolveDateRange(period, startDate, endDate)
                    ?: throw IllegalArgumentException("Either period or both startDate and endDate must be provided")

            val userNamesById =
                UserEntity.all().associate { it.id.value.toString() to it.name }

            val shifts =
                getShiftsByRange(start, end).map { shift ->
                    ShiftSummary(
                        id = shift.id!!,
                        userId = shift.userId,
                        userName = userNamesById[shift.userId] ?: shift.userId,
                        shiftDate = shift.shiftDate,
                        startTime = shift.startTime,
                        endTime = shift.endTime,
                        initialAmount = shift.initialAmount,
                        finalAmount = shift.finalAmount,
                        difference = shift.difference,
                    )
                }

            val totalInitialAmount = shifts.sumOf { it.initialAmount }
            val totalFinalAmount = shifts.sumOf { it.finalAmount ?: 0.0 }
            val totalDifference = shifts.sumOf { it.difference ?: 0.0 }

            val report =
                ShiftsReport(
                    shifts = shifts,
                    totalInitialAmount = totalInitialAmount,
                    totalFinalAmount = totalFinalAmount,
                    totalExpectedAmount = totalFinalAmount - totalDifference,
                    totalDifference = totalDifference,
                    byPaymentMethod = getPaymentMethodTotals(start, end),
                )
            logger.info("Shifts report between $start and $end: ${shifts.size} shifts")
            report
        }

    private fun isCashMethod(methodName: String): Boolean {
        val normalizedName = methodName.lowercase()
        return normalizedName.contains("cash") || normalizedName.contains("efectivo")
    }

    fun getShiftReportPrintData(
        shiftId: String,
        labels: ShiftReportLabels,
    ): ShiftReportPrintData? =
        transaction {
            val shiftEntity = ShiftEntity.findById(UUID.fromString(shiftId))
            if (shiftEntity == null || shiftEntity.isDeleted) {
                logger.warn("Shift not found for report print: $shiftId")
                return@transaction null
            }
            val shift = toModel(shiftEntity)
            val breakdown = getShiftBreakdown(shiftId) ?: return@transaction null
            ShiftReportPrintData(
                cashierName = UserEntity.findById(shiftEntity.userId.value)?.name.orEmpty(),
                openedAt = "${shift.shiftDate}T${shift.startTime}",
                closedAt = shift.endTime?.let { endTime -> "${shift.shiftDate}T$endTime" },
                breakdown = breakdown,
                labels = labels,
            )
        }

    fun getShiftBreakdown(shiftId: String): ShiftBreakdown? =
        transaction {
            val shiftEntity = ShiftEntity.findById(UUID.fromString(shiftId))
            if (shiftEntity == null || shiftEntity.isDeleted) {
                logger.warn("Shift not found for breakdown: $shiftId")
                return@transaction null
            }
            val shift = toModel(shiftEntity)

            val dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
            val start = "${shift.shiftDate} ${shift.startTime}"
            val end =
                shift.endTime?.let { "${shift.shiftDate} $it" }
                    ?: LocalDateTime.now(configService.getConfiguredZoneId()).format(dateTimeFormatter)

            val ticketsJoin =
                TicketsTable.join(OrdersTable, JoinType.INNER, TicketsTable.orderId, OrdersTable.id)

            val shiftTickets =
                ticketsJoin
                    .selectAll()
                    .andWhere { OrdersTable.isDeleted eq false }
                    .andWhere { SqlDateFunctions.dateTime(TicketsTable.ticketDate) greaterEq start }
                    .andWhere { SqlDateFunctions.dateTime(TicketsTable.ticketDate) less end }
                    .map { row -> Triple(row[TicketsTable.id].value, row[TicketsTable.totalAmount], row[TicketsTable.tipAmount]) }

            val totalSales = shiftTickets.sumOf { it.second }
            val totalTips = shiftTickets.sumOf { it.third }
            val totalTickets = shiftTickets.size

            val paymentsJoin =
                ticketsJoin
                    .join(TicketPaymentsTable, JoinType.INNER, TicketsTable.id, TicketPaymentsTable.ticketId)
                    .join(PaymentsTable, JoinType.INNER, PaymentsTable.id, TicketPaymentsTable.paymentId)
                    .join(PaymentMethodsTable, JoinType.INNER, PaymentMethodsTable.id, PaymentsTable.methodId)

            val amountsByMethodName =
                paymentsJoin
                    .selectAll()
                    .andWhere { OrdersTable.isDeleted eq false }
                    .andWhere { SqlDateFunctions.dateTime(TicketsTable.ticketDate) greaterEq start }
                    .andWhere { SqlDateFunctions.dateTime(TicketsTable.ticketDate) less end }
                    .map { row -> row[PaymentMethodsTable.name] to row[TicketsTable.totalAmount] }

            val byPaymentMethod =
                amountsByMethodName
                    .groupBy({ it.first }, { it.second })
                    .map { (methodName, amounts) -> ShiftPaymentMethodTotal(name = methodName, total = amounts.sum()) }
                    .sortedByDescending { it.total }

            val cashSales = amountsByMethodName.filter { isCashMethod(it.first) }.sumOf { it.second }

            val refundsJoin =
                RefundsTable
                    .join(OrdersTable, JoinType.INNER, RefundsTable.orderId, OrdersTable.id)
                    .join(TicketsTable, JoinType.INNER, OrdersTable.id, TicketsTable.orderId)
                    .join(TicketPaymentsTable, JoinType.INNER, TicketsTable.id, TicketPaymentsTable.ticketId)
                    .join(PaymentsTable, JoinType.INNER, PaymentsTable.id, TicketPaymentsTable.paymentId)
                    .join(PaymentMethodsTable, JoinType.INNER, PaymentMethodsTable.id, PaymentsTable.methodId)

            val cashRefunds =
                refundsJoin
                    .selectAll()
                    .andWhere { OrdersTable.isDeleted eq false }
                    .andWhere { SqlDateFunctions.dateTime(RefundsTable.refundedAt) greaterEq start }
                    .andWhere { SqlDateFunctions.dateTime(RefundsTable.refundedAt) less end }
                    .map { row ->
                        Triple(
                            row[RefundsTable.id].value,
                            row[PaymentMethodsTable.name],
                            row[OrdersTable.total] - row[OrdersTable.discountAmount],
                        )
                    }.distinctBy { it.first }
                    .filter { isCashMethod(it.second) }
                    .sumOf { it.third }

            val expectedTotal = shift.initialAmount + cashSales - cashRefunds

            ShiftBreakdown(
                shiftId = shiftId,
                initialAmount = shift.initialAmount,
                finalAmount = shift.finalAmount,
                difference = shift.difference,
                totalSales = totalSales,
                totalTips = totalTips,
                cashSales = cashSales,
                cashRefunds = cashRefunds,
                expectedTotal = expectedTotal,
                totalTickets = totalTickets,
                byPaymentMethod = byPaymentMethod,
            )
        }

    private fun findOpenShift(userId: String?): Shift? {
        var query =
            ShiftEntity.find {
                (ShiftsTable.endTime eq null) and (ShiftsTable.isDeleted eq false)
            }
        if (userId != null) {
            query =
                ShiftEntity.find {
                    (ShiftsTable.userId eq EntityID(UUID.fromString(userId), UsersTable)) and
                        (ShiftsTable.endTime eq null) and
                        (ShiftsTable.isDeleted eq false)
                }
        }
        return query
            .orderBy(ShiftsTable.shiftDate to SortOrder.DESC, ShiftsTable.startTime to SortOrder.DESC)
            .limit(1)
            .firstOrNull()
            ?.let { toModel(it) }
    }

    fun getOpenShift(userId: String? = null): Shift? = transaction { findOpenShift(userId) }

    fun updateShift(shift: Shift): Boolean =
        transaction {
            if (shift.id == null) {
                logger.error("Cannot update shift: ID is null")
                return@transaction false
            }

            if (!userExists(shift.userId)) {
                logger.error("User does not exist: ${shift.userId}")
                return@transaction false
            }

            val entity = ShiftEntity.findById(UUID.fromString(shift.id))
            if (entity == null) {
                logger.error("Failed to update shift: ${shift.id}")
                false
            } else {
                entity.userId = EntityID(UUID.fromString(shift.userId), UsersTable)
                entity.shiftDate = shift.shiftDate
                entity.startTime = shift.startTime
                entity.endTime = shift.endTime
                entity.notes = shift.notes
                logger.info("Shift updated successfully: ${shift.id}")
                true
            }
        }

    fun deleteShift(id: String): Boolean =
        transaction {
            val entity = ShiftEntity.findById(UUID.fromString(id))
            if (entity == null) {
                logger.error("Failed to delete shift: $id")
                false
            } else {
                entity.isDeleted = true
                logger.info("Shift soft-deleted successfully: $id")
                true
            }
        }

    fun closeShift(
        id: String,
        finalAmount: Double? = null,
        difference: Double? = null,
    ): Boolean =
        transaction {
            val now = LocalTime.now(configService.getConfiguredZoneId()).format(DateTimeFormatter.ofPattern("HH:mm:ss"))
            val entity = ShiftEntity.findById(UUID.fromString(id))
            if (entity == null || entity.isDeleted || entity.endTime != null) {
                logger.warn("Shift not closed (not found or already closed): $id")
                false
            } else {
                entity.endTime = now
                entity.finalAmount = finalAmount
                entity.difference = difference
                logger.info("Shift closed successfully: $id at $now")
                true
            }
        }
}
