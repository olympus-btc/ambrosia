version = "0.8.0-beta"

plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.ktor)
    alias(libs.plugins.kotlin.plugin.serialization)
    alias(libs.plugins.ktlint)
    application
}

repositories {
    mavenCentral()
}

dependencies {
    implementation(libs.ktor.server.core)
    implementation(libs.ktor.server.netty)
    implementation(libs.ktor.server.content.negotiation)
    implementation(libs.ktor.server.cors)
    implementation(libs.ktor.server.auth)
    implementation(libs.ktor.server.auth.jwt)
    implementation(libs.ktor.server.status.pages)
    implementation(libs.ktor.server.websockets)
    implementation(libs.ktor.network.tls.certificates)

    implementation(libs.ktor.client.core)
    implementation(libs.ktor.client.cio)
    implementation(libs.ktor.client.auth)
    implementation(libs.ktor.client.content.negotiation)
    implementation(libs.ktor.serialization.kotlinx.json)

    implementation(libs.logback.classic)

    implementation(libs.exposed.core)
    implementation(libs.exposed.dao)
    implementation(libs.exposed.jdbc)
    implementation(libs.flyway.core)
    implementation(libs.sqlite.jdbc)
    implementation(libs.hikaricp)

    implementation(libs.clikt)
    implementation(libs.lightning.kmp)
    implementation(libs.nostrino)
    implementation(libs.okio)

    implementation(libs.escpos.coffee)
    implementation(libs.zxing.core)
    implementation(libs.web.push.java) {
        exclude(group = "org.bouncycastle", module = "bcprov-jdk15on")
        exclude(group = "org.apache.httpcomponents", module = "httpasyncclient")
    }
    implementation(libs.bouncycastle.provider)
    implementation(libs.jose4j)
    implementation(libs.async.http.client)

    testImplementation(libs.kotlin.test)
    testImplementation(libs.kotlin.test.junit)
    testImplementation(libs.mockito.kotlin)
    testImplementation(libs.mockito.core)
    testImplementation(libs.ktor.client.mock)
    testImplementation(libs.ktor.server.test.host)
}

tasks.named<JavaExec>("run") {
    jvmArgs("-Dlogback.configurationFile=Ambrosia-Logs.xml")
}

tasks.test {
    testLogging {
        events("passed", "skipped", "failed")
    }
}

tasks.named<Jar>("jar") {
    manifest {
        attributes["Main-Class"] = "pos.ambrosia.AmbrosiaKt"
        attributes("Implementation-Version" to project.version)
    }

    exclude("META-INF/*.DSA", "META-INF/*.RSA", "META-INF/*.SF")
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

ktlint {
    version.set("1.8.0")
}
