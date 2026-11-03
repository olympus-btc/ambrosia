package pos.ambrosia.utils

import org.jetbrains.exposed.v1.core.CustomFunction
import org.jetbrains.exposed.v1.core.Expression
import org.jetbrains.exposed.v1.core.VarCharColumnType

object SqlDateFunctions {
    fun dateOnly(column: Expression<String>): CustomFunction<String> = CustomFunction("date", VarCharColumnType(), column)

    fun dateTime(column: Expression<String>): CustomFunction<String> = CustomFunction("datetime", VarCharColumnType(), column)
}
