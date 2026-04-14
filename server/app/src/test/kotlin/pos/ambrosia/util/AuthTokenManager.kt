package pos.ambrosia.test

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import kotlinx.serialization.Serializable
import pos.ambrosia.models.AuthRequest
import pos.ambrosia.models.AuthResponse
import pos.ambrosia.models.TokenResponse

class AuthTokenManager {
    var accessToken: String? = null
    var refreshToken: String? = null

    suspend fun login(client: HttpClient) {
        val response =
            client.post("/auth/login") {
                contentType(ContentType.Application.Json)
                setBody(AuthRequest("cool", "password123"))
            }

        if (response.status == HttpStatusCode.OK) {
            val tokens = response.body<TokenResponse>()
            this.accessToken = tokens.accessToken
            this.refreshToken = tokens.refreshToken
        } else {
            throw IllegalStateException("Login fallido para las pruebas.")
        }
    }

    private suspend fun refresh(client: HttpClient) {
        println("💡 Token expirado, intentando refrescar...")
        val response =
            client.post("/auth/refresh") {
                bearerAuth(this@AuthTokenManager.refreshToken!!)
            }

        if (response.status == HttpStatusCode.OK) {
            val newTokens = response.body<TokenResponse>()
            this.accessToken = newTokens.accessToken
            this.refreshToken = newTokens.refreshToken
            println("✅ Token refrescado exitosamente.")
        } else {
            throw IllegalStateException("No se pudo refrescar el token. El refresh token puede ser inválido.")
        }
    }
}
