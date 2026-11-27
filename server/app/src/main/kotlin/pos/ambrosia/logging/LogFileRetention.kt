package pos.ambrosia.logging

data class LogFileRetention(
    val retentionDays: Int,
    val maximumTotalSizeMegabytes: Int,
) {
    companion object {
        const val DEFAULT_RETENTION_DAYS = 7
        const val DEFAULT_MAXIMUM_TOTAL_SIZE_MEGABYTES = 20

        val CONFIGURABLE_RETENTION_DAYS = listOf(1, 3, 7, 14, 30)
        val CONFIGURABLE_MAXIMUM_TOTAL_SIZE_MEGABYTES = listOf(10, 20, 50, 100)

        val DEFAULT = LogFileRetention(DEFAULT_RETENTION_DAYS, DEFAULT_MAXIMUM_TOTAL_SIZE_MEGABYTES)

        fun isConfigurable(
            retentionDays: Int,
            maximumTotalSizeMegabytes: Int,
        ): Boolean =
            retentionDays in CONFIGURABLE_RETENTION_DAYS &&
                maximumTotalSizeMegabytes in CONFIGURABLE_MAXIMUM_TOTAL_SIZE_MEGABYTES

        fun fromConfigValues(configValues: Map<String, String>): LogFileRetention =
            LogFileRetention(
                retentionDays =
                    configValues[LogSettingsConfigKeys.RETENTION_DAYS]
                        ?.trim()
                        ?.toIntOrNull()
                        ?.takeIf { configuredRetentionDays -> configuredRetentionDays in CONFIGURABLE_RETENTION_DAYS }
                        ?: DEFAULT_RETENTION_DAYS,
                maximumTotalSizeMegabytes =
                    configValues[LogSettingsConfigKeys.MAXIMUM_TOTAL_SIZE_MEGABYTES]
                        ?.trim()
                        ?.toIntOrNull()
                        ?.takeIf { configuredMaximumTotalSizeMegabytes ->
                            configuredMaximumTotalSizeMegabytes in CONFIGURABLE_MAXIMUM_TOTAL_SIZE_MEGABYTES
                        }
                        ?: DEFAULT_MAXIMUM_TOTAL_SIZE_MEGABYTES,
            )
    }
}
