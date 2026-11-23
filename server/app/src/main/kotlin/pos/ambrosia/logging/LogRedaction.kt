package pos.ambrosia.logging

object LogRedaction {
    const val REDACTED_PLACEHOLDER = "***"
    private const val MINIMUM_UNQUOTED_CREDENTIAL_LENGTH = 16
    private const val SENSITIVE_KEY_ALTERNATIVES =
        "password|passwd|pin|secret|token|seed|mnemonic|authorization|api[-_]?key|private[-_]?key|" +
            "access[-_]?token|refresh[-_]?token|http-password|webhook-secret"

    private val sensitiveAssignmentPattern =
        Regex("(?i)\\b($SENSITIVE_KEY_ALTERNATIVES)(\\s*=\\s*)([^\\s\"',&}]+)")
    private val sensitiveQuotedValuePattern =
        Regex("(?i)\\b($SENSITIVE_KEY_ALTERNATIVES)(\"?\\s*:\\s*\")([^\"]+)")
    private val sensitiveColonValuePattern =
        Regex("(?i)\\b($SENSITIVE_KEY_ALTERNATIVES)(\"?\\s*:\\s*)([^\\s\"',&}]+)")
    private val bearerTokenPattern = Regex("(?i)\\bbearer\\s+[A-Za-z0-9._~+/=-]+")
    private val basicAuthorizationPattern = Regex("(?i)\\bbasic\\s+[A-Za-z0-9+/=]{8,}")
    private val nostrWalletConnectUriPattern = Regex("(?i)nostr\\+walletconnect://[^\\s\"']+")
    private val jsonWebTokenPattern = Regex("\\beyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+")
    private val urlCredentialsPattern = Regex("(?i)(https?://)[^\\s/@:]+:[^\\s/@]+@")

    fun redact(logText: String): String {
        if (logText.isEmpty()) return logText
        return logText
            .replace(nostrWalletConnectUriPattern, "nostr+walletconnect://$REDACTED_PLACEHOLDER")
            .replace(urlCredentialsPattern) { urlCredentialsMatch -> "${urlCredentialsMatch.groupValues[1]}$REDACTED_PLACEHOLDER@" }
            .replace(bearerTokenPattern, "Bearer $REDACTED_PLACEHOLDER")
            .replace(basicAuthorizationPattern, "Basic $REDACTED_PLACEHOLDER")
            .replace(jsonWebTokenPattern, REDACTED_PLACEHOLDER)
            .replace(sensitiveAssignmentPattern, ::redactSensitiveValue)
            .replace(sensitiveQuotedValuePattern, ::redactSensitiveValue)
            .replace(sensitiveColonValuePattern) { sensitiveColonValueMatch ->
                val (_, _, sensitiveValueCandidate) = sensitiveColonValueMatch.destructured
                if (looksLikeCredential(sensitiveValueCandidate)) {
                    redactSensitiveValue(sensitiveColonValueMatch)
                } else {
                    sensitiveColonValueMatch.value
                }
            }
    }

    private fun redactSensitiveValue(sensitiveValueMatch: MatchResult): String {
        val (sensitiveKey, keyValueSeparator) = sensitiveValueMatch.destructured
        return "$sensitiveKey$keyValueSeparator$REDACTED_PLACEHOLDER"
    }

    private fun looksLikeCredential(sensitiveValueCandidate: String): Boolean =
        sensitiveValueCandidate.any { candidateCharacter -> candidateCharacter.isDigit() } ||
            sensitiveValueCandidate.length >= MINIMUM_UNQUOTED_CREDENTIAL_LENGTH
}
