# Hardware

Resources for running Ambrosia on physical devices. For software-only installs (laptop, server, any machine), see [`doc/installation.md`](../doc/installation.md).

This tree organises content by how the device got into the user's hands:

## DIY (per-board)

You bought parts and want to build a unit yourself. Today's flow is a manual narrative — flash an OS, run install steps by hand. The long-term goal is a single command that produces a **reproducible image** (e.g., via Nix), which you flash to an SD card and boot. The per-board guides below double as the spec for what that build must produce.

- [`rpi/`](rpi/) — Raspberry Pi Zero 2W
- [`opi/`](opi/) — OrangePi Zero 2W

New boards plug in here as siblings.

## Preinstalled

You received a device with Ambrosia already configured (built by an operator from one of the per-board flows above).

- [`preinstalled/`](preinstalled/) — buyer take-home flow, captive portal, and operator provisioning tooling.

A buyer can verify their preinstalled device matches the published reproducible build by hash-comparing — that's the link between the two paths, not a separate one.
