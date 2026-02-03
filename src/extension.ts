import * as vscode from "vscode";
import Logger from "./logger";
import { ExtensionController } from "./extensionController";
import { Commands, ExtensionScheme } from "./constants";

let extensionController: ExtensionController;

export async function activate(context: vscode.ExtensionContext) {
  // Initialize logger first so we can capture any errors
  Logger.initialize(context);
  Logger.log("Stream Deck extension activating...");
  Logger.log(`Platform: ${process.platform}, Arch: ${process.arch}`);
  Logger.log(`Node version: ${process.version}`);
  Logger.log(`VSCode version: ${vscode.version}`);

  try {
    // Test native module loading early to catch issues
    await testNativeModules();
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    Logger.error(`Native module loading failed: ${error.message}`);
    Logger.log("Stack trace: " + (error.stack || "N/A"));

    // Show user-friendly error message
    const message = getNativeModuleErrorMessage(error);
    vscode.window.showErrorMessage(message, "Show Output").then((selection) => {
      if (selection === "Show Output") {
        Logger.show();
      }
    });

    // Still register commands so user can try to diagnose
    registerCommands(context);
    return;
  }

  try {
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    statusBar.command = `${ExtensionScheme}.${Commands.OpenConfiguration}`;
    statusBar.tooltip = "Click to configure Stream Deck";
    context.subscriptions.push(statusBar);

    extensionController = new ExtensionController(statusBar, context);

    registerCommands(context);

    // Watch for configuration changes
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("streamdeck")) {
        Logger.log("Configuration changed, reloading...");
        extensionController.loadConfiguration();
      }
    });

    await extensionController.activate();

    Logger.log("Stream Deck extension activated successfully");
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    Logger.error(`Extension activation failed: ${error.message}`);
    Logger.log("Stack trace: " + (error.stack || "N/A"));
    vscode.window.showErrorMessage(
      `Stream Deck Studio failed to activate: ${error.message}`,
      "Show Output"
    ).then((selection) => {
      if (selection === "Show Output") {
        Logger.show();
      }
    });
  }
}

async function testNativeModules(): Promise<void> {
  Logger.log("Testing native module loading...");

  // Test @elgato-stream-deck/node (which loads node-hid)
  try {
    Logger.log("Loading @elgato-stream-deck/node...");
    const streamDeck = await import("@elgato-stream-deck/node");
    Logger.log("@elgato-stream-deck/node loaded successfully");

    // Try to list devices to verify full functionality
    const devices = await streamDeck.listStreamDecks();
    Logger.log(`Found ${devices.length} Stream Deck device(s)`);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    Logger.error(`Failed to load @elgato-stream-deck/node: ${error.message}`);
    throw new Error(`Stream Deck library failed to load: ${error.message}`);
  }

  // Test @resvg/resvg-js
  try {
    Logger.log("Loading @resvg/resvg-js...");
    await import("@resvg/resvg-js");
    Logger.log("@resvg/resvg-js loaded successfully");
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    Logger.error(`Failed to load @resvg/resvg-js: ${error.message}`);
    throw new Error(`SVG rendering library failed to load: ${error.message}`);
  }

  Logger.log("All native modules loaded successfully");
}

function getNativeModuleErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (process.platform === "win32") {
    if (message.includes("module") && (message.includes("not found") || message.includes("cannot find"))) {
      return "Stream Deck Studio: Native module not found. Please try reinstalling the extension or install Visual C++ Redistributable 2019+.";
    }
    if (message.includes("access") || message.includes("permission")) {
      return "Stream Deck Studio: USB access denied. Make sure Elgato Stream Deck software is installed (provides USB drivers).";
    }
  }

  if (message.includes("hid")) {
    return "Stream Deck Studio: USB HID access failed. Ensure your Stream Deck is connected and drivers are installed.";
  }

  return `Stream Deck Studio failed to load: ${error.message}`;
}

export async function deactivate() {
  if (extensionController) {
    await extensionController.deactivate();
  }
}

function registerCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(`${ExtensionScheme}.${Commands.Reconnect}`, async () => {
      await extensionController.reconnect();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(`${ExtensionScheme}.${Commands.ActivateSession}`, () => {
      Logger.log("Stream Deck session activated");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(`${ExtensionScheme}.${Commands.OpenConfiguration}`, () => {
      extensionController.openConfigurationPanel();
    })
  );

  // Smart Commit - generates commit message with AI and opens SCM
  context.subscriptions.push(
    vscode.commands.registerCommand(`${ExtensionScheme}.${Commands.SmartCommit}`, async () => {
      Logger.log("Smart Commit triggered");

      // First, focus the SCM view to ensure it's visible
      await vscode.commands.executeCommand("workbench.view.scm");

      // Wait for SCM to be ready
      await new Promise(resolve => setTimeout(resolve, 300));

      // Focus the commit input box
      await vscode.commands.executeCommand("git.commitMessageInputFocus");

      // Wait for focus
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now generate the commit message with Copilot
      try {
        await vscode.commands.executeCommand("github.copilot.git.generateCommitMessage");
        Logger.log("Copilot commit message generated");
      } catch (err) {
        Logger.log("Copilot not available, manual entry required");
      }
    })
  );
}
