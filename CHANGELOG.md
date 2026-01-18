# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [5.0.4] - 2026-01-18

### Fixed

- Added bounds checking for button rendering to properly support all Stream Deck models
- Buttons beyond device capacity are now correctly skipped (Mini=6, Standard=15, XL=32)

## [5.0.3] - 2026-01-18

### Added

- **Smart Commit Command** - New `streamdeck.smartCommit` command that intelligently selects AI assistant:
  1. Uses Claude Code if available (primary)
  2. Falls back to GitHub Copilot if Claude not found
  3. Falls back to regular git commit if no AI assistant installed

### Changed

- Commit button now uses Smart Commit for AI-assisted commit messages

## [5.0.2] - 2026-01-18

### Changed

- Commit button now uses GitHub Copilot to auto-generate commit messages

## [5.0.1] - 2026-01-18

### Added

- **Default Button Presets** - Ships with 32 pre-configured buttons for Stream Deck XL (4x8 layout)
  - Row 0: Core Actions (Save, Open, Search, Format, Terminal, Run, Stop, Commands)
  - Row 1: Git Operations (Commit, Push, Pull, Sync, Branch, Checkout, Stash, SCM)
  - Row 2: Editor Actions (Comment, Sidebar, Panel, Symbol, Go Def, Rename, Fix, Close)
  - Row 3: Nav & Tools (Back, Forward, Split, Zen, Settings, History, Task, Config)
- **VS Code Codicons Integration** - Uses official VS Code icons for button graphics
- **Icon Generator** - Generates attractive button images with gradient backgrounds
- **New Settings**:
  - `streamdeck.useDefaultButtons` - Toggle default button presets (default: true)
- **Fallback Rendering** - Pixel-art fallback when codicons unavailable

### Changed

- Default brightness changed to 80%
- User button configurations now override defaults (not replace entirely)
- Improved Linux udev rules documentation

### Fixed

- Native module crash when switching between snap and deb VS Code installations

## [5.0.0] - 2026-01-18

### Added

- **Visual Configuration Panel** - New webview-based UI for configuring Stream Deck buttons
  - Click the status bar item to open the configuration panel
  - Visual button grid that matches your device layout
  - Real-time connection status indicator
  - Device selector for multi-device setups
- **Button Editor Modal** - Comprehensive button configuration interface
  - VS Code command autocomplete with search
  - Terminal command execution
  - Create new terminals with custom settings
  - Insert code snippets
  - Change editor language
  - Open folders/workspaces
- **Copy & Paste** - Duplicate button configurations easily
- **Clear All** - Remove all button configurations with one click
- **Form Validation** - Required field validation with helpful error messages
- **JSON Validation** - Validate command arguments in real-time
- **Live Updates** - Device connection changes reflect immediately in the UI
- **Brightness Control** - Adjust Stream Deck brightness from the configuration panel
- **Icon Picker** - Browse and select icon images for buttons
- **Folder Picker** - Browse for folders when configuring open folder actions

### Changed

- Rebranded as "StreamDeck Studio" by serialcoder
- Modernized codebase with TypeScript 5.0
- Updated to @elgato-stream-deck/node v7.3.3 for improved device support
- Status bar click now opens configuration panel instead of reconnecting
- Improved event handling with proper cleanup on dispose

### Fixed

- Memory leaks from event subscriptions not being cleaned up
- Device detection reliability improvements

## [4.1.5] - 2020-05-28

### Added

- Added open folder action.

## [3.1.5] - 2020-04-06

### Changed

- Update dependencies.
- Migrate from tslint to eslint.

## [3.1.4] - 2020-03-04

### Changed

- Improved activation.

## [3.1.3] - 2020-03-03

### Changed

- Set session as inactive when connecting.

## [3.1.2] - 2020-03-02

### Changed

- Click on the status bar activate the session.

## [3.0.2] - 2020-01-01

### Added

- Insert snippet key

## [2.0.2] - 2019-12-09

### Added

- Change language key

### Changed

- "Execute Command" key now support arguments.
