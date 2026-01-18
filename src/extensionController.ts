import * as vscode from "vscode";
import { StreamDeckService, ButtonPressEvent, StreamDeckConfiguration, ButtonConfig } from "./streamDeckService";
import { ExtensionStatus } from "./extensionStatus";
import { StreamDeckPanel } from "./webview/StreamDeckPanel";
import Logger from "./logger";
import { getDefaultButtons, DEFAULT_BRIGHTNESS, DefaultButtonConfig } from "./defaultButtons";

export class ExtensionController {
  private streamDeck: StreamDeckService;
  private status: ExtensionStatus;
  private context: vscode.ExtensionContext;

  constructor(
    statusBar: vscode.StatusBarItem,
    context: vscode.ExtensionContext
  ) {
    this.context = context;
    this.status = new ExtensionStatus(statusBar);
    this.streamDeck = new StreamDeckService();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.streamDeck.onConnected.subscribe(() => this.onConnected());
    this.streamDeck.onDisconnected.subscribe(() => this.onDisconnected());
    this.streamDeck.onButtonPressed.subscribe((event) => this.onButtonPressed(event));
    this.streamDeck.onError.subscribe((error) => this.onError(error));
  }

  async activate(): Promise<void> {
    Logger.log("Activating Stream Deck extension...");
    this.status.setAsConnecting();

    // Load configuration
    this.loadConfiguration();

    // Start device discovery
    await this.streamDeck.discoverAndConnect();
  }

  async deactivate(): Promise<void> {
    Logger.log("Deactivating Stream Deck extension...");
    await this.streamDeck.disconnect();
  }

  async reconnect(): Promise<void> {
    Logger.log("Reconnecting to Stream Deck...");
    this.status.setAsConnecting();
    await this.streamDeck.disconnect();
    await this.streamDeck.discoverAndConnect();
  }

  openConfigurationPanel(): void {
    Logger.log("Opening Stream Deck configuration panel");
    const extensionUri = vscode.Uri.file(this.context.extensionPath);
    StreamDeckPanel.createOrShow(extensionUri, this.streamDeck);
  }

  loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration("streamdeck");
    const buttonsConfig = config.get<{ [key: string]: ButtonConfig }>("buttons") || {};
    const brightness = config.get<number>("brightness");
    const useDefaults = config.get<boolean>("useDefaultButtons") !== false; // Default to true

    // Convert string keys to numbers for user button configuration
    const userButtons: { [keyIndex: number]: ButtonConfig } = {};
    for (const [key, value] of Object.entries(buttonsConfig)) {
      const keyIndex = parseInt(key, 10);
      if (!isNaN(keyIndex)) {
        userButtons[keyIndex] = value;
      }
    }

    // Get default buttons based on typical device size (will be adjusted per device)
    // Use 32 as default to support XL, smaller decks will just ignore higher indices
    const defaultButtons = useDefaults ? getDefaultButtons(32) : {};

    // Merge: user config overrides defaults
    const buttons: { [keyIndex: number]: ButtonConfig } = {
      ...defaultButtons,
      ...userButtons,
    };

    const streamDeckConfig: StreamDeckConfiguration = {
      buttons,
      brightness: brightness ?? DEFAULT_BRIGHTNESS,
    };

    this.streamDeck.setDefaultConfiguration(streamDeckConfig);

    const userCount = Object.keys(userButtons).length;
    const defaultCount = Object.keys(defaultButtons).length;
    if (userCount > 0) {
      Logger.log(`Loaded configuration: ${userCount} user button(s), ${defaultCount} default(s)`);
    } else {
      Logger.log(`Using ${defaultCount} default button(s)`);
    }
  }

  private onConnected(): void {
    Logger.log("Connected to Stream Deck");
    this.status.setAsConnected();
    this.status.setActive();

    const devices = this.streamDeck.getConnectedDevices();
    for (const device of devices) {
      Logger.log(`Device: ${device.model} (${device.serial}) - ${device.keyCount} keys`);
    }
  }

  private onDisconnected(): void {
    Logger.log("Disconnected from Stream Deck");
    this.status.setAsConnecting();
    this.status.setInactive();
  }

  private onError(error: Error): void {
    Logger.error(`Stream Deck error: ${error.message}`);
  }

  private async onButtonPressed(event: ButtonPressEvent): Promise<void> {
    const { serial, keyIndex, config } = event;
    Logger.log(`Button ${keyIndex} pressed on device ${serial}`);

    try {
      // Execute VSCode command
      if (config.command) {
        await this.executeCommand(config.command, config.arguments);
      }

      // Execute terminal command
      if (config.terminalCommand) {
        await this.executeTerminalCommand(config.terminalCommand);
      }

      // Create terminal
      if (config.createTerminal) {
        await this.createTerminal(config.createTerminal);
      }

      // Insert snippet
      if (config.snippet) {
        await this.insertSnippet(config.snippet);
      }

      // Change language
      if (config.languageId) {
        await this.changeLanguage(config.languageId);
      }

      // Open folder
      if (config.openFolder) {
        await this.openFolder(config.openFolder.path, config.openFolder.newWindow);
      }
    } catch (err) {
      const error = err as Error;
      Logger.error(`Error handling button press: ${error.message}`);
    }
  }

  private async executeCommand(command: string, args?: string): Promise<void> {
    Logger.log(`Executing command: ${command}`);

    let commandArgs: any;
    if (args) {
      try {
        commandArgs = JSON.parse(args);
      } catch {
        // If not valid JSON, use as-is
        commandArgs = args;
      }
    }

    if (commandArgs !== undefined) {
      await vscode.commands.executeCommand(command, commandArgs);
    } else {
      await vscode.commands.executeCommand(command);
    }
  }

  private async executeTerminalCommand(command: string): Promise<void> {
    const terminal = vscode.window.activeTerminal;

    if (terminal) {
      terminal.show(true);
      terminal.sendText(command);
      Logger.log(`Sent command to terminal: ${command}`);
    } else {
      Logger.log("No active terminal - creating one");
      const newTerminal = vscode.window.createTerminal();
      newTerminal.show(false);
      newTerminal.sendText(command);
    }
  }

  private async createTerminal(options: {
    name?: string;
    shellPath?: string;
    shellArgs?: string;
    workingDirectory?: string;
    preserveFocus?: boolean;
  }): Promise<void> {
    const terminal = vscode.window.createTerminal({
      name: options.name,
      shellPath: options.shellPath,
      shellArgs: options.shellArgs,
      cwd: options.workingDirectory,
    });

    terminal.show(options.preserveFocus ?? false);
    this.context.subscriptions.push(terminal);
    Logger.log(`Created terminal: ${options.name || "unnamed"}`);
  }

  private async insertSnippet(snippetName: string): Promise<void> {
    await vscode.commands.executeCommand("editor.action.insertSnippet", {
      name: snippetName,
    });
    Logger.log(`Inserted snippet: ${snippetName}`);
  }

  private async changeLanguage(languageId: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      await vscode.languages.setTextDocumentLanguage(editor.document, languageId);
      Logger.log(`Changed language to: ${languageId}`);
    }
  }

  private async openFolder(folderPath: string, newWindow?: boolean): Promise<void> {
    await vscode.commands.executeCommand(
      "vscode.openFolder",
      vscode.Uri.file(folderPath),
      newWindow ?? false
    );
    Logger.log(`Opened folder: ${folderPath}`);
  }
}
