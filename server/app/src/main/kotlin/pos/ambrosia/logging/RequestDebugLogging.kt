package pos.ambrosia.logging

import io.ktor.server.application.createApplicationPlugin
import io.ktor.server.application.hooks.ResponseSent
import io.ktor.server.request.httpMethod
import io.ktor.server.request.path
import io.ktor.util.AttributeKey
import org.slf4j.LoggerFactory

private val requestStartNanosecondsKey = AttributeKey<Long>("RequestDebugLoggingStartNanoseconds")
private val requestDebugLogger = LoggerFactory.getLogger(LoggerNames.HTTP_REQUESTS)
private val pathsExcludedFromRequestDebugLogging = setOf("/health")
private const val NANOSECONDS_PER_MILLISECOND = 1_000_000

val RequestDebugLogging =
    createApplicationPlugin(name = "RequestDebugLogging") {
        onCall { applicationCall ->
            if (requestDebugLogger.isDebugEnabled) {
                applicationCall.attributes.put(requestStartNanosecondsKey, System.nanoTime())
            }
        }

        on(ResponseSent) { applicationCall ->
            val requestStartNanoseconds = applicationCall.attributes.getOrNull(requestStartNanosecondsKey) ?: return@on
            val requestPath = applicationCall.request.path()
            if (requestPath in pathsExcludedFromRequestDebugLogging) return@on
            val requestDurationMilliseconds = (System.nanoTime() - requestStartNanoseconds) / NANOSECONDS_PER_MILLISECOND
            requestDebugLogger.debug(
                "{} {} {} {}ms",
                applicationCall.request.httpMethod.value,
                requestPath,
                applicationCall.response.status()?.value ?: "-",
                requestDurationMilliseconds,
            )
        }
    }
