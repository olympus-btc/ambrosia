.PHONY: install-jdk install-docker install-docker-compose \
        build-jar build-client build \
        test-server test-client test \
        lint-server lint-client lint \
        check-deps \
        install-phoenixd install-server-from-source install-client-from-source install-from-source uninstall \
        up down run \
        electron-dev electron-build electron-build-mac \
        electron-build-win electron-build-win-arm64 \
        electron-build-linux electron-build-linux-arm64 \
        help

.DEFAULT_GOAL := help

# --- Install locations (mirrors scripts/install.sh) ---
AMBROSIA_INSTALL_DIR := $(HOME)/.local/ambrosia
AMBROSIA_BIN_DIR     := $(HOME)/.local/bin
CLIENT_INSTALL_DIR   := $(AMBROSIA_INSTALL_DIR)/client
CLIENT_DIST_DIR      := /tmp/ambrosia-client-dist

# --- External dependency versions ---
PHOENIXD_TAG         := 0.7.2
PHOENIXD_INSTALL_DIR := /usr/local/bin
JDK_VERSION          := 21.0.8-tem

# ============================================================
# Build
# ============================================================

build-jar:
	cd server && ./gradlew jar

build-client:
	cd client && npm install --silent && chmod +x package-client.sh && NO_ZIP=1 ./package-client.sh

build: build-jar build-client

# ============================================================
# Test
# ============================================================

test-server:
	cd server && ./gradlew test

test-client:
	cd client && npm test

test: test-server test-client

# ============================================================
# Lint
# ============================================================

lint-server:
	cd server && ./gradlew ktlintCheck

lint-client:
	cd client && npm run lint

lint: lint-server lint-client

# ============================================================
# Dependency check
# ============================================================

check-deps:
	@echo "Checking required dependencies..."
	@MISSING=0; \
	if ! command -v java >/dev/null 2>&1; then \
	  echo "  [MISSING] java        — run 'make install-jdk'"; MISSING=1; \
	elif ! java -version 2>&1 | grep -q "21"; then \
	  echo "  [WRONG]   java 21 required (found $$(java -version 2>&1 | head -1)) — run 'make install-jdk'"; MISSING=1; \
	else \
	  echo "  [OK]      java"; \
	fi; \
	if ! command -v node >/dev/null 2>&1; then \
	  echo "  [MISSING] node        — see doc/dependencies.md"; MISSING=1; \
	else \
	  echo "  [OK]      node"; \
	fi; \
	if ! command -v npm >/dev/null 2>&1; then \
	  echo "  [MISSING] npm         — see doc/dependencies.md"; MISSING=1; \
	else \
	  echo "  [OK]      npm"; \
	fi; \
	if ! command -v curl >/dev/null 2>&1; then \
	  echo "  [MISSING] curl        — install via package manager"; MISSING=1; \
	else \
	  echo "  [OK]      curl"; \
	fi; \
	if ! command -v unzip >/dev/null 2>&1; then \
	  echo "  [MISSING] unzip       — install via package manager"; MISSING=1; \
	else \
	  echo "  [OK]      unzip"; \
	fi; \
	if [ "$$MISSING" -ne 0 ]; then \
	  echo ""; \
	  echo "Fix the missing dependencies above before running install-from-source."; \
	  exit 1; \
	fi; \
	echo "All dependencies satisfied."

# ============================================================
# Local production install from current source
# Mirrors scripts/install.sh but uses locally built artifacts
# instead of downloading a release.
# ============================================================

install-jdk:
	@if ! command -v java > /dev/null 2>&1 || ! java -version 2>&1 | grep -q "21"; then \
		echo "Installing OpenJDK 21 via SDKMAN!..."; \
		if [ ! -d "$$HOME/.sdkman" ]; then \
			curl -s "https://get.sdkman.io" | bash; \
		fi; \
		bash -c 'source "$$HOME/.sdkman/bin/sdkman-init.sh" && sdk install java $(JDK_VERSION)'; \
		echo "OpenJDK 21 installed."; \
		echo "Add the following to your shell profile if not already present:"; \
		echo "  source \"$$HOME/.sdkman/bin/sdkman-init.sh\""; \
	else \
		echo "OpenJDK 21 already available."; \
	fi

install-phoenixd:
	@ARCH=$$(uname -m); \
	OS=$$(uname -s | tr '[:upper:]' '[:lower:]'); \
	if [ "$$OS" = "linux" ] && [ "$$ARCH" = "x86_64" ]; then \
	  ZIP="phoenixd-$(PHOENIXD_TAG)-linux-x64.zip"; \
	elif [ "$$OS" = "linux" ] && [ "$$ARCH" = "aarch64" ]; then \
	  ZIP="phoenixd-$(PHOENIXD_TAG)-linux-arm64.zip"; \
	elif [ "$$OS" = "darwin" ] && [ "$$ARCH" = "x86_64" ]; then \
	  ZIP="phoenixd-$(PHOENIXD_TAG)-macos-x64.zip"; \
	elif [ "$$OS" = "darwin" ] && [ "$$ARCH" = "arm64" ]; then \
	  ZIP="phoenixd-$(PHOENIXD_TAG)-macos-arm64.zip"; \
	else \
	  echo "Unsupported OS/architecture: $$OS/$$ARCH"; exit 1; \
	fi; \
	TMP=$$(mktemp -d); \
	trap 'rm -rf "$$TMP"' EXIT; \
	echo "Downloading phoenixd $(PHOENIXD_TAG) ($$ZIP)..."; \
	curl -fL --retry 3 \
	  -o "$$TMP/$$ZIP" \
	  "https://github.com/ACINQ/phoenixd/releases/download/v$(PHOENIXD_TAG)/$$ZIP" && \
	sudo unzip -j -o "$$TMP/$$ZIP" -d "$(PHOENIXD_INSTALL_DIR)" && \
	echo "phoenixd installed to $(PHOENIXD_INSTALL_DIR)"

install-server-from-source:
	@echo "Installing Ambrosia server from local source..."
	@JAR=$$(ls server/app/build/libs/*.jar 2>/dev/null | head -1); \
	if [ -z "$$JAR" ]; then \
	  echo "Error: no JAR found in server/app/build/libs/ — run 'make build-jar' first"; \
	  exit 1; \
	fi; \
	mkdir -p "$(AMBROSIA_INSTALL_DIR)" "$(AMBROSIA_BIN_DIR)"; \
	cp "$$JAR" "$(AMBROSIA_INSTALL_DIR)/ambrosia.jar"; \
	cp scripts/run-server.sh "$(AMBROSIA_INSTALL_DIR)/run-server.sh"; \
	chmod +x "$(AMBROSIA_INSTALL_DIR)/run-server.sh"; \
	ln -sf "$(AMBROSIA_INSTALL_DIR)/run-server.sh" "$(AMBROSIA_BIN_DIR)/ambrosia"; \
	echo "Server JAR installed to $(AMBROSIA_INSTALL_DIR)/ambrosia.jar"

install-client-from-source:
	@echo "Installing Ambrosia client from local source..."
	@if [ ! -d "$(CLIENT_DIST_DIR)" ]; then \
	  echo "Error: $(CLIENT_DIST_DIR) not found — run 'make build-client' first"; \
	  exit 1; \
	fi; \
	rm -rf "$(CLIENT_INSTALL_DIR)"; \
	mkdir -p "$(CLIENT_INSTALL_DIR)"; \
	cp -r "$(CLIENT_DIST_DIR)/." "$(CLIENT_INSTALL_DIR)/"; \
	cd "$(CLIENT_INSTALL_DIR)" && npm ci --omit=dev --silent; \
	{ echo '#!/bin/bash'; echo "cd \"$(CLIENT_INSTALL_DIR)\" && npm start"; } \
	  > "$(AMBROSIA_INSTALL_DIR)/run-client.sh"; \
	chmod +x "$(AMBROSIA_INSTALL_DIR)/run-client.sh"; \
	ln -sf "$(AMBROSIA_INSTALL_DIR)/run-client.sh" "$(AMBROSIA_BIN_DIR)/ambrosia-client"; \
	echo "Client installed to $(CLIENT_INSTALL_DIR)"

install-from-source: check-deps build install-phoenixd install-server-from-source install-client-from-source
	@echo ""
	@echo "Installation complete. Ensure $(AMBROSIA_BIN_DIR) is in your PATH."
	@echo "  Start server : ambrosia"
	@echo "  Start client : ambrosia-client"

uninstall:
	@chmod +x scripts/uninstall.sh && scripts/uninstall.sh

# ============================================================
# Docker stack
# ============================================================

install-docker:
	@if ! command -v docker > /dev/null 2>&1; then \
		echo "Installing Docker..."; \
		sudo apt update; \
		sudo apt install -y docker.io; \
		sudo systemctl start docker; \
		sudo systemctl enable docker; \
		echo "Docker installed and started."; \
	else \
		echo "Docker already available."; \
	fi

install-docker-compose:
	@if ! command -v docker-compose > /dev/null 2>&1; then \
		echo "Installing docker-compose..."; \
		sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$$(uname -s)-$$(uname -m)" -o /usr/local/bin/docker-compose; \
		sudo chmod +x /usr/local/bin/docker-compose; \
		echo "docker-compose installed."; \
	else \
		echo "docker-compose already installed."; \
	fi

up:
	docker-compose up -d

down:
	docker-compose down

run:
	docker-compose up --build -d

# ============================================================
# Electron
# ============================================================

electron-dev:
	@echo "Starting Electron in development mode..."
	cd electron && ./scripts/dev.sh

electron-build:
	@echo "Building Electron application..."
	cd electron && ./scripts/build.sh

electron-build-mac:
	@echo "Building Electron application for macOS..."
	cd electron && npm run dist:mac

electron-build-win:
	@echo "Building Electron application for Windows x64..."
	cd electron && npm run dist:win:x64

electron-build-win-arm64:
	@echo "Building Electron application for Windows ARM64..."
	cd electron && npm run dist:win:arm64

electron-build-linux:
	@echo "Building Electron application for Linux x64..."
	cd electron && npm run dist:linux:x64

electron-build-linux-arm64:
	@echo "Building Electron application for Linux ARM64..."
	cd electron && npm run dist:linux:arm64

# ============================================================
# Help
# ============================================================

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Build"
	@echo "  build-jar                   Build the server JAR"
	@echo "  build-client                Build the Next.js client (via package-client.sh)"
	@echo "  build                       Build server and client"
	@echo ""
	@echo "Test"
	@echo "  test-server                 Run Kotlin tests"
	@echo "  test-client                 Run JS tests"
	@echo "  test                        Run all tests"
	@echo ""
	@echo "Lint"
	@echo "  lint-server                 ktlintCheck"
	@echo "  lint-client                 ESLint"
	@echo "  lint                        Lint server and client"
	@echo ""
	@echo "Install from source"
	@echo "  install-jdk                 Install OpenJDK $(JDK_VERSION) via SDKMAN!"
	@echo "  check-deps                  Verify all required tools are present"
	@echo "  install-phoenixd            Download and install phoenixd $(PHOENIXD_TAG)"
	@echo "  install-server-from-source  Install server JAR to $(AMBROSIA_INSTALL_DIR)"
	@echo "  install-client-from-source  Install client build to $(CLIENT_INSTALL_DIR)"
	@echo "  install-from-source         Build everything and install locally"
	@echo "  uninstall                   Remove all installed Ambrosia components"
	@echo ""
	@echo "Docker stack"
	@echo "  install-docker              Install Docker via apt"
	@echo "  install-docker-compose      Install docker-compose"
	@echo "  up                          Start stack (docker-compose up -d)"
	@echo "  down                        Stop stack (docker-compose down)"
	@echo "  run                         Build images and start stack (docker-compose up --build -d)"
	@echo ""
	@echo "Electron"
	@echo "  electron-dev                Start Electron in development mode"
	@echo "  electron-build              Build desktop app for current platform"
	@echo "  electron-build-mac          Build for macOS"
	@echo "  electron-build-win          Build for Windows x64"
	@echo "  electron-build-win-arm64    Build for Windows ARM64"
	@echo "  electron-build-linux        Build for Linux x64"
	@echo "  electron-build-linux-arm64  Build for Linux ARM64"
