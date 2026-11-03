# Operator tooling

For people producing preinstalled Ambrosia units to sell or give away (kermés deployments, gifts, fleet rollouts). The buyer-facing experience is on the tutorial site at [tutorial.ambrosiapay.com/docs/quick-start-hardware/preinstalled](https://tutorial.ambrosiapay.com/docs/quick-start-hardware/preinstalled).

## Flow

1. Set up a single golden unit by hand (see [`../../opi/`](../../opi/) or [`../../rpi/`](../../rpi/) and the linked tutorial-site walkthrough).
2. Run [`scripts/bootstrap-ambrosia.sh`](scripts/bootstrap-ambrosia.sh) to install Ambrosia + Phoenixd + the captive portal onto the golden unit.
3. Run [`scripts/prep-opi-as-golden.sh`](scripts/prep-opi-as-golden.sh) to wipe per-unit state (machine-id, SSH keys, phoenixd wallet) and re-image the SD card to a compressed `.img.gz`.
4. Optionally run [`scripts/stubify-golden.sh`](scripts/stubify-golden.sh) on the image to remove residual user credentials.
5. For each new unit: `dd` the image onto a fresh SD card, then run [`scripts/wipe-and-provision.sh`](scripts/wipe-and-provision.sh) on your laptop against the mounted card to give it a unique hostname and fresh per-unit state.
6. Generate printable buyer materials:
   - [`scripts/generate-vendor-cards.sh`](scripts/generate-vendor-cards.sh) — per-unit vendor cards with random passwords, Wi-Fi QR, support QR (English + Spanish).
   - [`scripts/generate-take-home-cards.sh`](scripts/generate-take-home-cards.sh) — compact per-unit take-home cards (companion to the vendor cards).
   - [`scripts/generate-take-home.sh`](scripts/generate-take-home.sh) — the multi-page printable instruction sheet that goes home with each unit (English + Spanish).

[`clone-fleet.md`](clone-fleet.md) is the technical reference for the cloning step.

## Status

This is the imperative ancestor of a future reproducible-build flow. Eventually the "golden image" will be the output of a single declarative build (e.g., a `flake.nix` consuming the current source) rather than the result of a script chain that downloads tagged releases at runtime.

### Known TODOs

- **`bootstrap-ambrosia.sh` pins `AMBROSIA_TAG`** and downloads a tagged release at runtime. The reproducible-build replacement should instead build from the current code in this repo so the resulting image's hash is deterministic and traceable. Treating this as the next concrete step toward real reproducibility.
- **OPi-flavoured naming throughout** (`/mnt/opi-wipe-and-provision`, default `ambrosia-opi-N` hostnames). The scripts work for any aarch64 board today but the names imply OPi. RPi-side operators will want to either parameterise these or fork the scripts; out of scope for this introductory PR.
