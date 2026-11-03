# Cloning an OrangePi fleet for a kermés

Once you have one OrangePi fully set up (OS + Ambrosia installed), you can clone its SD card to build the rest of your fleet in a fraction of the time it would take to run the [OrangePi setup walkthrough](https://tutorial.ambrosiapay.com/docs/quick-start-hardware/opi) and [Ambrosia install](https://tutorial.ambrosiapay.com/docs/quick-start-hardware/rpi-install) on each unit.

**What cloning skips:** OS flash, user creation, Wi-Fi config, avahi, swap, apt upgrade, Ambrosia install — everything from Steps 2-14 of the OrangePi setup plus the full Ambrosia install.

**What still needs to be per-unit:** unique hostname, fresh SSH host keys, fresh `/etc/machine-id`, and (most importantly) a fresh phoenixd wallet — otherwise every board shares the same Lightning seed and the first channel open trashes state for all of them.

This tutorial assumes your golden unit is reachable as `ambrosia-opi-1.local`. Substitute your actual hostname/user throughout.

> **Network tip:** we ran into some odd SSH / TCP hangs over Wi-Fi on the OrangePi Zero 2W (pings fine, TCP data flows stalling with packets stuck in the send queue — root cause never fully nailed down). Running the backup over Ethernet worked reliably. If you have the USB-C Ethernet adapter from Step 4 of the [OrangePi setup walkthrough](https://tutorial.ambrosiapay.com/docs/quick-start-hardware/opi), plug it in and use that. Shared-to-laptop Ethernet (IP like `10.42.0.x`) is fine.

---

## Step 1: Back up phoenixd and Ambrosia data

Before wiping the golden image, pull both datadirs to your laptop. `~/.phoenix/seed.dat` is the Lightning wallet seed — losing it means losing any funds the wallet has ever held.

Stop services on the OrangePi so the files aren't mid-write (`-t` is needed so sudo can prompt for your password):

```bash
ssh -t ambrosia-opi-1@<golden-ip> 'sudo systemctl stop ambrosia-client ambrosia phoenixd'
```

From your laptop, stream both datadirs as a compressed tarball (no `-t`, so stdout is a clean binary stream):

```bash
ssh ambrosia-opi-1@<golden-ip> 'tar czf - .phoenix .Ambrosia-POS' \
  > ~/ambrosia-backup-$(date +%Y%m%d-%H%M%S).tar.gz
```

Verify the backup — you should see `seed.dat`, the phoenixd mainnet DB, and the Ambrosia DB/keystore in the listing:

```bash
ls -lh ~/ambrosia-backup-*.tar.gz
tar tzf ~/ambrosia-backup-*.tar.gz | head -20
```

Don't proceed until `seed.dat` and `.Ambrosia-POS/ambrosia.db` both appear.

---

## Step 2: Wipe per-device state on the golden image

SSH back into the golden unit and wipe everything that must not be shared across clones: the Lightning wallet, the Ambrosia DB, SSH host keys, `/etc/machine-id`, shell history, and the journal.

```bash
ssh ambrosia-opi-1@<golden-ip>
```

Then on the OrangePi, run each line individually (pasting a multi-line block with `\` continuations often gets mangled by terminal paste handling):

```bash
sudo -v
rm -rf ~/.phoenix
rm -rf ~/.Ambrosia-POS
sudo rm -f /etc/ssh/ssh_host_*
sudo truncate -s 0 /etc/machine-id
sudo rm -f /var/lib/dbus/machine-id
sudo ln -s /etc/machine-id /var/lib/dbus/machine-id
rm -f ~/.bash_history
sudo journalctl --rotate
sudo journalctl --vacuum-time=1s
sudo shutdown -h now
```

`sudo -v` primes the sudo password cache so you only type it once. Your SSH session drops when shutdown runs — that's expected.

> **Note:** bash **rewrites** `~/.bash_history` when your shell exits, so the `rm` above gets undone a few seconds later. We'll clean the regenerated file up on the mounted SD card in the next step.

Once the green LED stops blinking, unplug power and pull the microSD card.

---

## Step 3: Verify the wipe and image the golden SD card

Insert the card into your laptop's reader and find its device:

```bash
lsblk -d -o NAME,SIZE,MODEL,TRAN
```

Identify the card by size (`29.7G` for a 32GB card) and by `TRAN=usb`. **Double-check** — writing the wrong device later will destroy your system disk.

Mount the rootfs partition to verify the wipe (the OrangePi Debian image uses a single partition `sda1`, with u-boot in the raw sectors before it):

```bash
sudo mkdir -p /mnt/opi
sudo mount /dev/sda1 /mnt/opi
```

Confirm each sensitive file is gone (each should print `GONE:` unless bash regenerated `.bash_history`):

```bash
sudo ls /mnt/opi/home/ambrosia-opi-1/.phoenix 2>&1
sudo ls /mnt/opi/home/ambrosia-opi-1/.Ambrosia-POS 2>&1
sudo ls /mnt/opi/home/ambrosia-opi-1/.bash_history 2>&1
sudo ls /mnt/opi/etc/ssh/ | grep ssh_host
sudo wc -c /mnt/opi/etc/machine-id
sudo ls -la /mnt/opi/var/lib/dbus/machine-id
```

`.phoenix` and `.Ambrosia-POS` should be "No such file or directory". `/etc/ssh/` should have no `ssh_host_*` files. `machine-id` should be 0 bytes. The dbus `machine-id` should be a symlink to `/etc/machine-id`.

**Bash almost always regenerates `~/.bash_history` on shell exit — delete it now on the mounted FS:**

```bash
sudo rm -f /mnt/opi/home/ambrosia-opi-1/.bash_history
```

Then unmount and image the whole device (not just the partition — we want u-boot and the partition table too):

```bash
sudo umount /mnt/opi
sudo dd if=/dev/sda bs=4M status=progress | gzip -c > ~/ambrosia-golden-$(date +%Y%m%d).img.gz
ls -lh ~/ambrosia-golden-*.img.gz
```

On USB 3.0 with a decent card, 32GB reads in ~7 minutes at ~70 MB/s. The compressed image is typically 2-4GB since most of the card is empty and compresses to near-zero.

---

## Step 4: Flash the clones

For each new microSD card (you need 7 more to reach 8 total):

```bash
# Insert fresh card, then find its device name:
lsblk -d -o NAME,SIZE,MODEL,TRAN

# Unmount and flash:
sudo umount /dev/sdX*
gunzip -c ~/ambrosia-golden-YYYYMMDD.img.gz | sudo dd of=/dev/sdX bs=4M conv=fsync status=progress
sync
sudo eject /dev/sdX
```

Label each card physically (`opi-2`, `opi-3`, … `opi-8`) so you can keep track.

---

## Step 5: First boot of each clone — set a unique hostname

**Boot clones one at a time.** All fresh clones will initially announce themselves as `ambrosia-opi-1.local` over avahi — if you boot two at once, `.local` resolution is a coin flip.

For each clone:

1. Insert the card, plug power, wait ~60s for first boot. Systemd regenerates SSH host keys and `/etc/machine-id` automatically.

2. SSH in. Your laptop's known_hosts still has the fingerprint from the golden unit, so you'll get a mismatch warning — that's expected (the clone has fresh host keys). Clear the old entry first:

   ```bash
   ssh-keygen -R ambrosia-opi-1.local
   ssh ambrosia-opi-1@ambrosia-opi-1.local
   ```

3. On the clone, set a new unique hostname (e.g. `ambrosia-opi-2` for the second unit):

   ```bash
   NEW=ambrosia-opi-2
   sudo hostnamectl set-hostname "$NEW"
   sudo sed -i "s/127.0.1.1.*/127.0.1.1\t$NEW/" /etc/hosts
   sudo reboot
   ```

4. Wait ~30s, then reconnect at the new name:

   ```bash
   ssh ambrosia-opi-1@ambrosia-opi-2.local
   ```

   (The username stays `ambrosia-opi-1` — that's fine, it's baked into the cloned filesystem. If you want per-unit usernames, rename with `usermod -l` before the reboot above, but it's not required.)

5. Only after the clone is on its new hostname, power up the next clone and repeat.

---

## Step 6: Restore backup to your kermés store unit

Pick one unit to be your personal store register — probably the original golden OrangePi. Re-insert its SD card (still holding the wiped image), boot it, and from your laptop push the backup back:

```bash
rsync -avz --progress ~/ambrosia-backup-YYYYMMDD-HHMMSS/.phoenix/ ambrosia-opi-1@ambrosia-opi-1.local:.phoenix/
rsync -avz --progress ~/ambrosia-backup-YYYYMMDD-HHMMSS/.Ambrosia-POS/ ambrosia-opi-1@ambrosia-opi-1.local:.Ambrosia-POS/
```

Then on that unit, restart services:

```bash
ssh ambrosia-opi-1@ambrosia-opi-1.local 'sudo systemctl start phoenixd ambrosia ambrosia-client'
```

Check everything came up:

```bash
ssh ambrosia-opi-1@ambrosia-opi-1.local 'sudo systemctl status phoenixd ambrosia ambrosia-client --no-pager'
```

Your wallet funds, channels, and Ambrosia menu are back on the original unit. The other 7 clones each have a fresh phoenixd wallet — each merchant will generate their own seed the first time they open the Ambrosia UI.

---

## Step 7: Verify fleet health

From your laptop, ping each unit:

```bash
for i in 1 2 3 4 5 6 7 8; do
  echo "--- ambrosia-opi-$i ---"
  ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new \
    ambrosia-opi-1@ambrosia-opi-$i.local \
    'hostname; systemctl is-active phoenixd ambrosia ambrosia-client' || echo "UNREACHABLE"
done
```

Each unit should report its own hostname and three `active` services. Any `UNREACHABLE` or `inactive` lines are units to investigate before the event.
