import { ButtonConfig, StreamDeckDeviceInfo } from "../streamDeckService";

// Messages from Webview to Extension
export type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "getDevices" }
  | { type: "getConfiguration" }
  | { type: "saveButton"; keyIndex: number; config: ButtonConfig }
  | { type: "removeButton"; keyIndex: number }
  | { type: "copyButton"; fromIndex: number; toIndex: number }
  | { type: "clearAllButtons" }
  | { type: "requestCommands"; searchTerm: string }
  | { type: "requestLanguages" }
  | { type: "pickIcon" }
  | { type: "pickFolder" }
  | { type: "setBrightness"; value: number }
  | { type: "reconnect" };

// Messages from Extension to Webview
export type ExtensionToWebviewMessage =
  | { type: "devices"; devices: StreamDeckDeviceInfo[] }
  | { type: "configuration"; buttons: { [key: string]: ButtonConfig }; brightness: number }
  | { type: "commands"; commands: CommandInfo[] }
  | { type: "languages"; languages: LanguageInfo[] }
  | { type: "iconPicked"; path: string }
  | { type: "folderPicked"; path: string }
  | { type: "configurationUpdated"; buttons: { [key: string]: ButtonConfig }; brightness: number }
  | { type: "brightnessUpdated"; value: number }
  | { type: "connectionStatus"; connected: boolean; deviceCount: number }
  | { type: "error"; message: string };

export interface CommandInfo {
  id: string;
  title: string;
  category?: string;
}

export interface LanguageInfo {
  id: string;
  name: string;
}
