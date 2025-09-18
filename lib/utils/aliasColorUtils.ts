/**
 * Utility functions for generating consistent colors for user aliases
 */

// Bright pastel color palette for aliases - optimized for better distinction
const ALIAS_COLORS = [
  '#FFB3C6', // Soft pink
  '#FFD700', // Light gold
  '#98FB98', // Pale green
  '#87CEEB', // Sky blue
  '#DDA0DD', // Plum
  '#F0E68C', // Khaki
  '#FFB347', // Peach
  '#B19CD9', // Light purple
  '#FFE4E1', // Misty rose
  '#AFEEEE', // Pale turquoise
  '#F5DEB3', // Wheat
  '#D8BFD8', // Thistle
  '#FFA07A', // Light salmon
  '#E0FFFF', // Light cyan
  '#FFEFD5', // Papaya whip
  '#C1FFC1', // Pale green
] as const;

/**
 * Generates a consistent color for an alias based on its characters
 * @param alias - The user alias to generate a color for
 * @returns A hex color string
 */
export function getAliasColor(alias: string): string {
  if (!alias || alias.length === 0) {
    return ALIAS_COLORS[0]; // Default to first color
  }

  // Create a simple hash from the alias string
  let hash = 0;
  for (let i = 0; i < alias.length; i++) {
    const char = alias.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use absolute value to ensure positive index
  const colorIndex = Math.abs(hash) % ALIAS_COLORS.length;
  return ALIAS_COLORS[colorIndex];
}

/**
 * Generates a darker variant of the alias color for text/borders
 * @param baseColor - The base alias color (hex string)
 * @returns A darker hex color string
 */
export function getAliasColorDark(baseColor: string): string {
  // Remove the # if present
  const hex = baseColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Darken by reducing each component by 40%
  const darkenFactor = 0.6;
  const newR = Math.round(r * darkenFactor);
  const newG = Math.round(g * darkenFactor);
  const newB = Math.round(b * darkenFactor);
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Gets CSS variables for alias styling
 * @param alias - The user alias
 * @returns An object with CSS custom properties for styling
 */
export function getAliasCSSVars(alias: string) {
  const baseColor = getAliasColor(alias);
  const darkColor = getAliasColorDark(baseColor);
  
  return {
    '--alias-bg-color': baseColor,
    '--alias-border-color': darkColor,
    '--alias-text-color': darkColor,
  } as React.CSSProperties;
}

/**
 * Creates a mapping of unique aliases to their colors
 * @param aliases - Array of alias strings
 * @returns A Map of alias to color
 */
export function createAliasColorMap(aliases: string[]): Map<string, string> {
  const colorMap = new Map<string, string>();
  
  // Get unique aliases
  const uniqueAliases = [...new Set(aliases.filter(Boolean))];
  
  // Assign colors to each unique alias
  uniqueAliases.forEach(alias => {
    colorMap.set(alias, getAliasColor(alias));
  });
  
  return colorMap;
}

export default {
  getAliasColor,
  getAliasColorDark,
  getAliasCSSVars,
  createAliasColorMap,
};
