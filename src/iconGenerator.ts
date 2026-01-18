/**
 * Icon Generator for Stream Deck buttons
 * Uses VS Code codicons when available, falls back to pixel patterns
 */

import { renderCodiconDirect, codiconExists } from "./codiconRenderer";

export interface IconStyle {
  bgColor: [number, number, number];      // RGB background
  bgGradient?: [number, number, number];  // RGB gradient end color
  fgColor: [number, number, number];      // RGB foreground (icon/text)
  accentColor?: [number, number, number]; // RGB accent
}

// Predefined color schemes for different action categories
export const IconStyles = {
  // Blue - File operations
  file: {
    bgColor: [30, 60, 114] as [number, number, number],
    bgGradient: [42, 82, 152] as [number, number, number],
    fgColor: [255, 255, 255] as [number, number, number],
  },
  // Green - Run/Execute
  run: {
    bgColor: [34, 139, 34] as [number, number, number],
    bgGradient: [50, 180, 50] as [number, number, number],
    fgColor: [255, 255, 255] as [number, number, number],
  },
  // Orange - Git operations
  git: {
    bgColor: [240, 80, 50] as [number, number, number],
    bgGradient: [255, 120, 70] as [number, number, number],
    fgColor: [255, 255, 255] as [number, number, number],
  },
  // Purple - Navigation
  nav: {
    bgColor: [102, 51, 153] as [number, number, number],
    bgGradient: [138, 79, 191] as [number, number, number],
    fgColor: [255, 255, 255] as [number, number, number],
  },
  // Cyan - Editor actions
  editor: {
    bgColor: [0, 139, 139] as [number, number, number],
    bgGradient: [32, 178, 170] as [number, number, number],
    fgColor: [255, 255, 255] as [number, number, number],
  },
  // Dark gray - UI toggles
  ui: {
    bgColor: [60, 60, 70] as [number, number, number],
    bgGradient: [80, 80, 95] as [number, number, number],
    fgColor: [255, 255, 255] as [number, number, number],
  },
  // Red - Stop/Danger
  stop: {
    bgColor: [180, 30, 30] as [number, number, number],
    bgGradient: [220, 50, 50] as [number, number, number],
    fgColor: [255, 255, 255] as [number, number, number],
  },
  // Yellow - Warning/Attention
  warning: {
    bgColor: [200, 150, 0] as [number, number, number],
    bgGradient: [240, 180, 20] as [number, number, number],
    fgColor: [40, 40, 40] as [number, number, number],
  },
  // Teal - Tools
  tool: {
    bgColor: [0, 128, 128] as [number, number, number],
    bgGradient: [32, 160, 160] as [number, number, number],
    fgColor: [255, 255, 255] as [number, number, number],
  },
};

// Simple icon shapes as pixel patterns (scaled during rendering)
export type IconShape = "save" | "search" | "play" | "terminal" | "git" | "comment" |
                        "sidebar" | "format" | "file" | "settings" | "branch" | "stop" |
                        "back" | "forward" | "split" | "close" | "code" | "debug" | "sync";

const iconPatterns: { [key in IconShape]: number[][] } = {
  save: [
    [1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1],
    [1,0,0,1,1,0,0,1],
    [1,0,0,1,1,0,0,1],
    [1,1,1,1,1,1,1,1],
  ],
  search: [
    [0,0,1,1,1,1,0,0],
    [0,1,0,0,0,0,1,0],
    [1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1],
    [0,1,0,0,0,0,1,0],
    [0,0,1,1,1,1,1,0],
    [0,0,0,0,0,0,1,1],
    [0,0,0,0,0,0,0,1],
  ],
  play: [
    [0,1,0,0,0,0,0,0],
    [0,1,1,0,0,0,0,0],
    [0,1,1,1,0,0,0,0],
    [0,1,1,1,1,0,0,0],
    [0,1,1,1,1,0,0,0],
    [0,1,1,1,0,0,0,0],
    [0,1,1,0,0,0,0,0],
    [0,1,0,0,0,0,0,0],
  ],
  terminal: [
    [1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,1],
    [1,0,1,0,0,0,0,1],
    [1,0,0,1,0,0,0,1],
    [1,0,1,0,0,0,0,1],
    [1,0,0,0,0,0,0,1],
    [1,0,0,1,1,1,0,1],
    [1,1,1,1,1,1,1,1],
  ],
  git: [
    [0,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,0],
    [0,1,1,1,1,1,1,0],
    [1,1,0,1,1,0,1,1],
    [0,0,0,1,1,0,0,0],
    [0,1,1,1,1,1,1,0],
    [1,1,0,1,1,0,1,1],
    [0,0,0,1,1,0,0,0],
  ],
  comment: [
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,0,0],
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,0,0],
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
  ],
  sidebar: [
    [1,1,1,1,1,1,1,1],
    [1,1,1,0,0,0,0,1],
    [1,1,1,0,0,0,0,1],
    [1,1,1,0,0,0,0,1],
    [1,1,1,0,0,0,0,1],
    [1,1,1,0,0,0,0,1],
    [1,1,1,0,0,0,0,1],
    [1,1,1,1,1,1,1,1],
  ],
  format: [
    [1,1,1,1,1,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0],
  ],
  file: [
    [0,1,1,1,1,1,0,0],
    [0,1,0,0,0,1,1,0],
    [0,1,0,0,0,0,1,0],
    [0,1,0,0,0,0,1,0],
    [0,1,0,0,0,0,1,0],
    [0,1,0,0,0,0,1,0],
    [0,1,0,0,0,0,1,0],
    [0,1,1,1,1,1,1,0],
  ],
  settings: [
    [0,0,1,1,1,1,0,0],
    [0,1,1,0,0,1,1,0],
    [1,1,0,0,0,0,1,1],
    [1,0,0,1,1,0,0,1],
    [1,0,0,1,1,0,0,1],
    [1,1,0,0,0,0,1,1],
    [0,1,1,0,0,1,1,0],
    [0,0,1,1,1,1,0,0],
  ],
  branch: [
    [0,0,1,1,0,0,0,0],
    [0,0,1,1,0,0,0,0],
    [0,0,1,1,0,0,0,0],
    [0,0,1,1,1,1,0,0],
    [0,0,0,0,1,1,0,0],
    [0,0,0,0,1,1,0,0],
    [0,0,0,0,1,1,0,0],
    [0,0,0,0,1,1,0,0],
  ],
  stop: [
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
  ],
  back: [
    [0,0,0,1,0,0,0,0],
    [0,0,1,1,0,0,0,0],
    [0,1,1,1,0,0,0,0],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [0,1,1,1,0,0,0,0],
    [0,0,1,1,0,0,0,0],
    [0,0,0,1,0,0,0,0],
  ],
  forward: [
    [0,0,0,0,1,0,0,0],
    [0,0,0,0,1,1,0,0],
    [0,0,0,0,1,1,1,0],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [0,0,0,0,1,1,1,0],
    [0,0,0,0,1,1,0,0],
    [0,0,0,0,1,0,0,0],
  ],
  split: [
    [1,1,1,0,1,1,1,1],
    [1,0,1,0,1,0,0,1],
    [1,0,1,0,1,0,0,1],
    [1,0,1,0,1,0,0,1],
    [1,0,1,0,1,0,0,1],
    [1,0,1,0,1,0,0,1],
    [1,0,1,0,1,0,0,1],
    [1,1,1,0,1,1,1,1],
  ],
  close: [
    [1,0,0,0,0,0,0,1],
    [1,1,0,0,0,0,1,1],
    [0,1,1,0,0,1,1,0],
    [0,0,1,1,1,1,0,0],
    [0,0,1,1,1,1,0,0],
    [0,1,1,0,0,1,1,0],
    [1,1,0,0,0,0,1,1],
    [1,0,0,0,0,0,0,1],
  ],
  code: [
    [0,0,1,0,0,1,0,0],
    [0,1,0,0,0,0,1,0],
    [1,0,0,0,0,0,0,1],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,0,1],
    [0,1,0,0,0,0,1,0],
    [0,0,1,0,0,1,0,0],
  ],
  debug: [
    [0,0,1,1,1,1,0,0],
    [0,1,0,0,0,0,1,0],
    [1,0,1,0,0,1,0,1],
    [1,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,1],
    [0,1,0,0,0,0,1,0],
    [0,0,1,1,1,1,0,0],
  ],
  sync: [
    [0,0,0,1,1,0,0,0],
    [0,0,1,0,0,0,0,0],
    [0,1,1,1,1,1,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,1,1,1,1,1,0],
    [0,0,0,0,0,1,0,0],
    [0,0,0,1,1,0,0,0],
  ],
};

/**
 * Generate an RGBA buffer for a Stream Deck button with an icon
 * Tries VS Code codicons first, falls back to pixel patterns
 */
export function generateButtonIcon(
  width: number,
  height: number,
  label: string,
  style: IconStyle,
  shape?: IconShape
): Uint8Array {
  // Try to render using VS Code codicons first
  if (shape) {
    try {
      const codiconBuffer = renderCodiconDirect(shape, width, height, style, label);
      if (codiconBuffer && codiconBuffer.length === width * height * 4) {
        return codiconBuffer;
      }
    } catch (err) {
      // Fall through to pixel pattern rendering
    }
  }

  // Fallback: Generate using pixel patterns
  const buffer = new Uint8Array(width * height * 4);

  // Draw gradient background
  for (let y = 0; y < height; y++) {
    const gradientT = y / height;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      // Calculate gradient color
      const endColor = style.bgGradient || style.bgColor;
      buffer[i] = Math.round(style.bgColor[0] + (endColor[0] - style.bgColor[0]) * gradientT);
      buffer[i + 1] = Math.round(style.bgColor[1] + (endColor[1] - style.bgColor[1]) * gradientT);
      buffer[i + 2] = Math.round(style.bgColor[2] + (endColor[2] - style.bgColor[2]) * gradientT);
      buffer[i + 3] = 255;
    }
  }

  // Draw icon shape if provided
  if (shape && iconPatterns[shape]) {
    const pattern = iconPatterns[shape];
    const patternSize = pattern.length;
    const scale = Math.floor(Math.min(width, height) / (patternSize + 4)); // Leave margin
    const offsetX = Math.floor((width - patternSize * scale) / 2);
    const offsetY = Math.floor((height - patternSize * scale) / 2) - Math.floor(height * 0.1); // Shift up for label

    for (let py = 0; py < patternSize; py++) {
      for (let px = 0; px < patternSize; px++) {
        if (pattern[py][px] === 1) {
          // Draw scaled pixel
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const x = offsetX + px * scale + sx;
              const y = offsetY + py * scale + sy;
              if (x >= 0 && x < width && y >= 0 && y < height) {
                const i = (y * width + x) * 4;
                buffer[i] = style.fgColor[0];
                buffer[i + 1] = style.fgColor[1];
                buffer[i + 2] = style.fgColor[2];
                buffer[i + 3] = 255;
              }
            }
          }
        }
      }
    }
  }

  // Draw label text at bottom (simple pixel font)
  if (label) {
    drawLabel(buffer, width, height, label, style.fgColor);
  }

  return buffer;
}

/**
 * Simple pixel font for labels (5x7 characters)
 */
const pixelFont: { [char: string]: number[] } = {
  'A': [0x7C, 0x12, 0x11, 0x12, 0x7C],
  'B': [0x7F, 0x49, 0x49, 0x49, 0x36],
  'C': [0x3E, 0x41, 0x41, 0x41, 0x22],
  'D': [0x7F, 0x41, 0x41, 0x41, 0x3E],
  'E': [0x7F, 0x49, 0x49, 0x49, 0x41],
  'F': [0x7F, 0x09, 0x09, 0x09, 0x01],
  'G': [0x3E, 0x41, 0x49, 0x49, 0x7A],
  'H': [0x7F, 0x08, 0x08, 0x08, 0x7F],
  'I': [0x00, 0x41, 0x7F, 0x41, 0x00],
  'J': [0x20, 0x40, 0x41, 0x3F, 0x01],
  'K': [0x7F, 0x08, 0x14, 0x22, 0x41],
  'L': [0x7F, 0x40, 0x40, 0x40, 0x40],
  'M': [0x7F, 0x02, 0x0C, 0x02, 0x7F],
  'N': [0x7F, 0x04, 0x08, 0x10, 0x7F],
  'O': [0x3E, 0x41, 0x41, 0x41, 0x3E],
  'P': [0x7F, 0x09, 0x09, 0x09, 0x06],
  'Q': [0x3E, 0x41, 0x51, 0x21, 0x5E],
  'R': [0x7F, 0x09, 0x19, 0x29, 0x46],
  'S': [0x46, 0x49, 0x49, 0x49, 0x31],
  'T': [0x01, 0x01, 0x7F, 0x01, 0x01],
  'U': [0x3F, 0x40, 0x40, 0x40, 0x3F],
  'V': [0x1F, 0x20, 0x40, 0x20, 0x1F],
  'W': [0x7F, 0x20, 0x18, 0x20, 0x7F],
  'X': [0x63, 0x14, 0x08, 0x14, 0x63],
  'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
  'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
  '0': [0x3E, 0x51, 0x49, 0x45, 0x3E],
  '1': [0x00, 0x42, 0x7F, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4B, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7F, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3C, 0x4A, 0x49, 0x49, 0x30],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1E],
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  '/': [0x20, 0x10, 0x08, 0x04, 0x02],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  ':': [0x00, 0x36, 0x36, 0x00, 0x00],
};

function drawLabel(
  buffer: Uint8Array,
  width: number,
  height: number,
  label: string,
  color: [number, number, number]
): void {
  const charWidth = 5;
  const charHeight = 7;
  const charSpacing = 1;
  const scale = width >= 96 ? 2 : 1;

  const text = label.toUpperCase().slice(0, 10); // Max 10 chars
  const textWidth = text.length * (charWidth + charSpacing) * scale;
  const startX = Math.floor((width - textWidth) / 2);
  const startY = height - (charHeight * scale) - 4; // 4px from bottom

  for (let c = 0; c < text.length; c++) {
    const char = text[c];
    const charData = pixelFont[char];
    if (!charData) continue;

    const charX = startX + c * (charWidth + charSpacing) * scale;

    for (let col = 0; col < charWidth; col++) {
      const colData = charData[col];
      for (let row = 0; row < charHeight; row++) {
        if (colData & (1 << row)) {
          // Draw scaled pixel
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const x = charX + col * scale + sx;
              const y = startY + row * scale + sy;
              if (x >= 0 && x < width && y >= 0 && y < height) {
                const i = (y * width + x) * 4;
                buffer[i] = color[0];
                buffer[i + 1] = color[1];
                buffer[i + 2] = color[2];
                buffer[i + 3] = 255;
              }
            }
          }
        }
      }
    }
  }
}
