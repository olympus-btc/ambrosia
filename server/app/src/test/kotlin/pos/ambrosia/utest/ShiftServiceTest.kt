package pos.ambrosia.utest

import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.After
import org.junit.Before
import pos.ambrosia.db.tables.OrderEntity
import pos.ambrosia.db.tables.TicketEntity
import pos.ambrosia.models.Shift
import pos.ambrosia.services.ShiftService
import pos.ambrosia.utils.ExposedTestDb
import pos.ambrosia.utils.shiftReportLabels
import java.io.File
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ShiftServiceTest {
    private lateinit var dbFile: File
    private val service = ShiftService()

    @Before
    fun setUp() {
        dbFile = ExposedTestDb.connect()
    }

    @After
    fun tearDown() {
        ExposedTestDb.cleanup(dbFile)
    }

    private fun seedUser(): String {
        val roleId = ExposedTestDb.seedRole("admin", isAdmin = true)
        return ExposedTestDb.seedUser("Alice", roleId)
    }

    @Test
    fun `getShifts returns list of shifts when found`() {
        runBlocking {
            val userId = seedUser()
            val shiftId1 = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-01", endTime = "2pm")
            val shiftId2 = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-02", endTime = "2pm")

            val result = service.getShifts()
            assertEquals(2, result.size)
            assertTrue(result.any { it.id == shiftId1 })
            assertTrue(result.any { it.id == shiftId2 })
        }
    }

    @Test
    fun `getShifts returns empty list when not found`() {
        runBlocking {
            val result = service.getShifts()
            assertTrue(result.isEmpty())
        }
    }

    @Test
    fun `getShiftById returns shift when found`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-01", endTime = "2pm", notes = "note1")

            val result = service.getShiftById(shiftId)
            assertNotNull(result)
            assertEquals(shiftId, result.id)
            assertEquals(userId, result.userId)
            assertEquals("note1", result.notes)
            assertNull(result.finalAmount)
            assertNull(result.difference)
        }
    }

    @Test
    fun `getShiftById returns null when not found`() {
        runBlocking {
            val result = service.getShiftById(UUID.randomUUID().toString())
            assertNull(result)
        }
    }

    @Test
    fun `getOpenShift returns null when no open shift`() {
        runBlocking {
            val userId = seedUser()
            ExposedTestDb.seedShift(userId, shiftDate = "2024-01-01", endTime = "2pm")

            val result = service.getOpenShift()
            assertNull(result)
        }
    }

    @Test
    fun `getOpenShift returns open shift with amounts when found`() {
        runBlocking {
            val userId = seedUser()
            val shiftId =
                ExposedTestDb.seedShift(
                    userId,
                    shiftDate = "2026-03-04",
                    startTime = "08:00:00",
                    endTime = null,
                    notes = "",
                    initialAmount = 100.0,
                )

            val result = service.getOpenShift()
            assertNotNull(result)
            assertEquals(shiftId, result.id)
            assertEquals(100.0, result.initialAmount)
            assertNull(result.endTime)
            assertNull(result.finalAmount)
            assertNull(result.difference)
        }
    }

    @Test
    fun `getShiftsByUser returns shifts when found`() {
        runBlocking {
            val userId = seedUser()
            val otherUserId = ExposedTestDb.seedUser("Bob", ExposedTestDb.seedRole("admin", isAdmin = true))
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-01", endTime = "2pm")
            ExposedTestDb.seedShift(otherUserId, shiftDate = "2024-01-01", endTime = "2pm")

            val result = service.getShiftsByUser(userId)
            assertEquals(1, result.size)
            assertEquals(shiftId, result[0].id)
        }
    }

    @Test
    fun `getShiftsByDate returns shifts when found`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-01", endTime = "2pm")
            ExposedTestDb.seedShift(userId, shiftDate = "2024-01-02", endTime = "2pm")

            val result = service.getShiftsByDate("2024-01-01")
            assertEquals(1, result.size)
            assertEquals(shiftId, result[0].id)
        }
    }

    @Test
    fun `getShiftsByRange returns shifts within the inclusive date range, excluding shifts outside it`() {
        runBlocking {
            val userId = seedUser()
            val shiftInRangeStart = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-01", endTime = "2pm")
            val shiftInRangeEnd = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-31", endTime = "2pm")
            ExposedTestDb.seedShift(userId, shiftDate = "2023-12-31", endTime = "2pm")
            ExposedTestDb.seedShift(userId, shiftDate = "2024-02-01", endTime = "2pm")

            val shiftsInRange = service.getShiftsByRange("2024-01-01", "2024-01-31")

            assertEquals(2, shiftsInRange.size)
            assertTrue(shiftsInRange.any { it.id == shiftInRangeStart })
            assertTrue(shiftsInRange.any { it.id == shiftInRangeEnd })
        }
    }

    @Test
    fun `getShiftsReport throws when neither period nor a full date range is provided`() {
        runBlocking {
            assertFailsWith<IllegalArgumentException> {
                service.getShiftsReport(period = null, startDate = null, endDate = null)
            }
        }
    }

    @Test
    fun `getShiftsReport aggregates initial, final and difference amounts across shifts in range`() {
        runBlocking {
            val userId = seedUser()
            val closedShiftId = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-10", initialAmount = 100.0)
            service.closeShift(closedShiftId, finalAmount = 150.0, difference = 20.0)

            val stillOpenShiftId = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-20", initialAmount = 50.0)

            val outOfRangeShiftId = ExposedTestDb.seedShift(userId, shiftDate = "2024-02-01", initialAmount = 30.0)
            service.closeShift(outOfRangeShiftId, finalAmount = 30.0, difference = 0.0)

            val report = service.getShiftsReport(period = null, startDate = "2024-01-01", endDate = "2024-01-31")

            assertEquals(2, report.shifts.size)
            assertTrue(report.shifts.none { it.id == outOfRangeShiftId })

            val closedShiftSummary = report.shifts.first { it.id == closedShiftId }
            assertEquals("Alice", closedShiftSummary.userName)
            assertEquals(150.0, closedShiftSummary.finalAmount)
            assertEquals(20.0, closedShiftSummary.difference)

            val stillOpenShiftSummary = report.shifts.first { it.id == stillOpenShiftId }
            assertNull(stillOpenShiftSummary.finalAmount)
            assertNull(stillOpenShiftSummary.difference)

            assertEquals(150.0, report.totalInitialAmount)
            assertEquals(150.0, report.totalFinalAmount)
            assertEquals(20.0, report.totalDifference)
            assertEquals(130.0, report.totalExpectedAmount)
        }
    }

    @Test
    fun `getShiftsReport groups payment totals by method for tickets within the date range`() {
        runBlocking {
            val userId = seedUser()
            ExposedTestDb.seedShift(userId, shiftDate = "2024-01-10")

            val orderId = ExposedTestDb.seedOrder(userId, createdAt = "2024-01-10T12:00:00")
            val cashMethodId = ExposedTestDb.seedPaymentMethod("Efectivo")
            val cashTicketId = ExposedTestDb.seedTicket(orderId, userId)
            val cashPaymentId = ExposedTestDb.seedPayment(methodId = cashMethodId, amount = 80.0)
            ExposedTestDb.seedTicketPayment(cashPaymentId, cashTicketId)
            transaction { TicketEntity.findById(UUID.fromString(cashTicketId))!!.totalAmount = 80.0 }

            val outOfRangeOrderId = ExposedTestDb.seedOrder(userId, createdAt = "2024-02-01T12:00:00")
            val outOfRangeTicketId = ExposedTestDb.seedTicket(outOfRangeOrderId, userId)
            val outOfRangePaymentId = ExposedTestDb.seedPayment(methodId = cashMethodId, amount = 999.0)
            ExposedTestDb.seedTicketPayment(outOfRangePaymentId, outOfRangeTicketId)
            transaction {
                val outOfRangeTicket = TicketEntity.findById(UUID.fromString(outOfRangeTicketId))!!
                outOfRangeTicket.totalAmount = 999.0
                outOfRangeTicket.ticketDate = "2024-02-01T12:00:00"
            }

            val report = service.getShiftsReport(period = null, startDate = "2024-01-01", endDate = "2024-01-31")

            assertEquals(1, report.byPaymentMethod.size)
            assertEquals("Efectivo", report.byPaymentMethod[0].name)
            assertEquals(80.0, report.byPaymentMethod[0].total)
        }
    }

    @Test
    fun `getShiftReportPrintData returns null when shift not found`() {
        runBlocking {
            assertNull(service.getShiftReportPrintData(UUID.randomUUID().toString(), shiftReportLabels()))
        }
    }

    @Test
    fun `getShiftReportPrintData combines the cashier, shift times, breakdown and labels`() {
        runBlocking {
            val userId = seedUser()
            val shiftId =
                ExposedTestDb.seedShift(
                    userId,
                    shiftDate = "2024-01-10",
                    startTime = "08:00:00",
                    endTime = "18:00:00",
                    initialAmount = 100.0,
                )
            val printedShiftReportLabels = shiftReportLabels()

            val shiftReport = assertNotNull(service.getShiftReportPrintData(shiftId, printedShiftReportLabels))

            assertEquals("Alice", shiftReport.cashierName)
            assertEquals("2024-01-10T08:00:00", shiftReport.openedAt)
            assertEquals("2024-01-10T18:00:00", shiftReport.closedAt)
            assertEquals(service.getShiftBreakdown(shiftId), shiftReport.breakdown)
            assertEquals(printedShiftReportLabels, shiftReport.labels)
        }
    }

    @Test
    fun `getShiftReportPrintData leaves the closing time empty for an open shift`() {
        runBlocking {
            val shiftId = ExposedTestDb.seedShift(seedUser(), shiftDate = "2024-01-10", startTime = "08:00:00")

            assertNull(service.getShiftReportPrintData(shiftId, shiftReportLabels())?.closedAt)
        }
    }

    @Test
    fun `getShiftBreakdown returns null when shift not found`() {
        runBlocking {
            val breakdown = service.getShiftBreakdown(UUID.randomUUID().toString())
            assertNull(breakdown)
        }
    }

    @Test
    fun `getShiftBreakdown computes sales, tips, cash totals and payment breakdown within the shift window`() {
        runBlocking {
            val userId = seedUser()
            val shiftId =
                ExposedTestDb.seedShift(
                    userId,
                    shiftDate = "2024-01-10",
                    startTime = "08:00:00",
                    endTime = "18:00:00",
                    initialAmount = 100.0,
                )

            val cashMethodId = ExposedTestDb.seedPaymentMethod("Efectivo")
            val cardMethodId = ExposedTestDb.seedPaymentMethod("Card")

            val cashOrderId = ExposedTestDb.seedOrder(userId, createdAt = "2024-01-10T10:00:00")
            val cashTicketId = ExposedTestDb.seedTicket(cashOrderId, userId)
            val cashPaymentId = ExposedTestDb.seedPayment(methodId = cashMethodId, amount = 80.0)
            ExposedTestDb.seedTicketPayment(cashPaymentId, cashTicketId)
            transaction {
                val cashTicket = TicketEntity.findById(UUID.fromString(cashTicketId))!!
                cashTicket.totalAmount = 80.0
                cashTicket.tipAmount = 5.0
                cashTicket.ticketDate = "2024-01-10T10:00:00"
            }

            val cardOrderId = ExposedTestDb.seedOrder(userId, createdAt = "2024-01-10T11:00:00")
            val cardTicketId = ExposedTestDb.seedTicket(cardOrderId, userId)
            val cardPaymentId = ExposedTestDb.seedPayment(methodId = cardMethodId, amount = 40.0)
            ExposedTestDb.seedTicketPayment(cardPaymentId, cardTicketId)
            transaction {
                val cardTicket = TicketEntity.findById(UUID.fromString(cardTicketId))!!
                cardTicket.totalAmount = 40.0
                cardTicket.ticketDate = "2024-01-10T11:00:00"
            }

            ExposedTestDb.seedRefund(cashOrderId, refundedAt = "2024-01-10T12:00:00")
            transaction {
                val order = OrderEntity.findById(UUID.fromString(cashOrderId))!!
                order.total = 80.0
            }

            val outsideOrderId = ExposedTestDb.seedOrder(userId, createdAt = "2024-01-10T20:00:00")
            val outsideTicketId = ExposedTestDb.seedTicket(outsideOrderId, userId)
            val outsidePaymentId = ExposedTestDb.seedPayment(methodId = cashMethodId, amount = 999.0)
            ExposedTestDb.seedTicketPayment(outsidePaymentId, outsideTicketId)
            transaction {
                val outsideTicket = TicketEntity.findById(UUID.fromString(outsideTicketId))!!
                outsideTicket.totalAmount = 999.0
                outsideTicket.ticketDate = "2024-01-10T20:00:00"
            }

            val breakdown = service.getShiftBreakdown(shiftId)

            assertNotNull(breakdown)
            assertEquals(100.0, breakdown.initialAmount)
            assertEquals(2, breakdown.totalTickets)
            assertEquals(120.0, breakdown.totalSales)
            assertEquals(5.0, breakdown.totalTips)
            assertEquals(80.0, breakdown.cashSales)
            assertEquals(80.0, breakdown.cashRefunds)
            assertEquals(100.0, breakdown.expectedTotal)
            assertEquals(2, breakdown.byPaymentMethod.size)
            assertTrue(breakdown.byPaymentMethod.any { it.name == "Efectivo" && it.total == 80.0 })
            assertTrue(breakdown.byPaymentMethod.any { it.name == "Card" && it.total == 40.0 })
        }
    }

    @Test
    fun `deleteShift returns true on success`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "2024-01-01", endTime = "2pm")

            val result = service.deleteShift(shiftId)
            assertTrue(result)
            assertNull(service.getShiftById(shiftId))
        }
    }

    @Test
    fun `deleteShift returns false when shift not found`() {
        runBlocking {
            val result = service.deleteShift(UUID.randomUUID().toString())
            assertFalse(result)
        }
    }

    @Test
    fun `addShift returns null if user does not exist`() {
        runBlocking {
            val newShift =
                Shift(
                    id = null,
                    userId = UUID.randomUUID().toString(),
                    shiftDate = "date-1",
                    startTime = "7am",
                    endTime = "2pm",
                    notes = "note-1",
                )
            val shiftId = service.addShift(newShift)
            assertNull(shiftId)
        }
    }

    @Test
    fun `addShift returns null if there is already an open shift`() {
        runBlocking {
            val userId = seedUser()
            ExposedTestDb.seedShift(userId, shiftDate = "date-0", startTime = "6am", endTime = null)

            val newShift =
                Shift(
                    id = null,
                    userId = userId,
                    shiftDate = "date-1",
                    startTime = "7am",
                    endTime = null,
                    notes = "note-1",
                )
            val shiftId = service.addShift(newShift)
            assertNull(shiftId)
        }
    }

    @Test
    fun `addShift returns new ID on success`() {
        runBlocking {
            val userId = seedUser()
            val newShift =
                Shift(
                    id = null,
                    userId = userId,
                    shiftDate = "date-1",
                    startTime = "7am",
                    endTime = "2pm",
                    notes = "note-1",
                )
            val shiftId = service.addShift(newShift)
            assertNotNull(shiftId)
            assertTrue(shiftId.isNotBlank())
        }
    }

    @Test
    fun `addShift computes shiftDate using the configured timezone, not what the client sent`() {
        runBlocking {
            ExposedTestDb.seedConfig("Pacific/Kiritimati")
            val userId = seedUser()
            val expectedDate = LocalDate.now(ZoneId.of("Pacific/Kiritimati")).toString()
            val newShift =
                Shift(
                    id = null,
                    userId = userId,
                    shiftDate = "2000-01-01",
                    startTime = "00:00:00",
                    endTime = null,
                    notes = "note-1",
                )

            val shiftId = service.addShift(newShift)

            val stored = service.getShiftById(shiftId!!)
            assertEquals(expectedDate, stored?.shiftDate)
        }
    }

    @Test
    fun `closeShift returns true with finalAmount and difference`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "date-1", startTime = "7am", endTime = null)

            val result = service.closeShift(shiftId, finalAmount = 150.0, difference = 50.0)
            assertTrue(result)

            val updated = service.getShiftById(shiftId)
            assertEquals(150.0, updated?.finalAmount)
            assertEquals(50.0, updated?.difference)
            assertNotNull(updated?.endTime)
        }
    }

    @Test
    fun `closeShift computes endTime using the configured timezone`() {
        runBlocking {
            ExposedTestDb.seedConfig("Pacific/Kiritimati")
            val zoneId = ZoneId.of("Pacific/Kiritimati")
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "date-1", startTime = "7am", endTime = null)

            val before = LocalDateTime.now(zoneId)
            service.closeShift(shiftId)
            val after = LocalDateTime.now(zoneId)

            val parsedEndTime = LocalTime.parse(service.getShiftById(shiftId)!!.endTime, DateTimeFormatter.ofPattern("HH:mm:ss"))
            val storedEndTime = LocalDateTime.of(LocalDate.now(zoneId), parsedEndTime)
            assertFalse(storedEndTime.isBefore(before.withNano(0)))
            assertFalse(storedEndTime.isAfter(after))
        }
    }

    @Test
    fun `closeShift returns true with null amounts`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "date-1", startTime = "7am", endTime = null)

            val result = service.closeShift(shiftId)
            assertTrue(result)
        }
    }

    @Test
    fun `closeShift returns false when shift not found or already closed`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "date-1", startTime = "7am", endTime = "2pm")

            val result = service.closeShift(shiftId, finalAmount = 100.0, difference = 0.0)
            assertFalse(result)
        }
    }

    @Test
    fun `updateShift returns false if ID is null`() {
        runBlocking {
            val userId = seedUser()
            val shiftWithNullId =
                Shift(
                    id = null,
                    userId = userId,
                    shiftDate = "date-1",
                    startTime = "7am",
                    endTime = "2pm",
                    notes = "note-1",
                )
            val result = service.updateShift(shiftWithNullId)
            assertFalse(result)
        }
    }

    @Test
    fun `updateShift returns false if user does not exist`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "date-1", endTime = "2pm")
            val shiftToUpdate =
                Shift(
                    id = shiftId,
                    userId = UUID.randomUUID().toString(),
                    shiftDate = "date-1",
                    startTime = "7am",
                    endTime = "2pm",
                    notes = "note-1",
                )
            val result = service.updateShift(shiftToUpdate)
            assertFalse(result)
        }
    }

    @Test
    fun `updateShift returns true on success`() {
        runBlocking {
            val userId = seedUser()
            val shiftId = ExposedTestDb.seedShift(userId, shiftDate = "date-1", endTime = "2pm")
            val shiftToUpdate =
                Shift(
                    id = shiftId,
                    userId = userId,
                    shiftDate = "date-1",
                    startTime = "8am",
                    endTime = "3pm",
                    notes = "updated note",
                )
            val result = service.updateShift(shiftToUpdate)
            assertTrue(result)

            val updated = service.getShiftById(shiftId)
            assertEquals("8am", updated?.startTime)
            assertEquals("updated note", updated?.notes)
        }
    }

    @Test
    fun `updateShift returns false when not found`() {
        runBlocking {
            val userId = seedUser()
            val shiftToUpdate =
                Shift(
                    id = UUID.randomUUID().toString(),
                    userId = userId,
                    shiftDate = "date-1",
                    startTime = "8am",
                    endTime = "3pm",
                    notes = "updated note",
                )
            val result = service.updateShift(shiftToUpdate)
            assertFalse(result)
        }
    }
}
