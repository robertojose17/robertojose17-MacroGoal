
import { StyleSheet } from 'react-native';

export const colors = {
  // REFINED CLEAN & CALM PALETTE
  // Ultra-light, clean background for maximum clarity
  primaryBackground: '#FAFBFC',      // Even lighter off-white for screens, cards, white spaces
  
  // Strong, readable text with excellent contrast
  primaryText: '#1A1C2E',            // Very dark gray-blue for main text, titles, body text (improved contrast)
  
  // Success / Goal Met / Health
  success: '#4CAF6E',                // Fresh, vibrant green for success states, goal met, positive status
  
  // Primary Progress / Accent / Data
  accent: '#4A90A4',                 // Calm, confident blue for primary action buttons, progress accents
  
  // Warning / Over Target / Attention
  warning: '#FF7043',                // Warm, energetic orange for warnings, over target highlights
  
  // OLD COLORS (kept for compatibility and specific use cases)
  primary: '#4A90A4',                // Using accent color as primary
  primaryDark: '#3A7A8C',            // Darker version of accent
  secondary: '#4CAF6E',              // Using success color as secondary
  
  // Backgrounds
  background: '#FAFBFC',             // Using primaryBackground
  backgroundDark: '#1A1C2E',         // Darker version for dark mode
  card: '#FFFFFF',                   // Pure white cards on light background for maximum clarity
  cardDark: '#252740',               // Dark mode cards
  
  // Text
  text: '#1A1C2E',                   // Using primaryText
  textDark: '#F1F5F9',               // Light text for dark mode
  textSecondary: '#6B7280',          // Muted text (slightly darker for better readability)
  textSecondaryDark: '#A0A2B8',      // Muted text for dark mode
  
  // Status colors (keeping error, updating success and warning)
  error: '#EF4444',                  // Keep existing error color
  info: '#4A90A4',                   // Using accent color
  
  // UI elements
  border: '#E5E7EB',                 // Light border to match new background
  borderDark: '#3A3C52',             // Dark mode border
  disabled: '#CBD5E1',               // Keep existing disabled color
  
  // MACRO COLORS - DO NOT CHANGE THESE!
  // These colors are used for macro bars and must remain exactly as they are
  protein: '#EF4444',                // Red - DO NOT CHANGE
  carbs: '#3B82F6',                  // Blue - DO NOT CHANGE
  fats: '#F59E0B',                   // Orange/Amber - DO NOT CHANGE
  fiber: '#10B981',                  // Green - DO NOT CHANGE
  calories: '#8B5CF6',               // Purple - DO NOT CHANGE
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryBackground,
  },
  containerDark: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  cardDark: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
    elevation: 2,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.primaryText,
  },
  inputDark: {
    backgroundColor: colors.cardDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.textDark,
  },
});
