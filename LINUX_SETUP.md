# Stream Deck Linux Setup Guide

This guide explains how to set up your Elgato Stream Deck on Linux for use with the VS Code Stream Deck extension.

## Prerequisites

- Linux kernel with HID support (most distributions have this by default)
- Elgato Stream Deck device (Original, Mini, XL, MK.2, Plus, or Neo)

## Step 1: Install udev Rules

The Stream Deck uses USB HID (Human Interface Device) protocol. By default, Linux restricts access to HID devices. You need to create udev rules to allow your user to access the device.

### Create the udev rules file

```bash
sudo nano /etc/udev/rules.d/50-elgato-stream-deck.rules
```

### Add the following content

```
# Elgato Stream Deck Original (15 keys)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0060", MODE="0666", GROUP="plugdev"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0060", MODE="0666", GROUP="plugdev"

# Elgato Stream Deck Original V2 (15 keys)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006d", MODE="0666", GROUP="plugdev"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006d", MODE="0666", GROUP="plugdev"

# Elgato Stream Deck Mini (6 keys)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0063", MODE="0666", GROUP="plugdev"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0063", MODE="0666", GROUP="plugdev"

# Elgato Stream Deck Mini V2 (6 keys)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0090", MODE="0666", GROUP="plugdev"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0090", MODE="0666", GROUP="plugdev"

# Elgato Stream Deck XL (32 keys)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006c", MODE="0666", GROUP="plugdev"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="006c", MODE="0666", GROUP="plugdev"

# Elgato Stream Deck XL V2 (32 keys)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="008f", MODE="0666", GROUP="plugdev"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="008f", MODE="0666", GROUP="plugdev"

# Elgato Stream Deck MK.2 (15 keys)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0080", MODE="0666", GROUP="plugdev"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0080", MODE="0666", GROUP="plugdev"

# Elgato Stream Deck + (8 keys + 4 encoders)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0084", MODE="0666", GROUP="plugdev"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0084", MODE="0666", GROUP="plugdev"

# Elgato Stream Deck Neo (8 keys)
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="009a", MODE="0666", GROUP="plugdev"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="009a", MODE="0666", GROUP="plugdev"

# Elgato Stream Deck Pedal
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0086", MODE="0666", GROUP="plugdev"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0086", MODE="0666", GROUP="plugdev"

# Catch-all for any Elgato device
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", MODE="0666", GROUP="plugdev"
KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", MODE="0666", GROUP="plugdev"
```

### Reload udev rules

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Step 2: Add User to plugdev Group

```bash
sudo usermod -a -G plugdev $USER
```

**Important:** You must log out and log back in (or restart your computer) for the group change to take effect.

## Step 3: Verify Setup

After logging back in:

1. Unplug and replug your Stream Deck
2. Verify the device is detected:

```bash
# Check if hidraw devices exist
ls -la /dev/hidraw*

# Check device permissions
lsusb | grep Elgato
```

You should see output similar to:
```
Bus 001 Device 005: ID 0fd9:0080 Elgato Systems GmbH Stream Deck MK.2
```

## Step 4: Configure VS Code Extension

Add button configurations to your VS Code settings (`settings.json`):

```json
{
  "streamdeck.brightness": 80,
  "streamdeck.buttons": {
    "0": {
      "command": "workbench.action.toggleSidebarVisibility",
      "label": "Sidebar"
    },
    "1": {
      "command": "workbench.action.terminal.toggleTerminal",
      "label": "Terminal"
    },
    "2": {
      "command": "editor.action.formatDocument",
      "label": "Format"
    },
    "3": {
      "terminalCommand": "npm run build",
      "label": "Build"
    },
    "4": {
      "terminalCommand": "npm test",
      "label": "Test"
    }
  }
}
```

## Troubleshooting

### Device Not Detected

1. **Check USB connection**: Try a different USB port or cable
2. **Verify udev rules**: Ensure the rules file has correct permissions
   ```bash
   ls -la /etc/udev/rules.d/50-elgato-stream-deck.rules
   ```
3. **Check kernel modules**: Ensure HID modules are loaded
   ```bash
   lsmod | grep hid
   ```
4. **Check dmesg**: Look for USB-related errors
   ```bash
   dmesg | grep -i elgato
   dmesg | grep -i stream
   ```

### Permission Denied Errors

1. **Verify group membership**:
   ```bash
   groups $USER
   ```
   Should include `plugdev`

2. **Re-login**: Group changes require a fresh login session

3. **Check device permissions**:
   ```bash
   ls -la /dev/hidraw*
   ```
   Should show `crw-rw-rw-` or similar with group `plugdev`

### Running in Containers (Docker/Flatpak/Snap)

USB device access from containers requires additional configuration:

**Docker:**
```bash
docker run --privileged -v /dev:/dev ...
# Or more specifically:
docker run --device=/dev/hidraw0 ...
```

**Flatpak/Snap:** These sandbox environments may not have USB access. Consider running VS Code natively for Stream Deck support.

### WSL2 (Windows Subsystem for Linux)

WSL2 does not have direct USB device access. You'll need to use:
- USB/IP to forward the device
- Or run the native Windows version of VS Code

## Button Index Reference

Button indices start at 0 and are numbered left-to-right, top-to-bottom:

### Stream Deck Original/MK.2 (15 keys, 5x3)
```
[0]  [1]  [2]  [3]  [4]
[5]  [6]  [7]  [8]  [9]
[10] [11] [12] [13] [14]
```

### Stream Deck Mini (6 keys, 3x2)
```
[0] [1] [2]
[3] [4] [5]
```

### Stream Deck XL (32 keys, 8x4)
```
[0]  [1]  [2]  [3]  [4]  [5]  [6]  [7]
[8]  [9]  [10] [11] [12] [13] [14] [15]
[16] [17] [18] [19] [20] [21] [22] [23]
[24] [25] [26] [27] [28] [29] [30] [31]
```

### Stream Deck Neo/+ (8 keys, 4x2)
```
[0] [1] [2] [3]
[4] [5] [6] [7]
```

## Available Button Actions

| Property | Description | Example |
|----------|-------------|---------|
| `command` | VS Code command ID | `"workbench.action.files.save"` |
| `arguments` | JSON arguments for command | `"{\"path\": \"/home/user\"}"` |
| `label` | Button display text | `"Save"` |
| `terminalCommand` | Command to run in terminal | `"npm run dev"` |
| `snippet` | Snippet name to insert | `"console.log"` |
| `languageId` | Set document language | `"typescript"` |
| `openFolder` | Open folder object | `{"path": "/home/user/project"}` |

## Support

For issues with the VS Code extension, please file a bug report at:
https://github.com/nicollasricas/vscode-streamdeck/issues

For Stream Deck hardware issues, contact Elgato support.
