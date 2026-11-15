/**
 * Artha Mobile Design System Theme & Colors
 * 
 * Supports instant switching between:
 * 1. 'sunsetNavy': The new warm Sunset Tangerine & Royal Navy palette (#031D44, #084887, #F58A07, #F9AB55, #F7F5FB)
 * 2. 'arcticAurora': The original cool Arctic & Electric Cyan palette (#011D28, #053F56, #21A5EC, #90D2F5, #F2F3F7)
 * 
 * TO REVERT BACK TO THE ORIGINAL PALETTE:
 * Simply change ACTIVE_THEME to 'arcticAurora' below.
 */

export type ThemePaletteName = 'sunsetNavy' | 'arcticAurora';

// -------------------------------------------------------------
// 1. ORIGINAL ARCTIC & AURORA PALETTE (Preserved 100% intact)
// -------------------------------------------------------------
export const arcticAuroraColors = {
  // Primary Aurora & Arctic Swatches
  blueAurora: '#21A5EC',        // Vibrant Electric Aurora Blue
  blueGlacial: '#90D2F5',       // Soft Glacial Ice Blue
  greenFjord: '#053F56',        // Deep Northern Fjord Teal / Pine
  midnight: '#011D28',          // Deep Arctic Night / Midnight
  midnightCard: '#022838',      // Elevated Midnight Surface
  midnightSubtle: '#04354A',    // Midnight Hover / Active Surface
  white: '#FFFFFF',             // Crisp Snow White
  grayBg: '#F2F3F7',            // Clean Soft Ice Gray
  grayLight: '#E8ECF2',         // Subtle Border / Divider Gray
  grayMuted: '#94A3B8',         // Muted Slate Text

  // Backgrounds
  background: '#F2F3F7',
  backgroundSecondary: '#E8EDF4',
  surfacePaleBlue: '#E2F3FC',
  backgroundSubtle: '#FFFFFF',

  // Deep Midnight & Fjord surfaces (cards, headers, bars)
  navyDeep: '#011D28',
  navyPrimary: '#053F56',
  navySecondary: '#064B66',
  navyCard: '#011D28',
  navyCardDark: '#01151E',

  // Vibrant / Accent blues
  bluePrimary: '#21A5EC',
  blueBright: '#38BDF8',
  blueLight: '#90D2F5',
  bluePale: '#E0F2FE',
  blueSoftCard: '#BAE6FD',
  blueBadge: 'rgba(33, 165, 236, 0.12)',

  // Dual tone & Hero Card
  cardTopNavy: '#011D28',
  cardBottomBlue: '#053F56',
  cardBottomBlueLight: '#21A5EC',

  // Gradients
  heroGradientStart: '#053F56',
  heroGradientEnd: '#011D28',

  // Typography
  textPrimary: '#011D28',
  textSecondary: '#053F56',
  textMuted: '#64748B',
  textLight: '#FFFFFF',
  textLightMuted: '#90D2F5',
  textLightSubtle: 'rgba(144, 210, 245, 0.78)',

  // Functional / Status
  positive: '#10B981',
  positiveBg: 'rgba(16, 185, 129, 0.14)',
  negative: '#EF4444',
  negativeBg: 'rgba(239, 68, 68, 0.14)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.14)',

  // Auth & Input Surfaces
  inputSurface: '#FFFFFF',
  inputSurfaceFocused: '#F8FBFE',
  inputBorder: 'rgba(33, 165, 236, 0.35)',
  inputBorderFocused: '#21A5EC',
  inputBorderError: '#EF4444',

  // Glass & Frosted Surfaces
  borderLight: 'rgba(255, 255, 255, 0.85)',
  borderNavy: 'rgba(5, 63, 86, 0.14)',
  borderBlue: 'rgba(33, 165, 236, 0.35)',
  borderSpecular: 'rgba(255, 255, 255, 0.95)',
  liquidGlassCard: '#FFFFFF',
  liquidGlassCardSubtle: '#F8FAFC',
  liquidGlassPill: 'rgba(144, 210, 245, 0.22)',
  liquidGlassNavy: '#011D28',
  liquidGlassGlow: 'rgba(33, 165, 236, 0.35)',
  glassDark: 'rgba(1, 29, 40, 0.88)',
  glassNavy: 'rgba(5, 63, 86, 0.88)',
  overlay: 'rgba(1, 29, 40, 0.72)',

  // Semantic Role Tokens
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfacePressed: 'rgba(0, 0, 0, 0.04)',
  border: '#E2E8F0',
  borderHairline: '#E8ECF2',
  borderFocus: '#21A5EC',
  accent: '#21A5EC',
  accentSecondary: '#90D2F5',
  onAccent: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  heroBackground: '#053F56',
  heroBorder: 'transparent',
  modalBackdrop: 'rgba(1, 29, 40, 0.72)',
};

// -------------------------------------------------------------
// 2. NEW SUNSET TANGERINE & ROYAL NAVY PALETTE
// Swatches: #031D44, #084887, #F58A07, #F9AB55, #F7F5FB
// -------------------------------------------------------------
export const sunsetNavyColors: typeof arcticAuroraColors = {
  // Primary Palette Swatches
  blueAurora: '#F58A07',        // Vibrant Tangerine Accent (active buttons / CTA)
  blueGlacial: '#F9AB55',       // Soft Golden Peach (warm secondary accent / chips)
  greenFjord: '#084887',        // Deep Royal Blue (brand secondary / structural headers)
  midnight: '#031D44',          // Deep Midnight Navy (primary dark surface)
  midnightCard: '#05295D',      // Elevated Midnight Surface
  midnightSubtle: '#093673',    // Midnight Hover / Active Surface
  white: '#FFFFFF',             // Crisp Snow White
  grayBg: '#F7F5FB',            // Soft Magnolia White canvas background
  grayLight: '#EAE7F2',         // Subtle Border / Divider Gray with soft cool tint
  grayMuted: '#8E94A5',         // Muted Slate Text

  // Backgrounds
  background: '#F7F5FB',        // Main canvas background
  backgroundSecondary: '#EFEBF6',
  surfacePaleBlue: '#FFF3E5',   // Soft warm peach tint for highlighted containers
  backgroundSubtle: '#FFFFFF',

  // Deep Midnight & Royal surfaces (cards, headers, bars)
  navyDeep: '#031D44',
  navyPrimary: '#084887',
  navySecondary: '#0B5AA8',
  navyCard: '#031D44',
  navyCardDark: '#02132D',

  // Vibrant / Accent warm orange & gold tones (replacing the electric cyan)
  bluePrimary: '#F58A07',       // Vibrant Tangerine CTA / active tab / highlights
  blueBright: '#FF9B26',        // Bright Tangerine Glow
  blueLight: '#F9AB55',         // Soft Golden Peach
  bluePale: '#FFF2E2',          // Very soft peach wash
  blueSoftCard: '#FDE4C3',
  blueBadge: 'rgba(245, 138, 7, 0.12)',

  // Dual tone & Hero Card
  cardTopNavy: '#031D44',
  cardBottomBlue: '#084887',
  cardBottomBlueLight: '#F58A07',

  // Gradients
  heroGradientStart: '#084887', // Rich Royal Blue at top
  heroGradientEnd: '#031D44',   // Deep Midnight Navy at bottom

  // Typography
  textPrimary: '#031D44',       // High contrast deep navy text
  textSecondary: '#084887',     // Royal blue secondary headings / labels
  textMuted: '#687387',         // Muted slate text
  textLight: '#FFFFFF',
  textLightMuted: '#F9AB55',    // Warm peach text on dark cards
  textLightSubtle: 'rgba(249, 171, 85, 0.85)',

  // Functional / Status
  positive: '#10B981',
  positiveBg: 'rgba(16, 185, 129, 0.14)',
  negative: '#EF4444',
  negativeBg: 'rgba(239, 68, 68, 0.14)',
  warning: '#F58A07',           // Aligned with the palette's vibrant orange
  warningBg: 'rgba(245, 138, 7, 0.14)',

  // Auth & Input Surfaces
  inputSurface: '#FFFFFF',
  inputSurfaceFocused: '#FFFDF9',
  inputBorder: 'rgba(245, 138, 7, 0.35)',
  inputBorderFocused: '#F58A07',
  inputBorderError: '#EF4444',

  // Glass & Frosted Surfaces
  borderLight: 'rgba(255, 255, 255, 0.85)',
  borderNavy: 'rgba(8, 72, 135, 0.14)',
  borderBlue: 'rgba(245, 138, 7, 0.35)',
  borderSpecular: 'rgba(255, 255, 255, 0.95)',
  liquidGlassCard: '#FFFFFF',
  liquidGlassCardSubtle: '#FCFAFE',
  liquidGlassPill: 'rgba(249, 171, 85, 0.22)',
  liquidGlassNavy: '#031D44',
  liquidGlassGlow: 'rgba(245, 138, 7, 0.35)',
  glassDark: 'rgba(3, 29, 68, 0.88)',
  glassNavy: 'rgba(8, 72, 135, 0.88)',
  overlay: 'rgba(3, 29, 68, 0.72)',

  // Semantic Role Tokens
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfacePressed: 'rgba(0, 0, 0, 0.04)',
  border: '#E2E8F0',
  borderHairline: '#EAE7F2',
  borderFocus: '#F58A07',
  accent: '#F58A07',
  accentSecondary: '#F9AB55',
  onAccent: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  heroBackground: '#084887',
  heroBorder: 'transparent',
  modalBackdrop: 'rgba(3, 29, 68, 0.72)',
};

// -------------------------------------------------------------
// 3. TRUE OLED PITCH-BLACK PALETTE
// -------------------------------------------------------------
export const oledDarkColors: typeof sunsetNavyColors = {
  // Primary Palette Swatches
  blueAurora: '#F58A07',        // Vibrant Tangerine Accent
  blueGlacial: '#F9AB55',       // Soft Golden Peach
  greenFjord: '#F9AB55',        // Warm Amber/Peach secondary (no blue)
  midnight: '#000000',          // True Pitch Black canvas
  midnightCard: '#000000',      // True Pitch Black surface
  midnightSubtle: '#000000',    // True Pitch Black surface
  white: '#FFFFFF',             // Crisp White
  grayBg: '#000000',            // True Pitch Black Canvas
  grayLight: 'rgba(255, 255, 255, 0.14)', // Subtle border
  grayMuted: 'rgba(255, 255, 255, 0.64)', // Secondary text

  // Backgrounds
  background: '#000000',        // True Pitch Black
  backgroundSecondary: '#000000',
  surfacePaleBlue: '#000000',   // Pure Black container with border
  backgroundSubtle: '#000000',

  // Deep Obsidian & Dark surfaces
  navyDeep: '#000000',
  navyPrimary: '#F9AB55',       // Warm amber (no blue cast)
  navySecondary: '#F58A07',
  navyCard: '#000000',          // Pure Black Card with 1px border
  navyCardDark: '#000000',      // Pure Black Inset

  // Vibrant Accents
  bluePrimary: '#F58A07',       // Vibrant Tangerine CTA
  blueBright: '#FF9B26',
  blueLight: '#F9AB55',
  bluePale: '#1A1005',
  blueSoftCard: '#000000',
  blueBadge: 'rgba(245, 138, 7, 0.18)',

  // Dual tone & Hero Card
  cardTopNavy: '#000000',
  cardBottomBlue: '#000000',
  cardBottomBlueLight: '#F58A07',

  // Gradients
  heroGradientStart: '#000000',
  heroGradientEnd: '#000000',

  // Typography (Pure white opacities - no blue or gray tint)
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.64)',
  textMuted: 'rgba(255, 255, 255, 0.42)',
  textLight: '#FFFFFF',
  textLightMuted: 'rgba(255, 255, 255, 0.64)',
  textLightSubtle: 'rgba(255, 255, 255, 0.42)',

  // Functional / Status
  positive: '#22C55E',
  positiveBg: 'rgba(34, 197, 94, 0.16)',
  negative: '#EF4444',
  negativeBg: 'rgba(239, 68, 68, 0.16)',
  warning: '#F58A07',
  warningBg: 'rgba(245, 138, 7, 0.16)',

  // Auth & Input Surfaces (Pure black with 1px border)
  inputSurface: '#000000',
  inputSurfaceFocused: '#000000',
  inputBorder: 'rgba(255, 255, 255, 0.14)',
  inputBorderFocused: '#F58A07',
  inputBorderError: '#EF4444',

  // Glass & Frosted Surfaces
  borderLight: 'rgba(255, 255, 255, 0.14)',
  borderNavy: 'rgba(255, 255, 255, 0.14)',
  borderBlue: 'rgba(245, 138, 7, 0.4)',
  borderSpecular: 'rgba(255, 255, 255, 0.14)',
  liquidGlassCard: '#000000',
  liquidGlassCardSubtle: '#000000',
  liquidGlassPill: 'rgba(255, 255, 255, 0.08)',
  liquidGlassNavy: '#000000',
  liquidGlassGlow: 'rgba(245, 138, 7, 0.25)',
  glassDark: '#000000',
  glassNavy: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',

  // Semantic Role Tokens
  surface: '#000000',
  surfaceElevated: '#000000',
  surfacePressed: 'rgba(255, 255, 255, 0.08)',
  border: 'rgba(255, 255, 255, 0.14)',
  borderHairline: 'rgba(255, 255, 255, 0.14)',
  borderFocus: '#F58A07',
  accent: '#F58A07',
  accentSecondary: '#F9AB55',
  onAccent: '#000000',
  card: '#000000',
  cardBorder: 'rgba(255, 255, 255, 0.14)',
  heroBackground: '#000000',
  heroBorder: 'rgba(245, 138, 7, 0.5)',
  modalBackdrop: 'rgba(0, 0, 0, 0.6)',
};

// -------------------------------------------------------------
// 4. MASTER SWITCH: Toggle between 'sunsetNavy' and 'arcticAurora'
// -------------------------------------------------------------
export const ACTIVE_THEME: ThemePaletteName = 'sunsetNavy';

export const PALETTES: Record<ThemePaletteName, typeof arcticAuroraColors> = {
  sunsetNavy: sunsetNavyColors,
  arcticAurora: arcticAuroraColors,
};

/**
 * The active colors object used across the application.
 */
export const colors = PALETTES[ACTIVE_THEME];

export type ThemeColors = typeof sunsetNavyColors;
export type Palette = ThemeColors;
