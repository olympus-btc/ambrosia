package pos.ambrosia.logging

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.isActive
import pos.ambrosia.models.LogEntry
import java.io.File
import java.io.RandomAccessFile
import java.nio.file.Files
import java.nio.file.attribute.BasicFileAttributes
import kotlin.time.Duration
import kotlin.time.Duration.Companion.seconds

private const val NEWLINE_BYTE: Byte = 10

class LogFileTailReader(
    private val headerLineParser: LogHeaderLineParser,
    private val maximumBytesToRead: Long = DEFAULT_MAXIMUM_BYTES_TO_READ,
) {
    fun readLatestEntries(
        logFilesNewestFirst: List<File>,
        maximumEntries: Int,
        filter: LogEntryFilter,
    ): List<LogEntry> {
        val matchingEntriesPerFileNewestFirst = mutableListOf<List<LogEntry>>()
        var collectedEntryCount = 0
        var remainingBytesToRead = maximumBytesToRead

        for (logFile in logFilesNewestFirst) {
            if (collectedEntryCount >= maximumEntries || remainingBytesToRead <= 0) break
            if (!logFile.isFile || !logFile.canRead()) continue
            val (tailLines, bytesRead) = readTailLines(logFile, remainingBytesToRead)
            remainingBytesToRead -= bytesRead
            val matchingEntries = parseLogLines(tailLines, headerLineParser).filter(filter::matches)
            matchingEntriesPerFileNewestFirst.add(matchingEntries)
            collectedEntryCount += matchingEntries.size
        }

        return matchingEntriesPerFileNewestFirst.asReversed().flatten().takeLast(maximumEntries)
    }

    private fun readTailLines(
        logFile: File,
        maximumBytes: Long,
    ): Pair<List<String>, Long> =
        RandomAccessFile(logFile, "r").use { randomAccessFile ->
            val fileLength = randomAccessFile.length()
            val readStartPosition = maxOf(0L, fileLength - maximumBytes)
            val tailBytes = ByteArray((fileLength - readStartPosition).toInt())
            randomAccessFile.seek(readStartPosition)
            randomAccessFile.readFully(tailBytes)
            val tailText = String(tailBytes, Charsets.UTF_8)
            val completeLinesText = if (readStartPosition > 0) tailText.substringAfter('\n', "") else tailText
            completeLinesText.lines() to tailBytes.size.toLong()
        }

    companion object {
        const val DEFAULT_MAXIMUM_BYTES_TO_READ = 4L * 1024 * 1024
    }
}

class LogFileFollower(
    private val logFile: File,
    private val headerLineParser: LogHeaderLineParser,
    private val pollInterval: Duration = 1.seconds,
) {
    fun follow(): Flow<LogEntry> =
        flow {
            var readPosition = if (logFile.isFile) logFile.length() else 0L
            var followedFileIdentity = readFileIdentityOrNull()
            while (currentCoroutineContext().isActive) {
                delay(pollInterval)
                if (!logFile.isFile) {
                    readPosition = 0L
                    continue
                }
                val currentFileIdentity = readFileIdentityOrNull()
                val currentFileLength = logFile.length()
                val fileWasReplaced = currentFileIdentity != null && currentFileIdentity != followedFileIdentity
                if (fileWasReplaced || currentFileLength < readPosition) readPosition = 0L
                followedFileIdentity = currentFileIdentity
                if (currentFileLength == readPosition) continue

                val newFileBytes = readFileBytes(readPosition, minOf(currentFileLength - readPosition, MAXIMUM_BYTES_PER_POLL))
                val lastNewlineIndex = newFileBytes.lastIndexOf(NEWLINE_BYTE)
                val consumedByteCount =
                    when {
                        lastNewlineIndex >= 0 -> lastNewlineIndex + 1
                        newFileBytes.size.toLong() == MAXIMUM_BYTES_PER_POLL -> newFileBytes.size
                        else -> 0
                    }
                if (consumedByteCount == 0) continue

                readPosition += consumedByteCount
                val completeLines = String(newFileBytes, 0, consumedByteCount, Charsets.UTF_8).trimEnd('\n').split('\n')
                parseLogLines(completeLines, headerLineParser).forEach { followedLogEntry -> emit(followedLogEntry) }
            }
        }.flowOn(Dispatchers.IO)

    private fun readFileIdentityOrNull(): Any? =
        runCatching { Files.readAttributes(logFile.toPath(), BasicFileAttributes::class.java).fileKey() }.getOrNull()

    private fun readFileBytes(
        startPosition: Long,
        byteCount: Long,
    ): ByteArray =
        RandomAccessFile(logFile, "r").use { randomAccessFile ->
            val fileBytes = ByteArray(byteCount.toInt())
            randomAccessFile.seek(startPosition)
            randomAccessFile.readFully(fileBytes)
            fileBytes
        }

    companion object {
        const val MAXIMUM_BYTES_PER_POLL = 512L * 1024
    }
}
