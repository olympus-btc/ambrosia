package pos.ambrosia.logging

import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import pos.ambrosia.models.LogEntry

object ServerLogBuffer {
    const val MAXIMUM_BUFFERED_ENTRIES = 2000
    private const val LIVE_ENTRIES_BUFFER_CAPACITY = 512

    private val bufferedEntries = ArrayDeque<LogEntry>()
    private val mutableLiveEntries =
        MutableSharedFlow<LogEntry>(
            extraBufferCapacity = LIVE_ENTRIES_BUFFER_CAPACITY,
            onBufferOverflow = BufferOverflow.DROP_OLDEST,
        )

    val liveEntries: SharedFlow<LogEntry> = mutableLiveEntries.asSharedFlow()

    fun append(logEntry: LogEntry) {
        synchronized(bufferedEntries) {
            if (bufferedEntries.size >= MAXIMUM_BUFFERED_ENTRIES) {
                bufferedEntries.removeFirst()
            }
            bufferedEntries.addLast(logEntry)
        }
        mutableLiveEntries.tryEmit(logEntry)
    }

    fun snapshot(): List<LogEntry> = synchronized(bufferedEntries) { bufferedEntries.toList() }

    fun clear() {
        synchronized(bufferedEntries) { bufferedEntries.clear() }
    }
}
