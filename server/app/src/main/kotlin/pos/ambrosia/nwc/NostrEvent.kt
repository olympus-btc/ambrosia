package pos.ambrosia.nwc

import app.cash.nostrino.crypto.SecKey
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonArray
import okio.ByteString.Companion.toByteString
import java.security.MessageDigest
import java.time.Instant

@Serializable
data class NostrEvent(
    val id: String,
    val pubkey: String,
    @SerialName("created_at")
    val createdAt: Long,
    val kind: Int,
    val tags: List<List<String>>,
    val content: String,
    val sig: String,
) {
    companion object {
        private val json = Json { ignoreUnknownKeys = true }

        fun fromJson(text: String): NostrEvent = json.decodeFromString(text)
    }

    fun toJson(): String = json.encodeToString(this)
}

fun createSignedEvent(
    secKey: SecKey,
    kind: Int,
    content: String,
    tags: List<List<String>>,
    createdAt: Long = Instant.now().epochSecond,
): NostrEvent {
    val pubkeyHex = secKey.pubKey.key.hex()

    val preimage = serializeEventForNip01Id(pubkeyHex, createdAt, kind, tags, content)

    val idBytes =
        MessageDigest
            .getInstance("SHA-256")
            .digest(preimage.toByteArray(Charsets.UTF_8))
    val idHex = idBytes.joinToString("") { "%02x".format(it) }

    val sig = secKey.sign(idBytes.toByteString())

    return NostrEvent(
        id = idHex,
        pubkey = pubkeyHex,
        createdAt = createdAt,
        kind = kind,
        tags = tags,
        content = content,
        sig = sig.hex(),
    )
}

private fun serializeEventForNip01Id(
    pubkeyHex: String,
    createdAt: Long,
    kind: Int,
    tags: List<List<String>>,
    content: String,
): String =
    Json.encodeToString(
        buildJsonArray {
            add(0)
            add(pubkeyHex)
            add(createdAt)
            add(kind)
            add(
                buildJsonArray {
                    tags.forEach { tag ->
                        add(buildJsonArray { tag.forEach { add(it) } })
                    }
                },
            )
            add(content)
        },
    )
