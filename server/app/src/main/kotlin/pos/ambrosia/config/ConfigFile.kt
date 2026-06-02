package pos.ambrosia.config

import kotlinx.io.buffered
import kotlinx.io.files.Path
import kotlinx.io.files.SystemFileSystem
import kotlinx.io.readLine

fun readConfFile(confFile: Path): List<Pair<String, String>> =
    buildList {
        if (SystemFileSystem.exists(confFile)) {
            SystemFileSystem.source(confFile).buffered().use {
                while (true) {
                    val line = it.readLine() ?: break
                    val idx = line.indexOf('=')
                    if (idx > 0) add(line.substring(0, idx) to line.substring(idx + 1))
                }
            }
        }
    }
