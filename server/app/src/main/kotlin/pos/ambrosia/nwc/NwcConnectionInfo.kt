package pos.ambrosia.nwc

import java.net.URI
import java.net.URLDecoder

data class NwcConnectionInfo(
    val walletPubkeyHex: String,
    val relayUrl: String,
    val secretHex: String,
    val lud16: String? = null,
)

fun parseNwcUri(uri: String): NwcConnectionInfo {
    require(uri.startsWith("nostr+walletconnect://")) { "Invalid NWC URI: must start with nostr+walletconnect://" }

    val uriWithHttpsScheme = uri.replaceFirst("nostr+walletconnect://", "https://")
    val parsedNwcUri = URI(uriWithHttpsScheme)
    val pubkey = parsedNwcUri.host
    require(pubkey.length == 64) { "Invalid NWC URI: wallet pubkey must be 64 hex characters" }

    val params =
        (parsedNwcUri.rawQuery ?: "")
            .split("&")
            .filter { it.contains("=") }
            .associate {
                val (key, value) = it.split("=", limit = 2)
                key to URLDecoder.decode(value, "UTF-8")
            }

    return NwcConnectionInfo(
        walletPubkeyHex = pubkey,
        relayUrl = params["relay"] ?: error("Missing 'relay' parameter in NWC URI"),
        secretHex = params["secret"] ?: error("Missing 'secret' parameter in NWC URI"),
        lud16 = params["lud16"],
    )
}
