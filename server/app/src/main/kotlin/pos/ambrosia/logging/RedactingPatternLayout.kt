package pos.ambrosia.logging

import ch.qos.logback.classic.PatternLayout
import ch.qos.logback.classic.spi.ILoggingEvent

class RedactingPatternLayout : PatternLayout() {
    override fun doLayout(loggingEvent: ILoggingEvent): String = LogRedaction.redact(super.doLayout(loggingEvent))
}
