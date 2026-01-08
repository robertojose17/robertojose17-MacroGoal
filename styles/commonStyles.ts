
import { StyleSheet } from 'react-native';

// Color system organized by theme
const lightColors = {
  // Backgrounds
  background: '#F7F8FC',
  card: '#F0F2F7',
  
  // Text
  text: '#2B2D42',
  textSecondary: '#6B7280',
  
  // Primary/Accent
  primary: '#5B9AA8',
  accent: '#5B9AA8',
  
  // Status
  success: '#5CB97B',
  warning: '#FF8A5B',
  error: '#EF4444',
  info: '#5B9AA8',
  
  // UI elements
  border: '#E5E7EB',
  cardBorder: '#D4D6DA',
  disabled: '#CBD5E1',
  
  // Macros
  protein: '#EF4444',
  carbs: '#3B82F6',
  fats: '#F59E0B',
  fiber: '#10B981',
  calories: '#8B5CF6',
};

const darkColors = {
  // Backgrounds
  background: '#1A1C2E',
  card: '#252740',
  
  // Text
  text: '#F1F5F9',
  textSecondary: '#A0A2B8',
  
  // Primary/Accent
  primary: '#4A8A98',
  accent: '#4A8A98',
  
  // Status
  success: '#5CB97B',
  warning: '#FF8A5B',
  error: '#EF4444',
  info: '#5B9AA8',
  
  // UI elements
  border: '#3A3C52',
  cardBorder: '#3A3C52',
  disabled: '#CBD5E1',
  
  // Macros
  protein: '#EF4444',
  carbs: '#3B82F6',
  fats: '#F59E0B',
  fiber: '#10B981',
  calories: '#8B5CF6',
};

// Export colors with theme support
export const colors = {
  light: lightColors,
  dark: darkColors,
  // Legacy flat structure for backward compatibility
  ...lightColors,
  primaryBackground: '#F7F8FC',
  cardDark: '#252740',
  primaryText: '#2B2D42',
  textDark: '#F1F5F9',
  textSecondaryDark: '#A0A2B8',
  primaryDark: '#4A8A98',
  secondary: '#5CB97B',
  backgroundDark: '#1A1C2E',
  borderDark: '#3A3C52',
  cardBorderDark: '#3A3C52',
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
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightColors.background,
  },
  containerDark: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  card: {
    backgroundColor: lightColors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: lightColors.cardBorder,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  cardDark: {
    backgroundColor: darkColors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: darkColors.cardBorder,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
    elevation: 2,
  },
  button: {
    backgroundColor: lightColors.accent,
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
    backgroundColor: lightColors.card,
    borderWidth: 1,
    borderColor: lightColors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: lightColors.text,
  },
  inputDark: {
    backgroundColor: darkColors.card,
    borderWidth: 1,
    borderColor: darkColors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: darkColors.text,
  },
});
