package pos.ambrosia.config

import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.request.get
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import kotlinx.coroutines.runBlocking
import java.io.File
import java.security.MessageDigest
import java.security.SecureRandom
// import java.util.*

/**
 * Service for generating secure seeds/passphrases similar to the install.sh script.
 * Uses Diceware methodology for generating cryptographically secure passphrases.
 */
object SeedGenerator {
    val NUM_WORDS: Int = 12
    private const val FALLBACK_WORDLIST_URL =
        """
            https://raw.githubusercontent.com/olympus-btc/Ambrosia-POS/main/scripts/eff_large_wordlist.txt
        """

    /**
     * Downloads the wordlist from the fallback URL
     */
    private suspend fun downloadWordlist(): List<String> {
        val client = HttpClient(CIO)
        return try {
            val response: HttpResponse = client.get(FALLBACK_WORDLIST_URL)
            val content = response.bodyAsText()
            client.close()
            content.lines().filter { it.isNotBlank() }
        } catch (e: Exception) {
            client.close()
            throw IllegalStateException("Failed to download wordlist from fallback URL: ${e.message}", e)
        }
    }

    /**
     * Loads the EFF large wordlist from the local file, with fallback to GitHub
     */
    private fun loadWordlist(): List<String> {
        // Try to find the wordlist file in the project scripts directory
        val projectRoot = File(System.getProperty("user.dir")).parentFile.parentFile
        val wordlistFile = File(projectRoot, "scripts/eff_large_wordlist.txt")

        return if (wordlistFile.exists()) {
            // Load from local file
            wordlistFile
                .readText()
                .lines()
                .filter { it.isNotBlank() }
        } else {
            // Fallback to downloading from GitHub
            runBlocking {
                downloadWordlist()
            }
        }
    }

    /**
     * Generates a dice roll (5 digits, each 1-6) for Diceware
     */
    private fun generateDiceRoll(): String {
        val random = SecureRandom()
        return (1..5).map { (random.nextInt(6) + 1).toString() }.joinToString("")
    }

    /**
     * Gets a word from the wordlist using a dice roll
     */
    private fun getWordFromRoll(
        wordlist: List<String>,
        roll: String,
    ): String? = wordlist.find { it.startsWith(roll) }?.substringAfter("\t")

    fun generateSeed(): String {
        val wordlist = loadWordlist()
        val seedWords = mutableListOf<String>()

        repeat(NUM_WORDS) {
            var word: String?
            do {
                val roll = generateDiceRoll()
                word = getWordFromRoll(wordlist, roll)
            } while (word == null)
            seedWords.add(word)
        }
        return seedWords.joinToString(" ")
    }

    /**
     * Generates a secure random seed and returns its SHA-256 hash as a hex string.
     */
    fun generateSecureSeed(seedInput: String): String {
        // Create SHA-256 hash of the seed
        val digest = MessageDigest.getInstance("SHA-256")
        val hashedSeed = digest.digest(seedInput.toByteArray())

        return hashedSeed.joinToString("") { "%02x".format(it) }
    }
}
