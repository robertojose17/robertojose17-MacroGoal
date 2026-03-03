
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/app/integrations/supabase/client';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import Purchases from 'react-native-purchases';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error' | 'info';
  message: string;
  details?: string;
}

export default function RevenueCatDiagnosticsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isPro, customerInfo, offerings, isLoading: rcLoading } = useRevenueCat();

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsLoading(true);
    const diagnosticResults: DiagnosticResult[] = [];

    try {
      // 1. Check Supabase Connection
      diagnosticResults.push({
        name: 'Supabase Connection',
        status: 'info',
        message: 'Testing connection...',
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        diagnosticResults[diagnosticResults.length - 1] = {
          name: 'Supabase Connection',
          status: 'error',
          message: 'Not authenticated',
          details: userError?.message || 'No user session found',
        };
      } else {
        diagnosticResults[diagnosticResults.length - 1] = {
          name: 'Supabase Connection',
          status: 'success',
          message: 'Connected',
          details: `User ID: ${user.id.substring(0, 8)}...`,
        };

        // 2. Check if revenuecat_events table exists
        const { data: events, error: eventsError } = await supabase
          .from('revenuecat_events')
          .select('count')
          .limit(1);

        if (eventsError) {
          diagnosticResults.push({
            name: 'RevenueCat Events Table',
            status: 'error',
            message: 'Table not found',
            details: 'Run migration: 20250131000000_create_revenuecat_integration.sql',
          });
        } else {
          diagnosticResults.push({
            name: 'RevenueCat Events Table',
            status: 'success',
            message: 'Table exists',
          });
        }

        // 3. Check subscription record
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (subError && subError.code !== 'PGRST116') {
          diagnosticResults.push({
            name: 'Subscription Record',
            status: 'warning',
            message: 'Error fetching subscription',
            details: subError.message,
          });
        } else if (!subscription) {
          diagnosticResults.push({
            name: 'Subscription Record',
            status: 'info',
            message: 'No subscription record yet',
            details: 'Will be created after first purchase',
          });
        } else {
          const hasRevenueCatData = !!subscription.revenuecat_app_user_id;
          diagnosticResults.push({
            name: 'Subscription Record',
            status: hasRevenueCatData ? 'success' : 'warning',
            message: hasRevenueCatData ? 'Synced with RevenueCat' : 'Not synced yet',
            details: hasRevenueCatData 
              ? `Status: ${subscription.status}, Entitlements: ${subscription.entitlement_ids?.join(', ') || 'none'}`
              : 'Make a purchase to trigger webhook sync',
          });
        }

        // 4. Check webhook events
        const { data: userEvents, error: userEventsError } = await supabase
          .from('revenuecat_events')
          .select('*')
          .eq('app_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (userEventsError) {
          diagnosticResults.push({
            name: 'Webhook Events',
            status: 'warning',
            message: 'Could not fetch events',
            details: userEventsError.message,
          });
        } else if (!userEvents || userEvents.length === 0) {
          diagnosticResults.push({
            name: 'Webhook Events',
            status: 'info',
            message: 'No events received yet',
            details: 'Make a purchase to test webhook integration',
          });
        } else {
          const latestEvent = userEvents[0];
          diagnosticResults.push({
            name: 'Webhook Events',
            status: 'success',
            message: `${userEvents.length} event(s) received`,
            details: `Latest: ${latestEvent.event_type} at ${new Date(latestEvent.created_at).toLocaleString()}`,
          });
        }
      }

      // 5. Check RevenueCat SDK
      diagnosticResults.push({
        name: 'RevenueCat SDK',
        status: isPro ? 'success' : 'info',
        message: isPro ? 'Premium Active' : 'Free User',
        details: customerInfo 
          ? `Entitlements: ${Object.keys(customerInfo.entitlements.active).join(', ') || 'none'}`
          : 'Loading...',
      });

      // 6. Check Offerings
      if (offerings?.current) {
        const packageCount = offerings.current.availablePackages.length;
        diagnosticResults.push({
          name: 'RevenueCat Offerings',
          status: packageCount > 0 ? 'success' : 'warning',
          message: packageCount > 0 ? `${packageCount} package(s) available` : 'No packages',
          details: packageCount > 0 
            ? offerings.current.availablePackages.map(p => p.identifier).join(', ')
            : 'Configure products in RevenueCat Dashboard',
        });
      } else {
        diagnosticResults.push({
          name: 'RevenueCat Offerings',
          status: 'warning',
          message: 'No offerings available',
          details: 'Check RevenueCat Dashboard configuration',
        });
      }

      // 7. Check App User ID
      try {
        const appUserId = await Purchases.getAppUserID();
        diagnosticResults.push({
          name: 'RevenueCat App User ID',
          status: 'success',
          message: 'Configured',
          details: `ID: ${appUserId.substring(0, 8)}...`,
        });
      } catch (error: any) {
        diagnosticResults.push({
          name: 'RevenueCat App User ID',
          status: 'error',
          message: 'Not configured',
          details: error.message,
        });
      }

    } catch (error: any) {
      console.error('[Diagnostics] Error:', error);
      diagnosticResults.push({
        name: 'Diagnostic Error',
        status: 'error',
        message: 'Unexpected error',
        details: error.message,
      });
    }

    setResults(diagnosticResults);
    setIsLoading(false);
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      case 'info':
        return '#3b82f6';
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'info':
        return 'info';
    }
  };

  const handleTestWebhook = () => {
    Alert.alert(
      'Test Webhook',
      'To test the webhook:\n\n1. Go to RevenueCat Dashboard\n2. Navigate to Integrations → Webhooks\n3. Click on your webhook\n4. Click "Send Test Event"\n5. Come back and refresh this screen',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Refresh', onPress: runDiagnostics },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.backgroundLight }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={isDark ? colors.textDark : colors.textLight}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.textLight }]}>
          RevenueCat Diagnostics
        </Text>
        <TouchableOpacity onPress={runDiagnostics} style={styles.refreshButton}>
          <IconSymbol
            ios_icon_name="arrow.clockwise"
            android_material_icon_name="refresh"
            size={24}
            color={isDark ? colors.textDark : colors.textLight}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading || rcLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: isDark ? colors.textSecondaryDark : colors.textSecondaryLight }]}>
              Running diagnostics...
            </Text>
          </View>
        ) : (
          <>
            {results.map((result, index) => {
              const statusColorValue = getStatusColor(result.status);
              const statusIconName = getStatusIcon(result.status);
              return (
                <View
                  key={index}
                  style={[
                    styles.resultCard,
                    { backgroundColor: isDark ? colors.cardDark : colors.cardLight },
                  ]}
                >
                  <View style={styles.resultHeader}>
                    <IconSymbol
                      ios_icon_name={statusIconName}
                      android_material_icon_name={statusIconName}
                      size={24}
                      color={statusColorValue}
                    />
                    <Text style={[styles.resultName, { color: isDark ? colors.textDark : colors.textLight }]}>
                      {result.name}
                    </Text>
                  </View>
                  <Text style={[styles.resultMessage, { color: statusColorValue }]}>
                    {result.message}
                  </Text>
                  {result.details && (
                    <Text style={[styles.resultDetails, { color: isDark ? colors.textSecondaryDark : colors.textSecondaryLight }]}>
                      {result.details}
                    </Text>
                  )}
                </View>
              );
            })}

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: colors.primary }]}
              onPress={handleTestWebhook}
            >
              <Text style={styles.testButtonText}>Test Webhook Integration</Text>
            </TouchableOpacity>

            <View style={[styles.infoCard, { backgroundColor: isDark ? colors.cardDark : colors.cardLight }]}>
              <Text style={[styles.infoTitle, { color: isDark ? colors.textDark : colors.textLight }]}>
                Setup Instructions
              </Text>
              <Text style={[styles.infoText, { color: isDark ? colors.textSecondaryDark : colors.textSecondaryLight }]}>
                1. Apply database migration{'\n'}
                2. Deploy revenuecat-webhook Edge Function{'\n'}
                3. Configure webhook in RevenueCat Dashboard{'\n'}
                4. Make a test purchase{'\n'}
                5. Refresh this screen to verify
              </Text>
              <Text style={[styles.infoText, { color: isDark ? colors.textSecondaryDark : colors.textSecondaryLight, marginTop: spacing.md }]}>
                See docs/REVENUECAT_SUPABASE_SETUP.md for detailed instructions.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
  },
  resultCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resultName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.sm,
    flex: 1,
  },
  resultMessage: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  resultDetails: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  testButton: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  infoCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  infoTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
});
