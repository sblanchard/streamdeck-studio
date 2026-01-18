import { ButtonConfig } from "./streamDeckService";
import { IconStyles, IconShape } from "./iconGenerator";

/**
 * Extended button config with icon metadata
 */
export interface DefaultButtonConfig extends ButtonConfig {
  iconShape?: IconShape;
  iconStyle?: keyof typeof IconStyles;
}

/**
 * Default button configurations for Stream Deck devices.
 *
 * Layout for Stream Deck XL (4 rows x 8 columns = 32 keys):
 * Row 0 (0-7):   Core Actions   - Save, Open, Search, Format, Terminal, Run, Stop, Commands
 * Row 1 (8-15):  Git Operations - Commit, Push, Pull, Sync, Branch, Checkout, Stash, SCM
 * Row 2 (16-23): Editor         - Comment, Sidebar, Panel, Symbol, Go Def, Rename, Fix, Close
 * Row 3 (24-31): Nav/Tools      - Back, Forward, Split, Zen, Settings, History, Task, Config
 *
 * Stream Deck (3 rows x 5 columns = 15 keys): Uses keys 0-14
 * Stream Deck Mini (2 rows x 3 columns = 6 keys): Uses keys 0-5
 */

// ============================================================================
// ROW 0: Core Actions (0-7)
// ============================================================================
const row0: { [key: number]: DefaultButtonConfig } = {
  0: {
    command: "workbench.action.files.save",
    label: "Save",
    iconShape: "save",
    iconStyle: "file",
  },
  1: {
    command: "workbench.action.quickOpen",
    label: "Open",
    iconShape: "file",
    iconStyle: "file",
  },
  2: {
    command: "workbench.action.findInFiles",
    label: "Search",
    iconShape: "search",
    iconStyle: "nav",
  },
  3: {
    command: "editor.action.formatDocument",
    label: "Format",
    iconShape: "format",
    iconStyle: "editor",
  },
  4: {
    command: "workbench.action.terminal.toggleTerminal",
    label: "Terminal",
    iconShape: "terminal",
    iconStyle: "ui",
  },
  5: {
    command: "workbench.action.debug.start",
    label: "Run",
    iconShape: "play",
    iconStyle: "run",
  },
  6: {
    command: "workbench.action.debug.stop",
    label: "Stop",
    iconShape: "stop",
    iconStyle: "stop",
  },
  7: {
    command: "workbench.action.showCommands",
    label: "Commands",
    iconShape: "code",
    iconStyle: "tool",
  },
};

// ============================================================================
// ROW 1: Git Operations (8-15)
// ============================================================================
const row1: { [key: number]: DefaultButtonConfig } = {
  8: {
    command: "streamdeck.smartCommit",
    label: "Commit",
    iconShape: "git",
    iconStyle: "git",
  },
  9: {
    command: "git.push",
    label: "Push",
    iconShape: "forward",
    iconStyle: "git",
  },
  10: {
    command: "git.pull",
    label: "Pull",
    iconShape: "back",
    iconStyle: "git",
  },
  11: {
    command: "git.sync",
    label: "Sync",
    iconShape: "sync",
    iconStyle: "git",
  },
  12: {
    command: "git.branch",
    label: "Branch",
    iconShape: "branch",
    iconStyle: "git",
  },
  13: {
    command: "git.checkout",
    label: "Checkout",
    iconShape: "branch",
    iconStyle: "git",
  },
  14: {
    command: "git.stash",
    label: "Stash",
    iconShape: "save",
    iconStyle: "warning",
  },
  15: {
    command: "workbench.view.scm",
    label: "SCM",
    iconShape: "git",
    iconStyle: "git",
  },
};

// ============================================================================
// ROW 2: Editor Actions (16-23)
// ============================================================================
const row2: { [key: number]: DefaultButtonConfig } = {
  16: {
    command: "editor.action.commentLine",
    label: "Comment",
    iconShape: "comment",
    iconStyle: "editor",
  },
  17: {
    command: "workbench.action.toggleSidebarVisibility",
    label: "Sidebar",
    iconShape: "sidebar",
    iconStyle: "ui",
  },
  18: {
    command: "workbench.action.togglePanel",
    label: "Panel",
    iconShape: "terminal",
    iconStyle: "ui",
  },
  19: {
    command: "workbench.action.gotoSymbol",
    label: "Symbol",
    iconShape: "code",
    iconStyle: "nav",
  },
  20: {
    command: "editor.action.revealDefinition",
    label: "Go Def",
    iconShape: "search",
    iconStyle: "nav",
  },
  21: {
    command: "editor.action.rename",
    label: "Rename",
    iconShape: "code",
    iconStyle: "editor",
  },
  22: {
    command: "editor.action.quickFix",
    label: "Fix",
    iconShape: "debug",
    iconStyle: "warning",
  },
  23: {
    command: "workbench.action.closeActiveEditor",
    label: "Close",
    iconShape: "close",
    iconStyle: "stop",
  },
};

// ============================================================================
// ROW 3: Navigation & Tools (24-31)
// ============================================================================
const row3: { [key: number]: DefaultButtonConfig } = {
  24: {
    command: "workbench.action.navigateBack",
    label: "Back",
    iconShape: "back",
    iconStyle: "nav",
  },
  25: {
    command: "workbench.action.navigateForward",
    label: "Forward",
    iconShape: "forward",
    iconStyle: "nav",
  },
  26: {
    command: "workbench.action.splitEditor",
    label: "Split",
    iconShape: "split",
    iconStyle: "ui",
  },
  27: {
    command: "workbench.action.toggleZenMode",
    label: "Zen",
    iconShape: "code",
    iconStyle: "ui",
  },
  28: {
    command: "workbench.action.openSettings",
    label: "Settings",
    iconShape: "settings",
    iconStyle: "tool",
  },
  29: {
    command: "git.viewHistory",
    label: "History",
    iconShape: "file",
    iconStyle: "git",
  },
  30: {
    command: "workbench.action.tasks.runTask",
    label: "Task",
    iconShape: "play",
    iconStyle: "tool",
  },
  31: {
    command: "streamdeck.openConfiguration",
    label: "Config",
    iconShape: "settings",
    iconStyle: "file",
  },
};

/**
 * Get default button configuration based on the number of keys available.
 * @param keyCount Number of keys on the Stream Deck device
 * @returns Button configuration object
 */
export function getDefaultButtons(keyCount: number): { [key: number]: DefaultButtonConfig } {
  const buttons: { [key: number]: DefaultButtonConfig } = {};

  // Mini (6 keys): First 6 buttons of row 0
  if (keyCount >= 6) {
    for (let i = 0; i < Math.min(6, keyCount); i++) {
      if (row0[i]) buttons[i] = row0[i];
    }
  }

  // Standard (15 keys): Row 0 (8) + Row 1 first 7 (but remap for 3x5 layout)
  // For 15-key deck, use a sensible subset
  if (keyCount >= 15) {
    // Add rest of row 0
    for (let i = 6; i < 8; i++) {
      if (row0[i]) buttons[i] = row0[i];
    }
    // Add row 1 (Git)
    for (let i = 8; i < 16 && i < keyCount; i++) {
      if (row1[i]) buttons[i] = row1[i];
    }
  }

  // XL (32 keys): All rows
  if (keyCount >= 32) {
    // Add row 2 (Editor)
    for (let i = 16; i < 24; i++) {
      if (row2[i]) buttons[i] = row2[i];
    }
    // Add row 3 (Nav/Tools)
    for (let i = 24; i < 32; i++) {
      if (row3[i]) buttons[i] = row3[i];
    }
  }

  return buttons;
}

/**
 * Get the full set of all default buttons (for documentation/reference).
 */
export function getAllDefaultButtons(): { [key: number]: DefaultButtonConfig } {
  return {
    ...row0,
    ...row1,
    ...row2,
    ...row3,
  };
}

/**
 * Default brightness setting
 */
export const DEFAULT_BRIGHTNESS = 80;

/**
 * Export the IconStyles for use in rendering
 */
export { IconStyles } from "./iconGenerator";
