package pos.ambrosia.utest

import pos.ambrosia.config.AppConfig
import kotlin.test.Test
import kotlin.test.assertEquals

class AppConfigTest {
    @Test
    fun `getLocalPhoenixdUrl returns the local phoenixd default url`() {
        assertEquals("http://localhost:9740", AppConfig.getLocalPhoenixdUrl())
    }
}
