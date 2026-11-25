package pos.ambrosia.services

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import pos.ambrosia.logger
import java.time.Duration
import java.time.ZoneId
import java.time.ZonedDateTime

class SessionResetScheduler(
    private val tokenService: TokenService,
    private val configService: ConfigService,
) {
    companion object {
        fun millisecondsUntilNextOccurrenceOfHour(
            hour: Int,
            zoneId: ZoneId,
            now: ZonedDateTime = ZonedDateTime.now(zoneId),
        ): Long {
            val todayAtHour =
                now
                    .withHour(hour)
                    .withMinute(0)
                    .withSecond(0)
                    .withNano(0)
            val nextOccurrence = if (todayAtHour.isAfter(now)) todayAtHour else todayAtHour.plusDays(1)
            return Duration
                .between(now, nextOccurrence)
                .toMillis()
        }
    }

    fun startDailyReset(scope: CoroutineScope) {
        scope.launch(Dispatchers.IO) {
            while (isActive) {
                val dailySessionResetHour = configService.getConfig()?.dailySessionResetHour ?: 6
                val zoneId = configService.getConfiguredZoneId()
                delay(millisecondsUntilNextOccurrenceOfHour(dailySessionResetHour, zoneId))
                tokenService.revokeAllRefreshTokens()
                logger.info("Revoked all refresh tokens for the scheduled daily session reset")
            }
        }
    }
}
