package pos.ambrosia.utest

import pos.ambrosia.services.SessionResetScheduler
import java.time.Duration
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlin.test.Test
import kotlin.test.assertEquals

class SessionResetSchedulerTest {
    private val zoneId = ZoneId.of("America/Mexico_City")

    @Test
    fun `millisecondsUntilNextOccurrenceOfHour schedules later today when the target hour has not passed yet`() {
        val now = ZonedDateTime.of(2026, 11, 18, 3, 0, 0, 0, zoneId)

        val delayMilliseconds = SessionResetScheduler.millisecondsUntilNextOccurrenceOfHour(6, zoneId, now)

        assertEquals(3 * 60 * 60 * 1000L, delayMilliseconds)
    }

    @Test
    fun `millisecondsUntilNextOccurrenceOfHour schedules tomorrow when the target hour already passed today`() {
        val now = ZonedDateTime.of(2026, 11, 18, 9, 30, 0, 0, zoneId)

        val delayMilliseconds = SessionResetScheduler.millisecondsUntilNextOccurrenceOfHour(6, zoneId, now)

        val tomorrowAtTargetHour = ZonedDateTime.of(2026, 11, 19, 6, 0, 0, 0, zoneId)
        val expectedMilliseconds =
            Duration
                .between(now, tomorrowAtTargetHour)
                .toMillis()
        assertEquals(expectedMilliseconds, delayMilliseconds)
    }

    @Test
    fun `millisecondsUntilNextOccurrenceOfHour schedules tomorrow when now is exactly the target hour`() {
        val now = ZonedDateTime.of(2026, 11, 18, 6, 0, 0, 0, zoneId)

        val delayMilliseconds = SessionResetScheduler.millisecondsUntilNextOccurrenceOfHour(6, zoneId, now)

        assertEquals(24 * 60 * 60 * 1000L, delayMilliseconds)
    }
}
