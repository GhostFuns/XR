// World HUD Theme - Optimized for XR Display
export const COLORS = {
  // Primary palette - Cyber/XR optimized
  primary: '#00F0FF',
  primaryGlow: 'rgba(0, 240, 255, 0.3)',
  secondary: '#FF00E5',
  secondaryGlow: 'rgba(255, 0, 229, 0.3)',
  accent: '#00FF88',
  accentGlow: 'rgba(0, 255, 136, 0.3)',
  warning: '#FFB800',
  warningGlow: 'rgba(255, 184, 0, 0.3)',
  danger: '#FF3B5C',
  dangerGlow: 'rgba(255, 59, 92, 0.3)',
  
  // Background layers
  background: '#000000',
  backgroundSecondary: '#0A0A0F',
  backgroundTertiary: '#12121A',
  surface: 'rgba(18, 18, 26, 0.85)',
  surfaceGlass: 'rgba(18, 18, 26, 0.6)',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  textMuted: 'rgba(255, 255, 255, 0.3)',
  
  // Border colors
  border: 'rgba(0, 240, 255, 0.2)',
  borderActive: 'rgba(0, 240, 255, 0.5)',
  
  // Language colors
  langEnglish: '#00F0FF',
  langSpanish: '#FF6B35',
  langJapanese: '#FF00E5',
  langGerman: '#FFB800',
  langRussian: '#00FF88',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONTS = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 28,
    hero: 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const SHADOWS = {
  glow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const LANGUAGE_CONFIG = {
  en: { name: 'English', flag: '🇺🇸', color: COLORS.langEnglish, code: 'en-US' },
  es: { name: 'Spanish', flag: '🇲🇽', color: COLORS.langSpanish, code: 'es-MX' },
  ja: { name: 'Japanese', flag: '🇯🇵', color: COLORS.langJapanese, code: 'ja-JP' },
  de: { name: 'German', flag: '🇩🇪', color: COLORS.langGerman, code: 'de-DE' },
  ru: { name: 'Russian', flag: '🇷🇺', color: COLORS.langRussian, code: 'ru-RU' },
};

export type LanguageCode = keyof typeof LANGUAGE_CONFIG;
