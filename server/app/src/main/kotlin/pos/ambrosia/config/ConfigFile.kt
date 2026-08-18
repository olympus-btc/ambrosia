package pos.ambrosia.config

import kotlinx.io.buffered
import kotlinx.io.files.Path
import kotlinx.io.files.SystemFileSystem
import kotlinx.io.readLine
import java.io.File

fun readConfFile(confFile: Path): List<Pair<String, String>> =
    buildList {
        if (SystemFileSystem.exists(confFile)) {
            SystemFileSystem.source(confFile).buffered().use {
                while (true) {
                    val line = it.readLine() ?: break
                    val equalsIndex = line.indexOf('=')
                    if (equalsIndex > 0) add(line.substring(0, equalsIndex) to line.substring(equalsIndex + 1))
                }
            }
        }
    }

fun readConfValues(confFile: Path): Map<String, String> = readConfFile(confFile).toMap()

fun writeConfValues(
    confFile: Path,
    nextValues: Map<String, String>,
) {
    val existingLines =
        if (SystemFileSystem.exists(confFile)) {
            File(confFile.toString()).readLines()
        } else {
            emptyList()
        }
    val configKeysToReplace = nextValues.keys
    val preservedConfigLines =
        existingLines.filterNot { line ->
            val configKey = line.substringBefore("=", missingDelimiterValue = "")
            configKey in configKeysToReplace
        }
    File(confFile.toString()).writeText(
        (preservedConfigLines + nextValues.map { (key, value) -> "$key=$value" })
            .joinToString("\n")
            .trimEnd() + "\n",
    )
}

fun replaceConfFileProperty(
    confFile: Path,
    key: String,
    value: String,
): Boolean {
    val file = File(confFile.toString())
    val existingLines = if (file.exists()) file.readLines() else emptyList()
    val updatedLines = mutableListOf<String>()
    var replaced = false

    existingLines.forEach { line ->
        if (line.trimStart().startsWith("$key=")) {
            if (!replaced) {
                updatedLines.add("$key=$value")
                replaced = true
            }
        } else {
            updatedLines.add(line)
        }
    }

    if (!replaced) {
        updatedLines.add("$key=$value")
    }

    val fileChanged = existingLines != updatedLines
    if (fileChanged) {
        file.writeText(updatedLines.joinToString(separator = "\n", postfix = "\n"))
    }
    return fileChanged
}
