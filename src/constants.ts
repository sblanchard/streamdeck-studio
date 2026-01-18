export const InternalExtensionId = "vscode-streamdeck";
export const ExtensionId = `nicollasricas.${InternalExtensionId}`;
export const ExtensionScheme = "streamdeck";

export enum Commands {
  Reconnect = "reconnectToServer",
  ActivateSession = "activateSession",
  OpenConfiguration = "openConfiguration",
  SmartCommit = "smartCommit",
}

export enum Configurations {
  ServerHost = "streamdeck.serverHost",
  ServerPort = "streamdeck.serverPort",
}
