import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { StreamDeckService, ButtonConfig, StreamDeckDeviceInfo } from "../streamDeckService";
import {
  WebviewToExtensionMessage,
  ExtensionToWebviewMessage,
  CommandInfo,
  LanguageInfo,
} from "./messageTypes";
import Logger from "../logger";

export class StreamDeckPanel {
  public static currentPanel: StreamDeckPanel | undefined;
  private static readonly viewType = "streamDeckConfiguration";

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly streamDeckService: StreamDeckService;
  private disposables: vscode.Disposable[] = [];
  private commandsCache: CommandInfo[] | null = null;
  private eventUnsubscribers: (() => void)[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    streamDeckService: StreamDeckService
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.streamDeckService = streamDeckService;

    this.panel.webview.html = this.getHtmlContent();

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => this.handleMessage(message),
      null,
      this.disposables
    );

    // Subscribe to service events for live updates
    this.subscribeToServiceEvents();
  }

  private subscribeToServiceEvents(): void {
    // Subscribe to connection events
    const connectedUnsub = this.streamDeckService.onConnected.subscribe(() => {
      this.sendDevices();
      this.sendConnectionStatus();
    });

    const disconnectedUnsub = this.streamDeckService.onDisconnected.subscribe(() => {
      this.sendDevices();
      this.sendConnectionStatus();
    });

    // Store unsubscribe functions for cleanup
    this.eventUnsubscribers.push(
      () => connectedUnsub(),
      () => disconnectedUnsub()
    );
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    streamDeckService: StreamDeckService
  ): StreamDeckPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (StreamDeckPanel.currentPanel) {
      StreamDeckPanel.currentPanel.panel.reveal(column);
      return StreamDeckPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      StreamDeckPanel.viewType,
      "Stream Deck Configuration",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(extensionUri.fsPath, "src", "webview")),
          vscode.Uri.file(path.join(extensionUri.fsPath, "out", "webview")),
        ],
      }
    );

    StreamDeckPanel.currentPanel = new StreamDeckPanel(panel, extensionUri, streamDeckService);
    return StreamDeckPanel.currentPanel;
  }

  private async handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    switch (message.type) {
      case "ready":
        await this.sendInitialData();
        break;

      case "getDevices":
        this.sendDevices();
        break;

      case "getConfiguration":
        this.sendConfiguration();
        break;

      case "saveButton":
        await this.saveButtonConfig(message.keyIndex, message.config);
        break;

      case "removeButton":
        await this.removeButtonConfig(message.keyIndex);
        break;

      case "copyButton":
        await this.copyButtonConfig(message.fromIndex, message.toIndex);
        break;

      case "clearAllButtons":
        await this.clearAllButtons();
        break;

      case "requestCommands":
        await this.sendCommands(message.searchTerm);
        break;

      case "requestLanguages":
        this.sendLanguages();
        break;

      case "pickIcon":
        await this.pickIcon();
        break;

      case "pickFolder":
        await this.pickFolder();
        break;

      case "setBrightness":
        await this.setBrightness(message.value);
        break;

      case "reconnect":
        await this.reconnect();
        break;
    }
  }

  private async sendInitialData(): Promise<void> {
    this.sendDevices();
    this.sendConfiguration();
    this.sendConnectionStatus();
  }

  private sendDevices(): void {
    const devices = this.streamDeckService.getConnectedDevices();
    this.postMessage({ type: "devices", devices });
  }

  private sendConfiguration(): void {
    const config = vscode.workspace.getConfiguration("streamdeck");
    const buttons = config.get<{ [key: string]: ButtonConfig }>("buttons") || {};
    const brightness = config.get<number>("brightness") || 100;
    this.postMessage({ type: "configuration", buttons, brightness });
  }

  private sendConnectionStatus(): void {
    const devices = this.streamDeckService.getConnectedDevices();
    this.postMessage({
      type: "connectionStatus",
      connected: devices.length > 0,
      deviceCount: devices.length,
    });
  }

  private async saveButtonConfig(keyIndex: number, buttonConfig: ButtonConfig): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration("streamdeck");
      const buttons = config.get<{ [key: string]: ButtonConfig }>("buttons") || {};

      buttons[keyIndex.toString()] = buttonConfig;

      await config.update("buttons", buttons, vscode.ConfigurationTarget.Global);

      // Apply immediately to the device
      await this.streamDeckService.applyButtonConfig(keyIndex, buttonConfig);

      Logger.log(`Saved button configuration for key ${keyIndex}`);

      // Send updated configuration back
      const brightness = config.get<number>("brightness") || 100;
      this.postMessage({ type: "configurationUpdated", buttons, brightness });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      Logger.error(`Failed to save button configuration: ${err.message}`);
      this.postMessage({ type: "error", message: `Failed to save: ${err.message}` });
    }
  }

  private async removeButtonConfig(keyIndex: number): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration("streamdeck");
      const buttons = config.get<{ [key: string]: ButtonConfig }>("buttons") || {};

      delete buttons[keyIndex.toString()];

      await config.update("buttons", buttons, vscode.ConfigurationTarget.Global);

      // Clear the button on the device immediately
      await this.streamDeckService.applyButtonConfig(keyIndex, null);

      Logger.log(`Removed button configuration for key ${keyIndex}`);

      // Send updated configuration back
      const brightness = config.get<number>("brightness") || 100;
      this.postMessage({ type: "configurationUpdated", buttons, brightness });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      Logger.error(`Failed to remove button configuration: ${err.message}`);
      this.postMessage({ type: "error", message: `Failed to remove: ${err.message}` });
    }
  }

  private async copyButtonConfig(fromIndex: number, toIndex: number): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration("streamdeck");
      const buttons = config.get<{ [key: string]: ButtonConfig }>("buttons") || {};

      const sourceConfig = buttons[fromIndex.toString()];
      if (!sourceConfig) {
        this.postMessage({ type: "error", message: "Source button has no configuration" });
        return;
      }

      // Deep copy the configuration
      buttons[toIndex.toString()] = JSON.parse(JSON.stringify(sourceConfig));

      await config.update("buttons", buttons, vscode.ConfigurationTarget.Global);

      // Apply immediately to the device
      await this.streamDeckService.applyButtonConfig(toIndex, buttons[toIndex.toString()]);

      Logger.log(`Copied button configuration from key ${fromIndex} to key ${toIndex}`);

      // Send updated configuration back
      const brightness = config.get<number>("brightness") || 100;
      this.postMessage({ type: "configurationUpdated", buttons, brightness });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      Logger.error(`Failed to copy button configuration: ${err.message}`);
      this.postMessage({ type: "error", message: `Failed to copy: ${err.message}` });
    }
  }

  private async clearAllButtons(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration("streamdeck");

      await config.update("buttons", {}, vscode.ConfigurationTarget.Global);

      // Clear all buttons on the device
      const devices = this.streamDeckService.getConnectedDevices();
      for (const device of devices) {
        for (let i = 0; i < device.keyCount; i++) {
          await this.streamDeckService.applyButtonConfig(i, null);
        }
      }

      Logger.log("Cleared all button configurations");

      // Send updated configuration back
      const brightness = config.get<number>("brightness") || 100;
      this.postMessage({ type: "configurationUpdated", buttons: {}, brightness });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      Logger.error(`Failed to clear all buttons: ${err.message}`);
      this.postMessage({ type: "error", message: `Failed to clear: ${err.message}` });
    }
  }

  private async reconnect(): Promise<void> {
    try {
      await this.streamDeckService.disconnect();
      await this.streamDeckService.discoverAndConnect();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      Logger.error(`Failed to reconnect: ${err.message}`);
      this.postMessage({ type: "error", message: `Failed to reconnect: ${err.message}` });
    }
  }

  private async sendCommands(searchTerm: string): Promise<void> {
    // Cache commands on first request
    if (!this.commandsCache) {
      const allCommands = await vscode.commands.getCommands(true);
      this.commandsCache = allCommands.map((cmd) => {
        const parts = cmd.split(".");
        return {
          id: cmd,
          title: parts[parts.length - 1],
          category: parts.length > 1 ? parts[0] : undefined,
        };
      });
    }

    // Filter by search term
    const term = searchTerm.toLowerCase();
    const filtered = term
      ? this.commandsCache.filter(
          (cmd) =>
            cmd.id.toLowerCase().includes(term) ||
            cmd.title.toLowerCase().includes(term) ||
            (cmd.category && cmd.category.toLowerCase().includes(term))
        )
      : this.commandsCache;

    // Limit results
    const limited = filtered.slice(0, 50);

    this.postMessage({ type: "commands", commands: limited });
  }

  private sendLanguages(): void {
    const languages = vscode.languages.getLanguages();
    languages.then((langs) => {
      const languageInfos: LanguageInfo[] = langs.map((lang) => ({
        id: lang,
        name: lang,
      }));
      this.postMessage({ type: "languages", languages: languageInfos });
    });
  }

  private async pickIcon(): Promise<void> {
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        Images: ["png", "jpg", "jpeg", "gif", "svg", "bmp"],
      },
      openLabel: "Select Icon",
    });

    if (result && result.length > 0) {
      this.postMessage({ type: "iconPicked", path: result[0].fsPath });
    }
  }

  private async pickFolder(): Promise<void> {
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Select Folder",
    });

    if (result && result.length > 0) {
      this.postMessage({ type: "folderPicked", path: result[0].fsPath });
    }
  }

  private async setBrightness(value: number): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration("streamdeck");
      await config.update("brightness", value, vscode.ConfigurationTarget.Global);

      // Apply immediately to the device
      await this.streamDeckService.setBrightness(value);

      Logger.log(`Set brightness to ${value}`);
      this.postMessage({ type: "brightnessUpdated", value });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      Logger.error(`Failed to set brightness: ${err.message}`);
      this.postMessage({ type: "error", message: `Failed to set brightness: ${err.message}` });
    }
  }

  private postMessage(message: ExtensionToWebviewMessage): void {
    this.panel.webview.postMessage(message);
  }

  private getHtmlContent(): string {
    const webview = this.panel.webview;

    // Get URIs for resources
    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.extensionUri.fsPath, "src", "webview", "styles", "main.css"))
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.extensionUri.fsPath, "src", "webview", "scripts", "main.js"))
    );

    // Read HTML template
    const htmlPath = path.join(
      this.extensionUri.fsPath,
      "src",
      "webview",
      "html",
      "main.html"
    );

    let htmlContent: string;

    if (fs.existsSync(htmlPath)) {
      htmlContent = fs.readFileSync(htmlPath, "utf8");
    } else {
      // Fallback inline HTML if file doesn't exist
      htmlContent = this.getInlineHtml();
    }

    // Replace placeholders
    const nonce = this.getNonce();
    htmlContent = htmlContent
      .replace(/\${styleUri}/g, styleUri.toString())
      .replace(/\${scriptUri}/g, scriptUri.toString())
      .replace(/\${nonce}/g, nonce)
      .replace(/\${cspSource}/g, webview.cspSource);

    return htmlContent;
  }

  private getInlineHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src \${cspSource} 'unsafe-inline'; script-src 'nonce-\${nonce}'; img-src \${cspSource} data: https:;">
    <link href="\${styleUri}" rel="stylesheet">
    <title>Stream Deck Configuration</title>
</head>
<body>
    <div id="app">
        <header class="header">
            <div class="header-left">
                <h1>Stream Deck Configuration</h1>
                <div id="connection-status" class="connection-status disconnected">
                    <span class="status-dot"></span>
                    <span class="status-text">Disconnected</span>
                </div>
            </div>
            <div class="header-right">
                <div class="device-selector">
                    <label for="device-select">Device:</label>
                    <select id="device-select">
                        <option value="">No device connected</option>
                    </select>
                </div>
                <button id="reconnect-btn" class="btn-secondary btn-small">Reconnect</button>
                <button id="clear-all-btn" class="btn-danger btn-small">Clear All</button>
            </div>
        </header>

        <main class="main-content">
            <div id="button-grid" class="button-grid">
                <!-- Buttons will be rendered here -->
            </div>

            <div class="brightness-control">
                <label for="brightness-slider">Brightness:</label>
                <input type="range" id="brightness-slider" min="0" max="100" value="100">
                <span id="brightness-value">100%</span>
            </div>
        </main>

        <!-- Button Edit Modal -->
        <div id="edit-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="modal-title">Configure Button</h2>
                    <button id="modal-close" class="close-btn">&times;</button>
                </div>
                <form id="button-form">
                    <div class="form-group">
                        <label for="action-type">Action Type</label>
                        <select id="action-type" required>
                            <option value="command">VS Code Command</option>
                            <option value="terminal">Terminal Command</option>
                            <option value="createTerminal">Create Terminal</option>
                            <option value="snippet">Insert Snippet</option>
                            <option value="language">Set Language</option>
                            <option value="openFolder">Open Folder</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="button-label">Label</label>
                        <input type="text" id="button-label" placeholder="Button label">
                    </div>

                    <div class="form-group">
                        <label for="button-icon">Icon</label>
                        <div class="icon-picker">
                            <input type="text" id="button-icon" placeholder="Icon path">
                            <button type="button" id="browse-icon">Browse</button>
                        </div>
                        <div id="icon-preview" class="icon-preview hidden"></div>
                    </div>

                    <!-- Command fields -->
                    <div id="command-fields" class="action-fields">
                        <div class="form-group">
                            <label for="command-input">Command <span class="required">*</span></label>
                            <input type="text" id="command-input" placeholder="Type to search commands..." autocomplete="off">
                            <div id="command-suggestions" class="suggestions hidden"></div>
                            <div id="command-error" class="field-error hidden">Please enter a command</div>
                        </div>
                        <div class="form-group">
                            <label for="command-args">Arguments (JSON)</label>
                            <textarea id="command-args" placeholder='{"key": "value"}'></textarea>
                            <div id="args-error" class="field-error hidden">Invalid JSON format</div>
                        </div>
                    </div>

                    <!-- Terminal command fields -->
                    <div id="terminal-fields" class="action-fields hidden">
                        <div class="form-group">
                            <label for="terminal-command">Command <span class="required">*</span></label>
                            <input type="text" id="terminal-command" placeholder="npm run build">
                            <div id="terminal-error" class="field-error hidden">Please enter a command</div>
                        </div>
                    </div>

                    <!-- Create terminal fields -->
                    <div id="create-terminal-fields" class="action-fields hidden">
                        <div class="form-group">
                            <label for="terminal-name">Terminal Name</label>
                            <input type="text" id="terminal-name" placeholder="My Terminal">
                        </div>
                        <div class="form-group">
                            <label for="shell-path">Shell Path</label>
                            <input type="text" id="shell-path" placeholder="/bin/bash">
                        </div>
                        <div class="form-group">
                            <label for="shell-args">Shell Arguments</label>
                            <input type="text" id="shell-args" placeholder="--login">
                        </div>
                        <div class="form-group">
                            <label for="working-dir">Working Directory</label>
                            <div class="folder-picker">
                                <input type="text" id="working-dir" placeholder="/path/to/dir">
                                <button type="button" id="browse-working-dir">Browse</button>
                            </div>
                        </div>
                        <div class="form-group checkbox">
                            <input type="checkbox" id="preserve-focus">
                            <label for="preserve-focus">Preserve Focus</label>
                        </div>
                    </div>

                    <!-- Snippet fields -->
                    <div id="snippet-fields" class="action-fields hidden">
                        <div class="form-group">
                            <label for="snippet-name">Snippet Name <span class="required">*</span></label>
                            <input type="text" id="snippet-name" placeholder="my-snippet">
                            <div id="snippet-error" class="field-error hidden">Please enter a snippet name</div>
                        </div>
                    </div>

                    <!-- Language fields -->
                    <div id="language-fields" class="action-fields hidden">
                        <div class="form-group">
                            <label for="language-select">Language <span class="required">*</span></label>
                            <select id="language-select">
                                <option value="">Select language...</option>
                            </select>
                            <div id="language-error" class="field-error hidden">Please select a language</div>
                        </div>
                    </div>

                    <!-- Open folder fields -->
                    <div id="folder-fields" class="action-fields hidden">
                        <div class="form-group">
                            <label for="folder-path">Folder Path <span class="required">*</span></label>
                            <div class="folder-picker">
                                <input type="text" id="folder-path" placeholder="/path/to/folder">
                                <button type="button" id="browse-folder">Browse</button>
                            </div>
                            <div id="folder-error" class="field-error hidden">Please enter a folder path</div>
                        </div>
                        <div class="form-group checkbox">
                            <input type="checkbox" id="new-window">
                            <label for="new-window">Open in New Window</label>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" id="copy-button" class="btn-secondary" title="Copy to another button">Copy</button>
                        <button type="button" id="remove-button" class="btn-danger">Remove</button>
                        <div class="spacer"></div>
                        <button type="button" id="cancel-button" class="btn-secondary">Cancel</button>
                        <button type="submit" class="btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Copy Target Modal -->
        <div id="copy-modal" class="modal hidden">
            <div class="modal-content modal-small">
                <div class="modal-header">
                    <h2>Copy to Button</h2>
                    <button id="copy-modal-close" class="close-btn">&times;</button>
                </div>
                <div class="copy-modal-body">
                    <p>Select the target button to copy this configuration to:</p>
                    <div id="copy-target-grid" class="copy-target-grid">
                        <!-- Copy target buttons will be rendered here -->
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script nonce="\${nonce}" src="\${scriptUri}"></script>
</body>
</html>`;
  }

  private getNonce(): string {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  public dispose(): void {
    StreamDeckPanel.currentPanel = undefined;

    // Unsubscribe from service events
    for (const unsub of this.eventUnsubscribers) {
      unsub();
    }
    this.eventUnsubscribers = [];

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
