package pos.ambrosia.util

import java.util.UUID

fun UUID.toBytes(): ByteArray {
    val byteArray = ByteArray(16)
    val bb = java.nio.ByteBuffer.wrap(byteArray)
    bb.putLong(this.mostSignificantBits)
    bb.putLong(this.leastSignificantBits)
    return byteArray
}

fun ByteArray.toUUID(): UUID {
    val bb = java.nio.ByteBuffer.wrap(this)
    val mostSigBits = bb.getLong()
    val leastSigBits = bb.getLong()
    return UUID(mostSigBits, leastSigBits)
}
