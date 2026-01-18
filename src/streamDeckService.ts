import {
  listStreamDecks,
  openStreamDeck,
  StreamDeck,
  StreamDeckButtonControlDefinition,
  StreamDeckEncoderControlDefinition,
} from "@elgato-stream-deck/node";
import { SignalDispatcher, SimpleEventDispatcher } from "strongly-typed-events";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import Logger from "./logger";
import { generateButtonIcon, IconStyles, IconShape } from "./iconGenerator";

export interface ButtonConfig {
  command?: string;
  arguments?: string;
  label?: string;
  icon?: string;
  iconShape?: IconShape;
  iconStyle?: keyof typeof IconStyles;
  terminalCommand?: string;
  createTerminal?: {
    name?: string;
    shellPath?: string;
    shellArgs?: string;
    workingDirectory?: string;
    preserveFocus?: boolean;
  };
  snippet?: string;
  languageId?: string;
  openFolder?: {
    path: string;
    newWindow?: boolean;
  };
}

export interface StreamDeckConfiguration {
  buttons: { [keyIndex: number]: ButtonConfig };
  brightness?: number;
}

export interface StreamDeckDeviceInfo {
  serial: string;
  model: string;
  keyCount: number;
  columns: number;
  rows: number;
  keyWidth: number;
  keyHeight: number;
}

export interface ButtonPressEvent {
  serial: string;
  keyIndex: number;
  config: ButtonConfig;
}

export class StreamDeckService {
  private _onConnected = new SignalDispatcher();
  private _onDisconnected = new SignalDispatcher();
  private _onButtonPressed = new SimpleEventDispatcher<ButtonPressEvent>();
  private _onError = new SimpleEventDispatcher<Error>();

  private devices: Map<string, StreamDeck> = new Map();
  private deviceInfo: Map<string, StreamDeckDeviceInfo> = new Map();
  private configurations: Map<string, StreamDeckConfiguration> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isDiscovering = false;

  constructor() {}

  async discoverAndConnect(): Promise<number> {
    if (this.isDiscovering) {
      Logger.log("Discovery already in progress, skipping...");
      return this.devices.size;
    }

    this.isDiscovering = true;

    try {
      // Platform-specific checks for Linux
      if (process.platform === "linux") {
        this.checkLinuxHidAccess();
      }

      Logger.log("Discovering Stream Deck devices...");
      const deviceList = await listStreamDecks();

      if (deviceList.length === 0) {
        Logger.log("No Stream Deck devices found");
        this.scheduleReconnect();
        return 0;
      }

      Logger.log(`Found ${deviceList.length} Stream Deck device(s)`);

      let connectedCount = 0;

      for (const deviceRef of deviceList) {
        try {
          const device = await openStreamDeck(deviceRef.path);
          const serial = (await device.getSerialNumber()) || `unknown-${connectedCount}`;

          // Get device info from CONTROLS
          const buttons = device.CONTROLS.filter(
            (c): c is StreamDeckButtonControlDefinition => c.type === "button"
          );
          const keyCount = buttons.length;

          // Calculate rows and columns from controls
          const maxRow = Math.max(...buttons.map((b) => b.row)) + 1;
          const maxCol = Math.max(...buttons.map((b) => b.column)) + 1;

          // Get button size from the first LCD-enabled button, or default to 72
          let keySize = 72;
          const lcdButton = buttons.find((b) => b.feedbackType === "lcd");
          if (lcdButton && "pixelSize" in lcdButton) {
            keySize = lcdButton.pixelSize.width;
          }

          // Store device info
          const info: StreamDeckDeviceInfo = {
            serial,
            model: device.PRODUCT_NAME,
            keyCount,
            columns: maxCol,
            rows: maxRow,
            keyWidth: keySize,
            keyHeight: keySize,
          };
          this.deviceInfo.set(serial, info);

          // Set up event handlers
          device.on(
            "down",
            (control: StreamDeckButtonControlDefinition | StreamDeckEncoderControlDefinition) => {
              if (control.type === "button") {
                this.onKeyDown(serial, control.index);
              }
            }
          );

          device.on(
            "up",
            (control: StreamDeckButtonControlDefinition | StreamDeckEncoderControlDefinition) => {
              if (control.type === "button") {
                this.onKeyUp(serial, control.index);
              }
            }
          );

          device.on("error", (err: unknown) => {
            const error = err instanceof Error ? err : new Error(String(err));
            Logger.error(`Stream Deck error (${serial}): ${error.message}`);
            this._onError.dispatch(error);
          });

          this.devices.set(serial, device);
          connectedCount++;

          Logger.log(
            `Connected to Stream Deck: Model=${info.model}, Serial=${serial}, Keys=${info.keyCount} (${info.columns}x${info.rows})`
          );

          // Apply configuration if available
          const config = this.configurations.get(serial) || this.configurations.get("default");
          if (config) {
            await this.applyConfiguration(serial, config);
          } else {
            // Set default brightness
            await device.setBrightness(100);
          }
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          Logger.error(`Failed to open Stream Deck: ${error.message}`);
          if (process.platform === "linux") {
            this.logLinuxTroubleshooting();
          }
        }
      }

      if (connectedCount > 0) {
        this._onConnected.dispatch();
        Logger.log(`Successfully connected to ${connectedCount} Stream Deck device(s)`);
      } else {
        this.scheduleReconnect();
      }

      return connectedCount;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Logger.error(`Error discovering Stream Deck devices: ${error.message}`);
      if (process.platform === "linux") {
        this.logLinuxTroubleshooting();
      }
      this.scheduleReconnect();
      return 0;
    } finally {
      this.isDiscovering = false;
    }
  }

  private checkLinuxHidAccess(): void {
    // Check if /dev directory exists
    if (!fs.existsSync("/dev")) {
      Logger.log("WARNING: /dev directory not found - USB device access may not be available");
      return;
    }

    // Check for hidraw devices
    try {
      const hidrawDevices = fs.readdirSync("/dev").filter((f) => f.startsWith("hidraw"));
      if (hidrawDevices.length === 0) {
        Logger.log("WARNING: No HID devices detected in /dev");
        Logger.log("Possible causes:");
        Logger.log("  1. Stream Deck not connected to USB");
        Logger.log("  2. Running in container without USB passthrough");
        Logger.log("  3. Insufficient permissions (user not in 'input' or 'plugdev' group)");
        Logger.log("  4. HID kernel modules not loaded");
      }
    } catch {
      // Ignore read errors
    }

    // Check for container environment
    if (fs.existsSync("/proc/1/cgroup")) {
      try {
        const cgroupContent = fs.readFileSync("/proc/1/cgroup", "utf8");
        if (cgroupContent.includes("container") || cgroupContent.includes("docker")) {
          Logger.log("WARNING: Container detected - USB devices may not be accessible");
          Logger.log("Run the application on the host machine for Stream Deck support");
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  private logLinuxTroubleshooting(): void {
    Logger.log("=== Linux Stream Deck Troubleshooting ===");
    Logger.log("1. Install udev rules for Stream Deck:");
    Logger.log("   Create /etc/udev/rules.d/50-elgato-stream-deck.rules with:");
    Logger.log('   SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", MODE="0666", GROUP="plugdev"');
    Logger.log('   KERNEL=="hidraw*", ATTRS{idVendor}=="0fd9", MODE="0666", GROUP="plugdev"');
    Logger.log("");
    Logger.log("2. Reload udev rules:");
    Logger.log("   sudo udevadm control --reload-rules");
    Logger.log("   sudo udevadm trigger");
    Logger.log("");
    Logger.log("3. Add user to plugdev group:");
    Logger.log("   sudo usermod -a -G plugdev $USER");
    Logger.log("");
    Logger.log("4. Unplug and replug the Stream Deck");
    Logger.log("5. Log out and log back in (or restart)");
    Logger.log("==========================================");
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    Logger.log("Scheduling reconnection attempt in 5 seconds...");
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.discoverAndConnect();
    }, 5000);
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    for (const [serial, device] of this.devices) {
      try {
        await device.clearPanel();
        await device.close();
        Logger.log(`Disconnected from Stream Deck: ${serial}`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        Logger.error(`Error disconnecting from Stream Deck ${serial}: ${error.message}`);
      }
    }

    this.devices.clear();
    this.deviceInfo.clear();
    this._onDisconnected.dispatch();
  }

  setConfiguration(serial: string, config: StreamDeckConfiguration): void {
    this.configurations.set(serial, config);

    // Apply immediately if device is connected
    const device = this.devices.get(serial);
    if (device) {
      this.applyConfiguration(serial, config).catch((err) => {
        const error = err instanceof Error ? err : new Error(String(err));
        Logger.error(`Error applying configuration: ${error.message}`);
      });
    }
  }

  setDefaultConfiguration(config: StreamDeckConfiguration): void {
    this.configurations.set("default", config);

    // Apply to all connected devices that don't have a specific config
    for (const serial of this.devices.keys()) {
      if (!this.configurations.has(serial)) {
        this.applyConfiguration(serial, config).catch((err) => {
          const error = err instanceof Error ? err : new Error(String(err));
          Logger.error(`Error applying default configuration: ${error.message}`);
        });
      }
    }
  }

  private async applyConfiguration(
    serial: string,
    config: StreamDeckConfiguration
  ): Promise<void> {
    const device = this.devices.get(serial);
    if (!device) {
      return;
    }

    // Set brightness
    if (config.brightness !== undefined) {
      await device.setBrightness(config.brightness);
    }

    // Clear all keys first
    await device.clearPanel();

    // Get device info to check key count
    const deviceInfo = this.deviceInfo.get(serial);
    const maxKeys = deviceInfo?.keyCount ?? 32;

    // Render buttons with icons/labels (only for keys that exist on this device)
    for (const [keyIndexStr, buttonConfig] of Object.entries(config.buttons)) {
      const keyIndex = parseInt(keyIndexStr, 10);
      if (isNaN(keyIndex) || keyIndex >= maxKeys) {
        continue; // Skip invalid indices or buttons beyond device capacity
      }

      // Use icon generator if iconShape and iconStyle are specified
      if (buttonConfig.iconShape && buttonConfig.iconStyle) {
        await this.renderButtonWithIcon(serial, keyIndex, buttonConfig);
      } else if (buttonConfig.label) {
        await this.renderButtonLabel(serial, keyIndex, buttonConfig.label);
      } else if (buttonConfig.icon) {
        await this.renderButtonIcon(serial, keyIndex, buttonConfig.icon);
      } else {
        // Set a default color for configured buttons
        await this.setButtonColor(serial, keyIndex, 40, 40, 40);
      }
    }

    Logger.log(`Applied ${Math.min(Object.keys(config.buttons).length, maxKeys)} buttons to ${deviceInfo?.model || 'device'} (${maxKeys} keys)`);
  }

  async setButtonColor(
    serial: string,
    keyIndex: number,
    r: number,
    g: number,
    b: number
  ): Promise<void> {
    const device = this.devices.get(serial);
    if (!device) {
      return;
    }

    try {
      await device.fillKeyColor(keyIndex, r, g, b);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Logger.error(`Error setting button color: ${error.message}`);
    }
  }

  async renderButtonLabel(serial: string, keyIndex: number, label: string): Promise<void> {
    const device = this.devices.get(serial);
    const info = this.deviceInfo.get(serial);
    if (!device || !info) {
      return;
    }

    try {
      // For devices that support LCD buttons, generate an image with text
      // For RGB-only devices, just set a color
      const buttons = device.CONTROLS.filter(
        (c): c is StreamDeckButtonControlDefinition => c.type === "button"
      );
      const button = buttons.find((b) => b.index === keyIndex);

      if (button && button.feedbackType === "lcd") {
        // Generate a simple image with text
        const buffer = this.generateTextButton(
          label,
          info.keyWidth,
          info.keyHeight
        );
        await device.fillKeyBuffer(keyIndex, buffer, { format: "rgba" });
      } else {
        // RGB-only - just set a color
        await device.fillKeyColor(keyIndex, 40, 80, 120);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Logger.error(`Error rendering button label: ${error.message}`);
    }
  }

  async renderButtonIcon(serial: string, keyIndex: number, iconPath: string): Promise<void> {
    const device = this.devices.get(serial);
    if (!device) {
      return;
    }

    try {
      const resolvedPath = this.resolveIconPath(iconPath);
      if (fs.existsSync(resolvedPath)) {
        Logger.log(`Loading icon from: ${resolvedPath}`);
        // For now, we'll just set a color - proper icon support would require image processing
        await device.fillKeyColor(keyIndex, 60, 60, 60);
      } else {
        await device.fillKeyColor(keyIndex, 40, 40, 40);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Logger.error(`Error rendering button icon: ${error.message}`);
    }
  }

  /**
   * Render a button with a generated icon using iconShape and iconStyle
   */
  async renderButtonWithIcon(serial: string, keyIndex: number, config: ButtonConfig): Promise<void> {
    const device = this.devices.get(serial);
    const info = this.deviceInfo.get(serial);
    if (!device || !info) {
      return;
    }

    try {
      const buttons = device.CONTROLS.filter(
        (c): c is StreamDeckButtonControlDefinition => c.type === "button"
      );
      const button = buttons.find((b) => b.index === keyIndex);

      if (button && button.feedbackType === "lcd") {
        // Get the style from IconStyles
        const styleName = config.iconStyle || "ui";
        const style = IconStyles[styleName] || IconStyles.ui;

        // Generate the button image
        const buffer = generateButtonIcon(
          info.keyWidth,
          info.keyHeight,
          config.label || "",
          style,
          config.iconShape
        );

        await device.fillKeyBuffer(keyIndex, buffer, { format: "rgba" });
        Logger.log(`Rendered button ${keyIndex} with icon ${config.iconShape} and style ${styleName}`);
      } else {
        // RGB-only device - extract color from style
        const styleName = config.iconStyle || "ui";
        const style = IconStyles[styleName] || IconStyles.ui;
        await device.fillKeyColor(keyIndex, style.bgColor[0], style.bgColor[1], style.bgColor[2]);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Logger.error(`Error rendering button with icon: ${error.message}`);
    }
  }

  private generateTextButton(label: string, width: number, height: number): Uint8Array {
    // Create a simple RGBA buffer
    // This is a basic implementation - for better text rendering, consider using sharp or canvas
    const buffer = new Uint8Array(width * height * 4);

    // Fill with dark gray background
    for (let i = 0; i < width * height; i++) {
      buffer[i * 4] = 40; // R
      buffer[i * 4 + 1] = 40; // G
      buffer[i * 4 + 2] = 40; // B
      buffer[i * 4 + 3] = 255; // A
    }

    // Draw a simple highlight bar at top to indicate the button is configured
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        buffer[i] = 100; // R
        buffer[i + 1] = 150; // G
        buffer[i + 2] = 255; // B
        buffer[i + 3] = 255; // A
      }
    }

    // Note: Proper text rendering would require a graphics library like sharp or canvas
    // For now, we just show a colored button

    return buffer;
  }

  private resolveIconPath(iconPath: string): string {
    if (path.isAbsolute(iconPath)) {
      return iconPath;
    }
    return path.join(os.homedir(), ".config", "vscode-streamdeck", "icons", iconPath);
  }

  private onKeyDown(serial: string, keyIndex: number): void {
    Logger.log(`Stream Deck button pressed: Serial=${serial}, Key=${keyIndex}`);

    const config = this.configurations.get(serial) || this.configurations.get("default");
    if (!config) {
      Logger.log(`No configuration for Stream Deck ${serial}`);
      return;
    }

    const buttonConfig = config.buttons[keyIndex];
    if (!buttonConfig) {
      Logger.log(`Button ${keyIndex} not configured on Stream Deck ${serial}`);
      return;
    }

    this._onButtonPressed.dispatch({
      serial,
      keyIndex,
      config: buttonConfig,
    });
  }

  private onKeyUp(_serial: string, _keyIndex: number): void {
    // Currently we only handle key down events
    // Key up could be used for held button detection
  }

  getConnectedDevices(): StreamDeckDeviceInfo[] {
    return Array.from(this.deviceInfo.values());
  }

  isConnected(): boolean {
    return this.devices.size > 0;
  }

  /**
   * Apply configuration for a single button without clearing other buttons.
   * Used for immediate updates from the webview.
   */
  async applyButtonConfig(keyIndex: number, config: ButtonConfig | null): Promise<void> {
    // Apply to all connected devices (or could be extended to target specific device)
    for (const [serial, device] of this.devices) {
      try {
        if (config === null) {
          // Clear the button
          await device.fillKeyColor(keyIndex, 0, 0, 0);
        } else if (config.label) {
          await this.renderButtonLabel(serial, keyIndex, config.label);
        } else if (config.icon) {
          await this.renderButtonIcon(serial, keyIndex, config.icon);
        } else {
          // Set a default color for configured buttons
          await this.setButtonColor(serial, keyIndex, 40, 40, 40);
        }

        // Update the stored configuration
        const storedConfig = this.configurations.get(serial) || this.configurations.get("default");
        if (storedConfig) {
          if (config === null) {
            delete storedConfig.buttons[keyIndex];
          } else {
            storedConfig.buttons[keyIndex] = config;
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        Logger.error(`Error applying button config for key ${keyIndex}: ${error.message}`);
      }
    }
  }

  /**
   * Set brightness on all connected devices.
   * Used for immediate updates from the webview.
   */
  async setBrightness(brightness: number): Promise<void> {
    const clampedBrightness = Math.max(0, Math.min(100, brightness));

    for (const [serial, device] of this.devices) {
      try {
        await device.setBrightness(clampedBrightness);
        Logger.log(`Set brightness to ${clampedBrightness}% on device ${serial}`);

        // Update stored configuration
        const storedConfig = this.configurations.get(serial) || this.configurations.get("default");
        if (storedConfig) {
          storedConfig.brightness = clampedBrightness;
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        Logger.error(`Error setting brightness on device ${serial}: ${error.message}`);
      }
    }
  }

  get onConnected() {
    return this._onConnected.asEvent();
  }

  get onDisconnected() {
    return this._onDisconnected.asEvent();
  }

  get onButtonPressed() {
    return this._onButtonPressed.asEvent();
  }

  get onError() {
    return this._onError.asEvent();
  }
}
