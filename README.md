# StreamDeck Studio

Control Visual Studio Code with your Elgato Stream Deck. Configure buttons visually, execute commands, run terminal scripts, and boost your productivity with hardware shortcuts.

## Features

- **Visual Configuration Panel** - Click the status bar to open a modern, intuitive UI for configuring your Stream Deck buttons
- **Multiple Action Types**:
  - Execute any VS Code command with autocomplete
  - Run terminal commands
  - Create new terminals with custom settings
  - Insert code snippets
  - Change editor language
  - Open folders/workspaces
- **Device Support** - Works with all Stream Deck models:
  - Stream Deck Mini (6 keys)
  - Stream Deck Original/MK.2 (15 keys)
  - Stream Deck XL (32 keys)
  - Stream Deck + (8 keys)
  - Stream Deck Neo (8 keys)
- **Live Updates** - Device connection status and configuration changes reflect immediately
- **Brightness Control** - Adjust your Stream Deck brightness from within VS Code
- **Copy & Clear** - Easily duplicate button configurations or clear all at once

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "StreamDeck Studio"
4. Click Install

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/sblanchard/streamdeck-studio.git

# Install dependencies
cd streamdeck-studio
npm install

# Build
npm run compile

# Package (optional)
npm run package
```

## Requirements

- **Node.js** - Version 18 or higher
- **USB Access** - Your user must have permissions to access USB devices

### Linux Setup

On Linux, you need to set up udev rules for the Stream Deck:

```bash
# Create udev rules file
sudo tee /etc/udev/rules.d/50-streamdeck.rules << EOF
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", MODE="0666"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Unplug and replug your Stream Deck
```

### macOS Setup

No additional setup required. The extension uses HID access which is available by default.

### Windows Setup

No additional setup required. Ensure you have the Elgato Stream Deck software installed (the drivers come with it).

## Usage

1. **Connect your Stream Deck** - The extension will automatically detect it
2. **Click the status bar item** - Look for "Stream Deck" in the bottom status bar
3. **Configure buttons** - Click any button in the grid to configure it
4. **Choose an action type**:
   - **VS Code Command**: Search and select from all available commands
   - **Terminal Command**: Run a command in the active terminal
   - **Create Terminal**: Open a new terminal with specific settings
   - **Insert Snippet**: Insert a named snippet at cursor
   - **Set Language**: Change the current file's language
   - **Open Folder**: Open a folder or workspace
5. **Save** - Your configuration is saved automatically to VS Code settings

## Configuration

Button configurations are stored in VS Code settings and can be edited directly:

```json
{
  "streamdeck.brightness": 100,
  "streamdeck.buttons": {
    "0": {
      "command": "workbench.action.toggleSidebarVisibility",
      "label": "Sidebar"
    },
    "1": {
      "terminalCommand": "npm run dev",
      "label": "Dev"
    },
    "2": {
      "command": "editor.action.formatDocument",
      "label": "Format"
    }
  }
}
```

### Button Configuration Options

| Property | Type | Description |
|----------|------|-------------|
| `label` | string | Text displayed on the button |
| `icon` | string | Path to an image file for the button |
| `command` | string | VS Code command ID to execute |
| `arguments` | string | JSON string of arguments to pass to the command |
| `terminalCommand` | string | Command to run in active terminal |
| `createTerminal` | object | Options for creating a new terminal |
| `snippet` | string | Name of snippet to insert |
| `languageId` | string | Language ID to set for current editor |
| `openFolder` | object | Options for opening a folder |

## Commands

| Command | Description |
|---------|-------------|
| `StreamDeck Studio: Open Configuration Panel` | Opens the visual configuration interface |
| `StreamDeck Studio: Reconnect Device` | Manually reconnect to Stream Deck |
| `StreamDeck Studio: Activate Session` | Activate the Stream Deck session |

## Troubleshooting

### Device not detected

1. Ensure the Stream Deck is connected via USB
2. Check if your user has USB access permissions (see Linux Setup above)
3. Try the "Reconnect Device" command from the command palette
4. Restart VS Code

### Buttons not responding

1. Check the connection status in the configuration panel
2. Verify your button configuration is valid
3. Check the VS Code Developer Console for error messages (Help > Toggle Developer Tools)

### Permission denied on Linux

Make sure you've set up the udev rules and reloaded them:

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

Then unplug and replug your Stream Deck.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Originally inspired by [vscode-streamdeck](https://github.com/nicollasricas/vscode-streamdeck) by Nicollas R.
- Uses [@elgato-stream-deck/node](https://github.com/Julusian/node-elgato-stream-deck) for device communication

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes.
