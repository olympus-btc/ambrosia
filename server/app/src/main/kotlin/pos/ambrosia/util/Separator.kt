package pos.ambrosia.util

fun formatTicketLine(
    text1: String,
    text2: String,
    totalWidth: Int = 48,
): String {
    val spaces = totalWidth - text1.length - text2.length
    return if (spaces > 0) {
        text1 + " ".repeat(spaces) + text2
    } else {
        val availableWidthForText1 = totalWidth - text2.length - 1
        if (availableWidthForText1 > 0) {
            text1.substring(0, availableWidthForText1) + " " + text2
        } else {
            " ".repeat(totalWidth - text2.length) + text2
        }
    }
}
