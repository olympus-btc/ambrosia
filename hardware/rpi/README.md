# Raspberry Pi Zero 2W

Reference notes for running Ambrosia on a Raspberry Pi Zero 2W.

For the step-by-step setup walkthrough — flashing the OS, first boot, SSH, installing Ambrosia — see the tutorial site:

- [Setup the board](https://tutorial.ambrosiapay.com/docs/quick-start-hardware/rpi)
- [Install Ambrosia](https://tutorial.ambrosiapay.com/docs/quick-start-hardware/rpi-install)

## Status

Today's flow is manual: flash the OS, configure Wi-Fi, install Ambrosia by hand. The long-term goal is a single command that produces a verifiable reproducible image you flash to an SD card. That work is the natural continuation of [`../preinstalled/operator/scripts/bootstrap-ambrosia.sh`](../preinstalled/operator/scripts/bootstrap-ambrosia.sh) — see the operator README for the trajectory.
