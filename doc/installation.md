# Installation Guide - Ambrosia

> [!TIP]
> This section is for more technical people; if you want a single-click install, please check our latest release and install the distribution for your OS: [ambrosia-releases](https://github.com/olympus-btc/ambrosia/releases/latest).

## Installation (Docker)

For more details about the Docker installation, see [ambrosia-tutorial](https://olympus-btc.github.io/ambrosia-tutorial/).
```bash
docker-compose up -d --wait && docker-compose restart
```

## Installation (Native)

> [!WARNING]  
> Before proceeding with the native installation, please ensure you have installed all the necessary [Project Dependencies](dependencies.md), such as Node.js, Gradle, and JRE/JDK 21.

**Single command (recommended):**

```bash
curl -fsSL https://raw.githubusercontent.com/olympus-btc/ambrosia/refs/tags/v0.5.0-alpha/scripts/install.sh | bash -s -- --yes
```

**Alternative methods:**

If you prefer to review the script before running it, you can manually download and inspect it first

*Download the script and make it executable:*

```bash
wget -q https://raw.githubusercontent.com/olympus-btc/ambrosia/refs/tags/v0.5.0-alpha/scripts/install.sh
chmod +x install.sh
```

*Run the script:*

```bash
./install.sh
```

This unified installation script automates the deployment of the complete Ambrosia ecosystem, including the Phoenixd Lightning node, the backend Server, and the frontend Client. It handles dependency verification, secure binary downloads with GPG validation, environment configuration (PATH updates), and the optional creation of systemd services for each component to ensure a seamless background operation.

The Phoenixd installation script installs Phoenixd automatically. The script downloads Phoenixd v0.7.1, verifies the package integrity using GPG and checksums, installs it in `/usr/local/bin`, and optionally configures a systemd service for automatic startup.

Check [Mastering Phoenixd](https://btcgdl.github.io/Mastering-phoenixd/) for more details.

## Uninstallation 

To uninstall Ambrosia POS and Phoenixd, run the following script:

```bash
curl -fsSL https://raw.githubusercontent.com/olympus-btc/ambrosia/master/scripts/uninstall.sh | bash
```

## Development Scripts

### Server (Backend - Kotlin/Gradle)

To run the server in development mode, go to the `server/` directory and run:

```sh
./gradlew run
```

### Client (Frontend - React/Electron)

Inside the `client/` directory, you can use the following scripts:

- **Install dependencies:**
  ```sh
  npm install
  ```

- **Start in development mode:**
  ```sh
  npm run dev
  ```

- **Build for production:**
  ```sh
  npm run build
  ```

- **Start in production mode (after building):**
  ```sh
  npm start
  ```