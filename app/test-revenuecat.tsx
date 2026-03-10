
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase/client';
import { colors, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as Clipboard from 'expo-clipboard';

export default function TestRevenueCatScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || null);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'User ID copied to clipboard');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
        <Stack.Screen
          options={{
            title: 'Test RevenueCat',
            headerStyle: { backgroundColor: isDark ? colors.backgroundDark : colors.background },
            headerTintColor: isDark ? colors.textDark : colors.text,
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Test RevenueCat',
          headerStyle: { backgroundColor: isDark ? colors.backgroundDark : colors.background },
          headerTintColor: isDark ? colors.textDark : colors.text,
        }}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <IconSymbol
            ios_icon_name="person.circle.fill"
            android_material_icon_name="account-circle"
            size={64}
            color={colors.primary}
            style={styles.icon}
          />
          
          <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
            Your User ID
          </Text>
          
          <Text style={[styles.subtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Use this ID when testing RevenueCat webhooks
          </Text>

          {userId && (
            <>
              <View style={[styles.idContainer, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
                <Text style={[styles.idText, { color: isDark ? colors.textDark : colors.text }]} selectable>
                  {userId}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.copyButton, { backgroundColor: colors.primary }]}
                onPress={() => copyToClipboard(userId)}
              >
                <IconSymbol
                  ios_icon_name="doc.on.doc"
                  android_material_icon_name="content-copy"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.copyButtonText}>Copy User ID</Text>
              </TouchableOpacity>
            </>
          )}

          {userEmail && (
            <View style={styles.emailContainer}>
              <Text style={[styles.emailLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Email:
              </Text>
              <Text style={[styles.emailText, { color: isDark ? colors.textDark : colors.text }]}>
                {userEmail}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.instructionsCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <Text style={[styles.instructionsTitle, { color: isDark ? colors.textDark : colors.text }]}>
            How to Test RevenueCat Webhook
          </Text>
          
          <View style={styles.step}>
            <Text style={[styles.stepNumber, { color: colors.primary }]}>1.</Text>
            <Text style={[styles.stepText, { color: isDark ? colors.textDark : colors.text }]}>
              Copy your User ID above
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={[styles.stepNumber, { color: colors.primary }]}>2.</Text>
            <Text style={[styles.stepText, { color: isDark ? colors.textDark : colors.text }]}>
              Go to RevenueCat Dashboard → Integrations → Webhooks
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={[styles.stepNumber, { color: colors.primary }]}>3.</Text>
            <Text style={[styles.stepText, { color: isDark ? colors.textDark : colors.text }]}>
              Click "Send Test Event"
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={[styles.stepNumber, { color: colors.primary }]}>4.</Text>
            <Text style={[styles.stepText, { color: isDark ? colors.textDark : colors.text }]}>
              Replace the "app_user_id" in the test JSON with your User ID
            </Text>
          </View>

          <View style={styles.step}>
            <Text style={[styles.stepNumber, { color: colors.primary }]}>5.</Text>
            <Text style={[styles.stepText, { color: isDark ? colors.textDark : colors.text }]}>
              Send the test event - it should now return 200 OK!
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: colors.primary }]}>
            Back to Profile
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  icon: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  idContainer: {
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  idText: {
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emailContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  emailLabel: {
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '500',
  },
  instructionsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  step: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: spacing.sm,
    width: 24,
  },
  stepText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  backButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
