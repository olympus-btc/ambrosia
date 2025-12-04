# Build stage - compiles the JAR using Gradle
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /build

# Copy Gradle wrapper and build files first (better layer caching)
COPY gradlew gradlew
COPY gradle gradle
COPY settings.gradle.kts settings.gradle.kts
COPY gradle.properties gradle.properties
COPY app/build.gradle.kts app/build.gradle.kts

# Download dependencies (cached unless build files change)
RUN ./gradlew dependencies --no-daemon || true

# Copy source code
COPY app/src app/src

# Build the JAR
RUN ./gradlew jar --no-daemon

# Runtime stage - slim image with only JRE
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the built JAR from builder stage
COPY --from=builder /build/app/build/libs/ambrosia-*.jar ./ambrosia.jar

EXPOSE 9154

ENTRYPOINT ["java", "-jar", "ambrosia.jar", "--phoenixd-url=http://phoenixd:9740", "--http-bind-ip=0.0.0.0"]
