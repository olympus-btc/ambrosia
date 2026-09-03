package pos.ambrosia.utils

import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.header
import io.ktor.client.request.setBody
import io.ktor.http.HttpHeaders
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.config.MapApplicationConfig
import io.ktor.server.engine.applicationEnvironment
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import pos.ambrosia.api.handler
import pos.ambrosia.configureAuthentication
import pos.ambrosia.db.tables.PermissionEntity
import pos.ambrosia.db.tables.PermissionsTable
import pos.ambrosia.db.tables.RoleEntity
import pos.ambrosia.db.tables.UserEntity
import pos.ambrosia.services.PermissionsService
import java.util.UUID

fun routeTest(block: suspend ApplicationTestBuilder.() -> Unit) {
    val databaseFile = ExposedTestDb.connect()
    try {
        testApplication { block() }
    } finally {
        ExposedTestDb.cleanup(databaseFile)
    }
}

fun ApplicationTestBuilder.installAuthenticationWithoutUser(secret: String = TEST_SECRET) {
    environment {
        config =
            MapApplicationConfig(
                "secret" to secret,
                "jwt.issuer" to TEST_ISSUER,
                "jwt.audience" to TEST_AUDIENCE,
            )
    }
    application { configureAuthentication() }
}

fun ApplicationTestBuilder.installRoutes(setup: Application.() -> Unit) {
    application {
        install(ContentNegotiation) { json() }
        handler()
        setup()
    }
}

fun HttpRequestBuilder.jsonBody(body: String) {
    header(HttpHeaders.ContentType, "application/json")
    setBody(body)
}

fun grantPermissions(
    roleName: String,
    vararg permissions: String,
) {
    val roleId = ExposedTestDb.seedRole(roleName)
    permissions.forEach { permission -> ensurePermission(permission) }
    PermissionsService().replaceRolePermissions(roleId, permissions.toList())
}

private fun ensurePermission(name: String): String =
    transaction {
        PermissionEntity
            .find { PermissionsTable.name eq name }
            .firstOrNull()
            ?.id
            ?.value
            ?.toString()
            ?: ExposedTestDb.seedPermission(name)
    }

fun setRolePassword(
    roleId: String,
    password: String,
    secret: String = TEST_SECRET,
) {
    val hash = SecurePinProcessor.hashPinForStorage(password.toCharArray(), roleId, testEnvironment(secret))
    transaction {
        RoleEntity.findById(UUID.fromString(roleId))?.password = SecurePinProcessor.byteArrayToBase64(hash)
    }
}

fun setUserPin(
    userId: String,
    pin: String,
    secret: String = TEST_SECRET,
) {
    val hash = SecurePinProcessor.hashPinForStorage(pin.toCharArray(), userId, testEnvironment(secret))
    transaction {
        UserEntity.findById(UUID.fromString(userId))?.pin = SecurePinProcessor.byteArrayToBase64(hash)
    }
}

fun testEnvironment(secret: String = TEST_SECRET) =
    applicationEnvironment {
        config =
            MapApplicationConfig(
                "secret" to secret,
                "jwt.issuer" to TEST_ISSUER,
                "jwt.audience" to TEST_AUDIENCE,
            )
    }
