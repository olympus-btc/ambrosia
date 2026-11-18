package pos.ambrosia.services

import pos.ambrosia.logger
import java.awt.Color
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.ConcurrentHashMap
import javax.imageio.ImageIO
import kotlin.math.roundToInt

class TicketLogoLoader(
    uploadRoot: Path,
) {
    companion object {
        private const val UPLOADS_PATH_PREFIX = "/uploads/"
        private const val MAXIMUM_CACHED_LOGO_COUNT = 8
    }

    private data class ScaledLogoCacheKey(
        val logoFile: Path,
        val lastModifiedMilliseconds: Long,
        val fileSizeBytes: Long,
        val targetWidthDots: Int,
    )

    private val normalizedUploadRoot: Path = uploadRoot.toAbsolutePath().normalize()
    private val scaledLogosByCacheKey = ConcurrentHashMap<ScaledLogoCacheKey, BufferedImage>()

    fun loadScaledLogo(
        storedLogoUrl: String,
        targetWidthDots: Int,
    ): BufferedImage? {
        val logoFile = resolveLogoFile(storedLogoUrl) ?: return null
        val scaledLogoCacheKey =
            ScaledLogoCacheKey(
                logoFile = logoFile,
                lastModifiedMilliseconds = Files.getLastModifiedTime(logoFile).toMillis(),
                fileSizeBytes = Files.size(logoFile),
                targetWidthDots = targetWidthDots,
            )
        scaledLogosByCacheKey[scaledLogoCacheKey]?.let { cachedScaledLogo -> return cachedScaledLogo }
        val sourceImage =
            ImageIO.read(logoFile.toFile()) ?: run {
                logger.warn("Unsupported logo image format: $storedLogoUrl")
                return null
            }
        val scaledLogo = scaleOntoWhiteBackground(sourceImage, targetWidthDots)
        if (scaledLogosByCacheKey.size >= MAXIMUM_CACHED_LOGO_COUNT) {
            scaledLogosByCacheKey.clear()
        }
        scaledLogosByCacheKey[scaledLogoCacheKey] = scaledLogo
        return scaledLogo
    }

    private fun resolveLogoFile(storedLogoUrl: String): Path? {
        val uploadsPathIndex = storedLogoUrl.indexOf(UPLOADS_PATH_PREFIX)
        if (uploadsPathIndex == -1) {
            logger.warn("Logo is not stored in uploads: $storedLogoUrl")
            return null
        }
        val relativeLogoPath = storedLogoUrl.substring(uploadsPathIndex + UPLOADS_PATH_PREFIX.length).substringBefore('?')
        val logoFile = normalizedUploadRoot.resolve(relativeLogoPath).normalize()
        if (!logoFile.startsWith(normalizedUploadRoot)) {
            logger.warn("Logo path escapes the uploads folder: $storedLogoUrl")
            return null
        }
        if (!Files.isRegularFile(logoFile)) {
            logger.warn("Logo file not found: $storedLogoUrl")
            return null
        }
        return logoFile
    }

    private fun scaleOntoWhiteBackground(
        sourceImage: BufferedImage,
        targetWidthDots: Int,
    ): BufferedImage {
        val scaledHeightDots = maxOf((sourceImage.height.toDouble() * targetWidthDots / sourceImage.width).roundToInt(), 1)
        val scaledImage = BufferedImage(targetWidthDots, scaledHeightDots, BufferedImage.TYPE_INT_RGB)
        val logoCanvas = scaledImage.createGraphics()
        try {
            logoCanvas.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR)
            logoCanvas.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
            logoCanvas.color = Color.WHITE
            logoCanvas.fillRect(0, 0, targetWidthDots, scaledHeightDots)
            logoCanvas.drawImage(sourceImage, 0, 0, targetWidthDots, scaledHeightDots, null)
        } finally {
            logoCanvas.dispose()
        }
        return scaledImage
    }
}
