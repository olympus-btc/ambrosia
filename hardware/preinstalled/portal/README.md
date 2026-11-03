# Wi-Fi captive portal

A first-boot Wi-Fi setup flow for preinstalled Ambrosia units. When a unit boots and can't reach a known Wi-Fi network, the portal brings up its own hotspot, serves a captive page that lists nearby SSIDs, and lets the buyer pick one and enter the password from their phone. Once the unit successfully joins the chosen network, the portal exits and Caddy is started so the POS becomes reachable.

## Files

- `ambrosia-wifi-portal` — the Python application. Flask + NetworkManager (via `nmcli`) on port 80. SSID scanning happens before AP mode is raised so the list is current.
- `ambrosia-wifi-portal.service` — the systemd unit. `ExecStopPost=systemctl start caddy` ensures the POS comes up after the portal exits.

## Install on a unit

```sh
sudo install -m 0755 ambrosia-wifi-portal /usr/local/bin/ambrosia-wifi-portal
sudo install -m 0644 ambrosia-wifi-portal.service /etc/systemd/system/ambrosia-wifi-portal.service
sudo systemctl daemon-reload
sudo systemctl enable ambrosia-wifi-portal.service
```

The provisioning scripts in [`../operator/scripts/`](../operator/scripts/) install this automatically as part of the golden-image bake.

## Show-password toggle

The captive portal page includes a show/hide toggle on the password field — keyboards on small phones plus complex Wi-Fi passwords benefit from being able to see what was typed.
