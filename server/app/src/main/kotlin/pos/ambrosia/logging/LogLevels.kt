package pos.ambrosia.logging

object LogLevels {
    const val TRACE = "TRACE"
    const val DEBUG = "DEBUG"
    const val INFO = "INFO"
    const val WARN = "WARN"
    const val ERROR = "ERROR"

    const val DEFAULT_SERVER_LEVEL = INFO

    val CONFIGURABLE_SERVER_LEVELS = listOf(ERROR, WARN, INFO, DEBUG)

    private val severityByLevel =
        mapOf(
            TRACE to 0,
            DEBUG to 1,
            INFO to 2,
            WARN to 3,
            ERROR to 4,
        )

    fun normalizeOrNull(levelName: String?): String? {
        val upperCaseLevelName = levelName?.trim()?.uppercase() ?: return null
        return upperCaseLevelName.takeIf { candidateLevelName -> candidateLevelName in severityByLevel }
    }

    fun severityOf(levelName: String): Int = severityByLevel[levelName.uppercase()] ?: severityByLevel.getValue(INFO)

    fun isAtLeast(
        levelName: String,
        minimumLevelName: String?,
    ): Boolean {
        if (minimumLevelName == null) return true
        return severityOf(levelName) >= severityOf(minimumLevelName)
    }
}
