# Installation Guide - Ambrosia

> [!TIP]
> This section is for more technical people; if you want a single-click install, please check our latest release and install the distribution for your OS: [ambrosia-releases](https://github.com/olympus-btc/ambrosia/releases/latest).

## Installation (Docker)

For more details about the Docker installation, see [ambrosia-tutorial](https://olympus-btc.github.io/ambrosia-tutorial/).
```bash
docker-compose up -d --wait && docker-compose restart
```

> [!NOTE]
> The app is served at `https://localhost` (or whatever hostname resolves to this machine) — not
> `localhost:3000` directly. A reverse proxy (Caddy) now sits in front of the backend and
> frontend, which are no longer reachable on their own ports. Your browser will warn about the
> certificate being untrusted on first visit — that's expected, it's a self-signed local
> certificate, not an error.

## Installation (Native)

> [!WARNING]  
> Before proceeding with the native installation, please ensure you have installed all the necessary [Project Dependencies](dependencies.md), such as Node.js, Gradle, and JRE/JDK 21.

**Single command (recommended):**

*Automatic installation (includes systemd services):*
```bash
curl -fsSL https://raw.githubusercontent.com/olympus-btc/ambrosia/refs/tags/v0.10.0-beta/scripts/install.sh | bash -s -- --yes
```

*Automatic installation (without systemd services):*
```bash
curl -fsSL https://raw.githubusercontent.com/olympus-btc/ambrosia/refs/tags/v0.10.0-beta/scripts/install.sh | bash -s -- --yes --no-service
```

**Alternative methods:**

If you prefer to review the script before running it, or if you want an **interactive installation** that asks you whether to install systemd services for each component, you can manually download and inspect it first.

*Download the script and make it executable:*

```bash
wget -q https://raw.githubusercontent.com/olympus-btc/ambrosia/refs/tags/v0.10.0-beta/scripts/install.sh
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

## Logs

Admins configure the logs from **Settings → System → Logs**. **Download all logs** saves every log file as a ZIP, and **View logs** shows them in real time, with a button to download only the entries on screen. The viewer shows three sources: the Ambrosia server, Phoenixd (only when Phoenixd runs on the same machine) and errors reported by the app in the browser.

The server writes its own log files in every installation mode. By default it keeps them for 7 days and up to 20 MB; both limits can be changed from the same card (1 to 30 days, 10 to 100 MB) and apply without restarting:

| Installation | Server log files | Phoenixd log file | Process output |
|---|---|---|---|
| Docker | `ambrosia_datadir` volume, `logs/server.log` | `phoenixd_datadir` volume, `phoenix.log` | `docker logs <container>` (10 MB × 3 per container) |
| Native with systemd | `~/.Ambrosia-POS/logs/server.log` | `~/.phoenix/phoenix.log` | `journalctl -u ambrosia -u ambrosia-client -u phoenixd` |
| Native without service | `~/.Ambrosia-POS/logs/server.log` | `~/.phoenix/phoenix.log` | The terminal where each command runs |
| Desktop app | `~/.Ambrosia-POS/logs/server.log` | `~/.phoenix/phoenix.log` | `~/.Ambrosia-POS/logs/electron/` |

The card saves its settings in `~/.Ambrosia-POS/ambrosia.conf`:

| Setting | Key | Values |
|---|---|---|
| Server log level | `log-level` | `ERROR`, `WARN`, `INFO` (default), `DEBUG` |
| Keep logs for | `log-retention-days` | `1`, `3`, `7` (default), `14`, `30` |
| Maximum disk space | `log-max-total-size-mb` | `10`, `20` (default), `50`, `100` |
| Save app errors | `log-client-errors` | `true` (default), `false` |

To get more detail while diagnosing a problem, change the server log level to `DEBUG` from the same card, or set `log-level=DEBUG` in `ambrosia.conf` (or the `AMBROSIA_LOG_LEVEL` environment variable) and restart the server. With `DEBUG` the server also records every HTTP request it answers (method, path without the query string, status and duration; health checks are skipped). In the desktop app the same selector also turns on the detailed messages of the app itself in `~/.Ambrosia-POS/logs/electron/main-*.log`. Return it to `INFO` afterwards. Passwords, tokens, seeds and NWC connection strings are masked before they are written to the logs.

## Uninstallation 

To uninstall Ambrosia POS and Phoenixd, run the following script:

```bash
curl -fsSL https://raw.githubusercontent.com/olympus-btc/ambrosia/master/scripts/uninstall.sh | bash
```
