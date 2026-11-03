# Preinstalled

For users who received an Ambrosia device already configured. Two audiences share this path:

## Buyer / end-user

You have a device. Plug it in, connect to its Wi-Fi hotspot from your phone, choose your home Wi-Fi in the captive portal, and you're done.

- [Take-home walkthrough](https://tutorial.ambrosiapay.com/docs/quick-start-hardware/preinstalled) (English + Spanish on the tutorial site)
- [`portal/`](portal/) — the captive portal that makes first-boot Wi-Fi reconfig possible. README explains how it's wired into a unit.

## Operator / vendor

You want to make preinstalled devices for others (kermés, gifts, fleet deployment).

- [`operator/`](operator/) — provisioning tooling: golden-image bake, per-unit wipe, fleet cloning, printable buyer-facing cards with credentials and QR codes.

## Verification

A preinstalled device's image should hash-match the reproducible build output from [`../rpi/`](../rpi/) or [`../opi/`](../opi/). That's the trust link between buyer and operator — not a separate verification path. The reproducible build itself doesn't exist yet (see those READMEs for status); until it does, this is an aspirational claim.
