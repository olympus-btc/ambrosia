# Hardware

Resources for running Ambrosia on physical devices. For software-only installs (laptop, server, any machine), see [`doc/installation.md`](../doc/installation.md).

This tree organises content by how the device got into the user's hands:

## DIY (per-board)

You bought parts and want to build a unit yourself. Use the [image build](image/README.md) to produce a flashable image, or follow the per-board manual guides. New images include [per-unit TLS enrollment](image/common/certificates/README.md).

- [`rpi/`](rpi/) — Raspberry Pi Zero 2W
- [`opi/`](opi/) — OrangePi Zero 2W

New boards plug in here as siblings.

## Preinstalled

You received a device with Ambrosia already configured (built by an operator from one of the per-board flows above).

- [`preinstalled/`](preinstalled/) — buyer take-home flow, captive portal, and operator provisioning tooling.

A buyer can verify their preinstalled device matches the published reproducible build by hash-comparing — that's the link between the two paths, not a separate one.
