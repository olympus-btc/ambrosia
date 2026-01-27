version = "0.5.1-alpha"

plugins {
  alias(libs.plugins.kotlin.jvm)
  alias(libs.plugins.ktor)
  alias(libs.plugins.kotlin.plugin.serialization)
  application
}

repositories {
  mavenCentral()
}

dependencies {
  testImplementation("org.jetbrains.kotlin:kotlin-test:$2.1.20")
  testImplementation("org.jetbrains.kotlin:kotlin-test-junit:2.2.20")
  testImplementation("org.mockito.kotlin:mockito-kotlin:4.0.0")
  testImplementation("org.mockito:mockito-core:4.0.0")
  testImplementation("io.ktor:ktor-client-mock:$ktor-version")
  implementation(libs.ktor.server.core)
  implementation(libs.ktor.serialization.kotlinx.json)
  implementation(libs.ktor.server.content.negotiation)
  implementation(libs.ktor.server.netty)
  testImplementation(libs.ktor.server.test.host)

  implementation(libs.logback.classic)

  implementation("io.ktor:ktor-server-cors:$ktor-version")
  implementation("io.ktor:ktor-server-status-pages:$ktor-version")
  implementation("io.ktor:ktor-server-auth:$ktor-version")
  implementation("io.ktor:ktor-server-auth-jwt:$ktor-version")
  implementation("io.ktor:ktor-server-swagger:$ktor-version")
  implementation("io.ktor:ktor-server-openapi:$ktor-version")
  implementation("org.openapitools:openapi-generator:6.6.0")
  implementation("io.ktor:ktor-client-core:$ktor-version")
  implementation("io.ktor:ktor-client-cio:$ktor-version")
  implementation("io.ktor:ktor-client-auth:$ktor-version")
  implementation("io.ktor:ktor-client-content-negotiation:$ktor-version")
  implementation("io.ktor:ktor-server-websockets:$ktor-version")
  implementation("com.github.anastaciocintra:escpos-coffee:4.1.0")
  implementation("com.google.zxing:core:3.5.3")

  implementation("io.ktor:ktor-network-tls-certificates:$ktor-version")

  implementation("org.flywaydb:flyway-core:11.11.2")
  implementation("org.xerial:sqlite-jdbc:3.49.1.0")

  implementation("com.github.ajalt.clikt:clikt:5.0.3")
}

tasks.named<JavaExec>("run") {
  jvmArgs("-Dlogback.configurationFile=Ambrosia-Logs.xml")
}

tasks.test {
    testLogging {
        // Define qué eventos quieres ver en el log
        events("passed", "skipped", "failed")
    }
}

tasks.named<Jar>("jar") {
  manifest {
    attributes["Main-Class"] = "pos.ambrosia.AmbrosiaKt"
    attributes("Implementation-Version" to project.version)
  }

  from(configurations.runtimeClasspath.get().map { if (it.isDirectory) it else zipTree(it) })

  from("src/main/resources") {
    include("**/*")
  }

  duplicatesStrategy = DuplicatesStrategy.EXCLUDE

  archiveFileName.set("ambrosia-$version.jar")
}

java {
  toolchain {
    languageVersion = JavaLanguageVersion.of(21)
  }
}

application {
  mainClass = "pos.ambrosia.AmbrosiaKt"
}
