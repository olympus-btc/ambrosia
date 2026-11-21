package pos.ambrosia.logging

import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.AppenderBase

class InMemoryLogBufferAppender : AppenderBase<ILoggingEvent>() {
    override fun append(loggingEvent: ILoggingEvent) {
        runCatching { ServerLogBuffer.append(loggingEvent.toLogEntry()) }
    }
}
