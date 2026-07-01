# OrangePi Zero 2W

Reference notes for running Ambrosia on an OrangePi Zero 2W.

For the step-by-step setup walkthrough — flashing the OS, first boot, SSH, installing Ambrosia — see the tutorial site:

- [Setup the board](https://tutorial.ambrosiapay.com/docs/quick-start-hardware/opi)

## Status

Today's flow is manual: flash Armbian, configure Wi-Fi, install Ambrosia by hand. The long-term goal is a single command that produces a verifiable reproducible image you flash to an SD card. That work is the natural continuation of [`../preinstalled/operator/scripts/bootstrap-ambrosia.sh`](../preinstalled/operator/scripts/bootstrap-ambrosia.sh) — see the operator README for the trajectory.

## Known caveat

The `unisoc_wifi` driver on this board can wedge silently — the link associates and DHCP succeeds, but no L3 traffic flows. Bouncing the NetworkManager connection usually clears it. If you build automation against this board, make that recovery the first thing you try before chasing AP/firewall issues.
