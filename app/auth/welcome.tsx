
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
export default function AuthWelcomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const LinearGradient: any = (() => { try { return require('expo-linear-gradient').LinearGradient; } catch { return require('react-native').View; } })();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top', 'bottom']}>
      <LinearGradient
        colors={isDark ? [colors.backgroundDark, colors.primaryDark] : [colors.background, colors.primary]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.appName}>
            MacroGoal
          </Text>

          <View style={styles.features}>
            <FeatureItem
              icon="✨"
              text="AI-powered meal estimates in seconds"
              isDark={isDark}
            />
            <FeatureItem
              icon="📝"
              text="Log your food and macros without overthinking"
              isDark={isDark}
            />
            <FeatureItem
              icon="🎯"
              text="Stay consistent with daily check-ins"
              isDark={isDark}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.buttonOutline, { borderColor: isDark ? colors.textDark : '#F8F9FA' }]}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={[styles.buttonTextOutline, { color: isDark ? colors.textDark : '#F8F9FA' }]}>
              Log In
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text, isDark }: { icon: string; text: string; isDark: boolean }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={[styles.featureText, { color: isDark ? colors.textDark : '#F8F9FA' }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 110,
    alignItems: 'center',
  },
  appName: {
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
    color: '#F8F9FA',
    marginBottom: spacing.xl,
    letterSpacing: -0.5,
  },
  features: {
    width: '100%',
    marginTop: 18,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  featureText: {
    ...typography.body,
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  button: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonTextOutline: {
    fontSize: 18,
    fontWeight: '700',
  },
});
