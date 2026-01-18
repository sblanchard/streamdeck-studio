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
