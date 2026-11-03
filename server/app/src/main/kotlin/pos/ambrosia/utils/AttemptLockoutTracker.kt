package pos.ambrosia.utils

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.ApplicationCall
import io.ktor.server.response.respond
import java.util.concurrent.ConcurrentHashMap

class AttemptLockoutTracker {
    private data class AttemptState(
        val failureCount: Int,
        val blockUntil: Long,
    )

    private val stateByKey = ConcurrentHashMap<String, AttemptState>()

    companion object {
        private const val FREE_ATTEMPTS = 5
        private const val MINUTE_IN_MILLISECONDS = 60_000L

        private val FIBONACCI_BACKOFF_MINUTES =
            longArrayOf(
                0,
                1,
                1,
                2,
                3,
                5,
                8,
                13,
                21,
                34,
                55,
                89,
                144,
                233,
                377,
                610,
                987,
                1_597,
                2_584,
                4_181,
                6_765,
                10_946,
                17_711,
                28_657,
                46_368,
                75_025,
            )
    }

    fun isBlocked(key: String): Boolean {
        val attemptState = stateByKey[key] ?: return false
        return System.currentTimeMillis() < attemptState.blockUntil
    }

    fun getRemainingSeconds(key: String): Int {
        val attemptState = stateByKey[key] ?: return 0
        val remainingMilliseconds = attemptState.blockUntil - System.currentTimeMillis()
        return if (remainingMilliseconds > 0) ((remainingMilliseconds + 999) / 1000).toInt() else 0
    }

    fun recordFailure(key: String) {
        val now = System.currentTimeMillis()
        stateByKey.compute(key) { _, existingState ->
            val newCount = (existingState?.failureCount ?: 0) + 1
            val fibonacciIndex = newCount - FREE_ATTEMPTS
            val backoffMinutes =
                if (fibonacciIndex > 0) {
                    FIBONACCI_BACKOFF_MINUTES.getOrElse(fibonacciIndex) { FIBONACCI_BACKOFF_MINUTES.last() }
                } else {
                    0L
                }
            AttemptState(newCount, now + backoffMinutes * MINUTE_IN_MILLISECONDS)
        }
    }

    fun reset(key: String) {
        stateByKey.remove(key)
    }
}

suspend fun ApplicationCall.respondIfLockedOut(
    tracker: AttemptLockoutTracker,
    key: String,
): Boolean {
    if (!tracker.isBlocked(key)) return false
    val retryAfter = tracker.getRemainingSeconds(key)
    response.headers.append("Retry-After", retryAfter.toString())
    respond(HttpStatusCode.TooManyRequests, mapOf("retryAfter" to retryAfter))
    return true
}

suspend fun ApplicationCall.recordFailureAndRespondIfLockedOut(
    tracker: AttemptLockoutTracker,
    key: String,
): Boolean {
    tracker.recordFailure(key)
    val retryAfter = tracker.getRemainingSeconds(key)
    if (retryAfter <= 0) return false
    response.headers.append("Retry-After", retryAfter.toString())
    respond(HttpStatusCode.TooManyRequests, mapOf("retryAfter" to retryAfter))
    return true
}
