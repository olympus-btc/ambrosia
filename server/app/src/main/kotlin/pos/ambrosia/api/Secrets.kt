package pos.ambrosia.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.auth.authenticate
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import pos.ambrosia.config.readConfValues
import pos.ambrosia.models.ActivateSecretsEncryptionRequest
import pos.ambrosia.models.Message
import pos.ambrosia.models.SecretsStatusResponse
import pos.ambrosia.models.UnlockSecretsRequest
import pos.ambrosia.services.SecretsStore
import pos.ambrosia.utils.InvalidCredentialsException

fun Application.configureSecrets() {
    routing {
        route("/secrets") {
            authenticate("auth-jwt") {
                get("/lock-status") {
                    call.respond(
                        HttpStatusCode.OK,
                        SecretsStatusResponse(
                            encryptionActive = SecretsStore.isEncryptionActive(),
                            locked = SecretsStore.isLocked(),
                        ),
                    )
                }
            }
            authenticate("auth-jwt-wallet") {
                get("/status") {
                    call.respond(
                        HttpStatusCode.OK,
                        SecretsStatusResponse(
                            encryptionActive = SecretsStore.isEncryptionActive(),
                            locked = SecretsStore.isLocked(),
                        ),
                    )
                }
                post("/unlock") {
                    val unlockRequest = call.receive<UnlockSecretsRequest>()
                    val unlockSucceeded = SecretsStore.unlock(unlockRequest.unlockPassword.toCharArray())
                    if (!unlockSucceeded) {
                        throw InvalidCredentialsException()
                    }
                    call.respond(HttpStatusCode.OK, Message("Secrets unlocked"))
                }
                post("/activate") {
                    val activateRequest = call.receive<ActivateSecretsEncryptionRequest>()
                    val currentPlaintextValues = readConfValues(SecretsStore.ambrosiaConfigFile)
                    SecretsStore.activateEncryption(activateRequest.unlockPassword.toCharArray(), currentPlaintextValues)
                    call.respond(HttpStatusCode.OK, Message("Secrets encryption activated"))
                }
            }
        }
    }
}
