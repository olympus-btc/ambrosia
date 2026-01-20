# Ambrosia POS - tar.gz Installation Instructions

This tar.gz archive is provided for advanced users on Linux distributions that don't support `.deb` or `.rpm` packages (e.g., Arch Linux, Gentoo, etc.).

> **Security Note:** This is a Bitcoin Lightning payment application. Do **NOT** run with `--no-sandbox`. The tar.gz format maintains proper sandboxing without the AppImage limitations.

## Installation

### 1. Extract the archive

```bash
tar -xzf ambrosia-pos-electron-*.tar.gz
```

### 2. Move to a permanent location (optional)

**System-wide install:**
```bash
sudo mv ambrosia-pos-electron-* /opt/ambrosia-pos
```

**User-only install:**
```bash
mv ambrosia-pos-electron-* ~/.local/share/ambrosia-pos
```

### 3. Run the application

```bash
cd /opt/ambrosia-pos  # or your chosen location
./ambrosia-pos-electron
```

### 4. Create a desktop shortcut (optional)

Create a file at `~/.local/share/applications/ambrosia-pos.desktop`:

```ini
[Desktop Entry]
Name=Ambrosia POS
Comment=Restaurant and Retail POS with Bitcoin Lightning
Exec=/opt/ambrosia-pos/ambrosia-pos-electron
Icon=/opt/ambrosia-pos/resources/app/build/icon.png
Terminal=false
Type=Application
Categories=Office;Finance;
```

## Requirements

- GTK 3 libraries
- libxcrypt (or `libxcrypt-compat` on Fedora-based systems)
- JRE (Java Runtime Environment) - **bundled in the package**
- Node.js - **bundled in the package**

## Arch Linux Users

Consider creating an AUR package for easier installation and updates. Base your `PKGBUILD` on this tar.gz distribution.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| GTK version conflicts | Ensure GTK 3 is installed |
| Missing dependencies | JRE and Node.js are bundled, no need to install separately |
| App won't start | Check logs in `~/.Ambrosia-POS/logs/` |
| Configuration issues | First run creates config at `~/.Ambrosia-POS/ambrosia.conf` |

## Uninstallation

### 1. Remove application directory

```bash
sudo rm -rf /opt/ambrosia-pos
```

### 2. Remove user data (optional)

```bash
rm -rf ~/.Ambrosia-POS
rm -rf ~/.phoenix
```

### 3. Remove desktop entry (if created)

```bash
rm ~/.local/share/applications/ambrosia-pos.desktop
```

## Support

- **GitHub:** https://github.com/olympus-btc/ambrosia
- **Issues:** https://github.com/olympus-btc/ambrosia/issues
