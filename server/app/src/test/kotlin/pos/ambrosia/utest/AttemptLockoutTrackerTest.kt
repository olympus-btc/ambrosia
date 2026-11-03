package pos.ambrosia.utest

import pos.ambrosia.utils.AttemptLockoutTracker
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AttemptLockoutTrackerTest {
    @Test
    fun `a key with no recorded failures is not blocked`() {
        val lockoutTracker = AttemptLockoutTracker()

        assertFalse(lockoutTracker.isBlocked("fresh-key"))
        assertEquals(0, lockoutTracker.getRemainingSeconds("fresh-key"))
    }

    @Test
    fun `the first five failures do not trigger a block`() {
        val lockoutTracker = AttemptLockoutTracker()

        repeat(5) { lockoutTracker.recordFailure("free-attempts-key") }

        assertFalse(lockoutTracker.isBlocked("free-attempts-key"))
    }

    @Test
    fun `the sixth consecutive failure triggers a block`() {
        val lockoutTracker = AttemptLockoutTracker()

        repeat(6) { lockoutTracker.recordFailure("sixth-failure-key") }

        assertTrue(lockoutTracker.isBlocked("sixth-failure-key"))
        assertTrue(lockoutTracker.getRemainingSeconds("sixth-failure-key") > 0)
    }

    @Test
    fun `the block duration grows with further consecutive failures`() {
        val lockoutTracker = AttemptLockoutTracker()

        repeat(6) { lockoutTracker.recordFailure("escalating-key") }
        val remainingAfterSixthFailure = lockoutTracker.getRemainingSeconds("escalating-key")

        repeat(2) { lockoutTracker.recordFailure("escalating-key") }
        val remainingAfterEighthFailure = lockoutTracker.getRemainingSeconds("escalating-key")

        assertTrue(remainingAfterEighthFailure > remainingAfterSixthFailure)
    }

    @Test
    fun `reset clears the block immediately`() {
        val lockoutTracker = AttemptLockoutTracker()
        repeat(6) { lockoutTracker.recordFailure("reset-key") }
        assertTrue(lockoutTracker.isBlocked("reset-key"))

        lockoutTracker.reset("reset-key")

        assertFalse(lockoutTracker.isBlocked("reset-key"))
        assertEquals(0, lockoutTracker.getRemainingSeconds("reset-key"))
    }

    @Test
    fun `blocking one key does not affect a different key`() {
        val lockoutTracker = AttemptLockoutTracker()
        repeat(6) { lockoutTracker.recordFailure("blocked-key") }

        assertTrue(lockoutTracker.isBlocked("blocked-key"))
        assertFalse(lockoutTracker.isBlocked("independent-key"))
    }
}
