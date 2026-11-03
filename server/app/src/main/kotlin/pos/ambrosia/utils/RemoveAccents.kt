package pos.ambrosia.utils

import java.text.Normalizer

private val COMBINING_MARKS = Regex("\\p{M}+")

fun removeAccents(text: String): String = Normalizer.normalize(text, Normalizer.Form.NFD).replace(COMBINING_MARKS, "")
