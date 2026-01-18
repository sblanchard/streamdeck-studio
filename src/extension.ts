import * as vscode from "vscode";
import Logger from "./logger";
import { ExtensionController } from "./extensionController";
import { Commands, ExtensionScheme } from "./constants";

let extensionController: ExtensionController;

export async function activate(context: vscode.ExtensionContext) {
  Logger.initialize(context);
  Logger.log("Stream Deck extension activating...");

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

  Logger.log("Stream Deck extension activated");
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
}
