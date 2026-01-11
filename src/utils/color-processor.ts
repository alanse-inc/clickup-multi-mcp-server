/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * Color Processor Utility
 * 
 * Processes natural language color commands and converts them to HEX color values.
 * Also generates appropriate foreground (text) colors for optimal contrast.
 */

// Basic color mapping with common color names to their HEX values
const COLOR_MAP: Record<string, string> = {
  // Primary colors
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  
  // Secondary colors
  yellow: '#FFFF00',
  purple: '#800080',
  orange: '#FFA500',
  pink: '#FFC0CB',
  brown: '#A52A2A',
  
  // Neutrals
  black: '#000000',
  white: '#FFFFFF',
  gray: '#808080',
  grey: '#808080',
  
  // Extended colors
  navy: '#000080',
  teal: '#008080',
  olive: '#808000',
  maroon: '#800000',
  aqua: '#00FFFF',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  fuchsia: '#FF00FF',
  lime: '#00FF00',
  indigo: '#4B0082',
  violet: '#EE82EE',
  gold: '#FFD700',
  silver: '#C0C0C0',
  beige: '#F5F5DC',
  tan: '#D2B48C',
  coral: '#FF7F50',
  crimson: '#DC143C',
  khaki: '#F0E68C',
  lavender: '#E6E6FA',
  plum: '#DDA0DD',
  salmon: '#FA8072',
  turquoise: '#40E0D0',
};

// Extended color variations
const COLOR_VARIATIONS: Record<string, Record<string, string>> = {
  red: {
    light: '#FF6666',
    dark: '#8B0000',
    bright: '#FF0000',
    deep: '#8B0000',
  },
  blue: {
    light: '#ADD8E6',
    dark: '#00008B',
    sky: '#87CEEB',
    navy: '#000080',
    royal: '#4169E1',
    deep: '#00008B',
  },
  green: {
    light: '#90EE90',
    dark: '#006400',
    forest: '#228B22',
    lime: '#32CD32',
    mint: '#98FB98',
    olive: '#808000',
  },
  yellow: {
    light: '#FFFFE0',
    dark: '#BDB76B',
    pale: '#FFF9C4',
    gold: '#FFD700',
    lemon: '#FFFACD',
  },
  // Add more variations for other colors as needed
};

/**
 * Extracts a color name from natural language text
 * @param text - Natural language text that contains a color reference
 * @returns The extracted color name or null if no color is found
 */
function extractColorFromText(text: string): string | null {
  if (!text) return null;
  
  // Convert to lowercase for case-insensitive matching
  const lowercaseText = text.toLowerCase();
  
  // First check for color variations (e.g., "dark blue", "light green")
  for (const [baseColor, variations] of Object.entries(COLOR_VARIATIONS)) {
    for (const [variation, _] of Object.entries(variations)) {
      const colorPhrase = `${variation} ${baseColor}`;
      if (lowercaseText.includes(colorPhrase)) {
        return colorPhrase;
      }
    }
  }
  
  // Then check for base colors
  for (const color of Object.keys(COLOR_MAP)) {
    // Use word boundary to make sure we're matching whole words
    const regex = new RegExp(`\\b${color}\\b`, 'i');
    if (regex.test(lowercaseText)) {
      return color;
    }
  }
  
  return null;
}

/**
 * Converts a color name to its HEX value
 * @param colorName - Name of the color to convert (e.g., "blue", "dark red")
 * @returns HEX color code or null if color name is not recognized
 */
function colorNameToHex(colorName: string): string | null {
  if (!colorName) return null;
  
  const lowercaseColor = colorName.toLowerCase();
  
  // Check if it's a color variation (e.g., "dark blue")
  const parts = lowercaseColor.split(' ');
  if (parts.length === 2) {
    const variation = parts[0];
    const baseColor = parts[1];
    
    if (COLOR_VARIATIONS[baseColor] && COLOR_VARIATIONS[baseColor][variation]) {
      return COLOR_VARIATIONS[baseColor][variation];
    }
  }
  
  // Check if it's a base color
  return COLOR_MAP[lowercaseColor] || null;
}

/**
 * Calculates the relative luminance of a color for WCAG contrast calculations
 * @param hex - HEX color code
 * @returns Relative luminance value
 */
function calculateLuminance(hex: string): number {
  // Remove # if present
  const color = hex.startsWith('#') ? hex.slice(1) : hex;
  
  // Convert HEX to RGB
  const r = parseInt(color.substr(0, 2), 16) / 255;
  const g = parseInt(color.substr(2, 2), 16) / 255;
  const b = parseInt(color.substr(4, 2), 16) / 255;
  
  // Calculate luminance using the formula from WCAG 2.0
  const R = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const G = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const B = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Generates a contrasting foreground color for optimal readability
 * @param backgroundColor - HEX code of the background color
 * @returns HEX code of the foreground color (either black or white)
 */
function generateContrastingForeground(backgroundColor: string): string {
  const luminance = calculateLuminance(backgroundColor);
  
  // Use white text on dark backgrounds and black text on light backgrounds
  // The threshold 0.5 is based on WCAG guidelines for contrast
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Processes a natural language command to extract a color and convert it to HEX values
 * @param command - Natural language command (e.g., "Create a blue tag")
 * @returns Object containing background and foreground HEX colors, or null if color not recognized
 */
export function processColorCommand(command: string): { background: string; foreground: string } | null {
  // Extract color name from command
  const colorName = extractColorFromText(command);
  if (!colorName) return null;
  
  // Convert color name to HEX background color
  const backgroundColor = colorNameToHex(colorName);
  if (!backgroundColor) return null;
  
  // Generate appropriate foreground color
  const foregroundColor = generateContrastingForeground(backgroundColor);
  
  return {
    background: backgroundColor,
    foreground: foregroundColor
  };
} 