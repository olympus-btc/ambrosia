package pos.ambrosia.utils

fun requireValid(
    condition: Boolean,
    lazyMessage: () -> String,
) {
    if (!condition) throw RequestValidationException(lazyMessage())
}

fun requireMaxLength(
    fieldValue: String?,
    maxLength: Int,
    fieldName: String,
) {
    requireValid(fieldValue == null || fieldValue.length <= maxLength) { "$fieldName must be at most $maxLength characters" }
}
