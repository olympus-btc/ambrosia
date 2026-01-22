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

*Automatic installation (includes systemd services):*
```bash
curl -fsSL https://raw.githubusercontent.com/olympus-btc/ambrosia/refs/tags/v0.5.0-alpha/scripts/install.sh | bash -s -- --yes
```

*Automatic installation (without systemd services):*
```bash
curl -fsSL https://raw.githubusercontent.com/olympus-btc/ambrosia/refs/tags/v0.5.0-alpha/scripts/install.sh | bash -s -- --yes --no-service
```

**Alternative methods:**

If you prefer to review the script before running it, or if you want an **interactive installation** that asks you whether to install systemd services for each component, you can manually download and inspect it first.

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

> [!NOTE]  
> If you do not use the systemd services, you will need to manually start the backend and frontend by running the following commands in your terminal as separate processes:
> ```bash
> ambrosia
> ```
>
> and 
>
>```bash
> ambrosia-client
>```
The Phoenixd installation script installs Phoenixd automatically. The script downloads Phoenixd v0.7.1, verifies the package integrity using GPG and checksums, installs it in `/usr/local/bin`, and optionally configures a systemd service for automatic startup.

Check [Mastering Phoenixd](https://btcgdl.github.io/Mastering-phoenixd/) for more details.

## Uninstallation 

To uninstall Ambrosia POS and Phoenixd, run the following script:

```bash
curl -fsSL https://raw.githubusercontent.com/olympus-btc/ambrosia/master/scripts/uninstall.sh | bash
```