.PHONY: install-jdk install-docker install-docker-compose \
        build-jar build-client build \
        test-server test-client test \
        lint-server lint-client lint \
        install-phoenixd install-from-source \
        create-secrets up run run-rebuild \
        electron-dev electron-build electron-build-mac \
        electron-build-win electron-build-win-arm64 \
        electron-build-linux electron-build-linux-arm64

# --- Install locations (mirrors scripts/install.sh) ---
AMBROSIA_INSTALL_DIR := $(HOME)/.local/ambrosia
AMBROSIA_BIN_DIR     := $(HOME)/.local/bin
CLIENT_INSTALL_DIR   := $(AMBROSIA_INSTALL_DIR)/client

# --- External dependency versions ---
PHOENIXD_TAG         := 0.7.2
PHOENIXD_INSTALL_DIR := /usr/local/bin

# ============================================================
# Build
# ============================================================

build-jar:
	cd server && ./gradlew jar

build-client:
	cd client && npm install && npm run build

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
# Local production install from current source
# Mirrors scripts/install.sh but uses locally built artifacts
# instead of downloading a release.
# ============================================================

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
	echo "Downloading phoenixd $(PHOENIXD_TAG) ($$ZIP)..."; \
	curl -fL --retry 3 \
	  -o "$$TMP/$$ZIP" \
	  "https://github.com/ACINQ/phoenixd/releases/download/v$(PHOENIXD_TAG)/$$ZIP"; \
	sudo unzip -j -o "$$TMP/$$ZIP" -d "$(PHOENIXD_INSTALL_DIR)"; \
	rm -rf "$$TMP"; \
	echo "phoenixd installed to $(PHOENIXD_INSTALL_DIR)"

# Build all artifacts then install them to ~/.local/ambrosia, mirroring the
# layout that scripts/install.sh produces for a release download.
install-from-source: build install-phoenixd
	@echo "Installing Ambrosia from local source..."
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
	@rm -rf "$(CLIENT_INSTALL_DIR)"; \
	mkdir -p "$(CLIENT_INSTALL_DIR)"; \
	cp -r client/.next "$(CLIENT_INSTALL_DIR)/"; \
	cp -r client/public "$(CLIENT_INSTALL_DIR)/"; \
	cp client/package.json "$(CLIENT_INSTALL_DIR)/"; \
	[ -f client/package-lock.json ] && cp client/package-lock.json "$(CLIENT_INSTALL_DIR)/" || true; \
	cp client/next.config.* "$(CLIENT_INSTALL_DIR)/" 2>/dev/null || true; \
	cd "$(CLIENT_INSTALL_DIR)" && npm ci --omit=dev --silent; \
	{ echo '#!/bin/bash'; echo "cd \"$(CLIENT_INSTALL_DIR)\" && npm start"; } \
	  > "$(AMBROSIA_INSTALL_DIR)/run-client.sh"; \
	chmod +x "$(AMBROSIA_INSTALL_DIR)/run-client.sh"; \
	ln -sf "$(AMBROSIA_INSTALL_DIR)/run-client.sh" "$(AMBROSIA_BIN_DIR)/ambrosia-client"; \
	echo "Client installed to $(CLIENT_INSTALL_DIR)"
	@echo ""
	@echo "Installation complete. Ensure $(AMBROSIA_BIN_DIR) is in your PATH."
	@echo "  Start server : ambrosia"
	@echo "  Start client : ambrosia-client"

# ============================================================
# Docker stack
# ============================================================

install-jdk:
	@if ! command -v java > /dev/null 2>&1 || ! java -version 2>&1 | grep -q "21"; then \
		echo "Installing OpenJDK 21 via Eclipse Temurin..."; \
		sudo apt update; \
		sudo apt install -y wget apt-transport-https gpg; \
		wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/adoptium.gpg > /dev/null; \
		echo "deb https://packages.adoptium.net/artifactory/deb $$(awk -F= '/^VERSION_CODENAME/{print$$2}' /etc/os-release) main" | sudo tee /etc/apt/sources.list.d/adoptium.list; \
		sudo apt update; \
		sudo apt install -y temurin-21-jdk; \
		echo "OpenJDK 21 installed."; \
	else \
		echo "OpenJDK 21 already available."; \
	fi

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

create-secrets:
	mkdir -p ~/.phoenix
	touch ~/.phoenix/seed.dat

up:
	docker-compose up $(if $(REBUILD),--build)

run: install-jdk install-docker install-docker-compose build-jar create-secrets up

run-rebuild: REBUILD=1
run-rebuild: run

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
