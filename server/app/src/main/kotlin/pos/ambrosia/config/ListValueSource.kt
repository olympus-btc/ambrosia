package pos.ambrosia.config

import com.github.ajalt.clikt.core.Context
import com.github.ajalt.clikt.parameters.options.Option
import com.github.ajalt.clikt.sources.ValueSource
import kotlinx.io.files.Path

class ListValueSource(
    private val values: List<Pair<String, String>>,
    private val getKey: (Context, Option) -> String = ValueSource.getKey(joinSubcommands = "."),
) : ValueSource {
    override fun getValues(
        context: Context,
        option: Option,
    ): List<ValueSource.Invocation> =
        values
            .filter { it.first == (option.valueSourceKey ?: getKey(context, option)) }
            .map { ValueSource.Invocation.value(it.second) }

    companion object {
        fun fromFile(confFile: Path): ListValueSource {
            val values = readConfFile(confFile)
            return ListValueSource(values)
        }
    }
}
