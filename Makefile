.PHONY: install-jdk install-docker install-docker-compose build-jar up run run-rebuild create-secrets electron-dev electron-build electron-build-mac electron-build-win electron-build-win-arm64 electron-build-linux

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

build-jar:
	cd server && ./gradlew jar

create-secrets:
	mkdir -p ~/.phoenix
	touch ~/.phoenix/seed.dat

up:
	docker-compose up $(if $(REBUILD),--build)

run: install-jdk install-docker install-docker-compose build-jar create-secrets up

run-rebuild: REBUILD=1
run-rebuild: run

# Electron Development
electron-dev:
	@echo "Starting Electron in development mode..."
	cd electron && ./scripts/dev.sh

# Electron Build
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
	@echo "Building Electron application for Linux..."
	cd electron && npm run dist:linux
