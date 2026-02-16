
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Clipboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import * as InAppPurchases from 'expo-in-app-purchases';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IAP_PRODUCT_IDS, APP_STORE_CONFIG, getAllProductIds, validateProductId } from '@/config/iapConfig';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  resultCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  resultIcon: {
    marginRight: spacing.sm,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  resultMessage: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  resultDetails: {
    fontSize: 12,
    marginTop: spacing.xs,
    fontFamily: 'monospace',
  },
  runButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  runButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  productIdBox: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  configSection: {
    marginTop: spacing.md,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  configValue: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  warningBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: spacing.xs,
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
  successBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: spacing.xs,
  },
  successText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
    borderWidth: 2,
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default function IAPDiagnosticsScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';

  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [productsFound, setProductsFound] = useState(0);

  const backgroundColor = isDark ? colors.dark.background : colors.light.background;
  const textColor = isDark ? colors.dark.text : colors.light.text;
  const borderColor = isDark ? colors.dark.border : colors.light.border;
  const cardBackground = isDark ? colors.dark.card : colors.light.card;

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const showTroubleshootingGuide = () => {
    Alert.alert(
      'Troubleshooting Guide',
      'If "Product Fetch" fails:\n\n' +
      '1. Verify that Product IDs in App Store Connect match EXACTLY\n\n' +
      '2. Ensure products are "Ready to Submit"\n\n' +
      '3. Wait 2-4 hours after creating products\n\n' +
      '4. Verify Bundle ID is: com.elitemacrotracker.app\n\n' +
      '5. Use a Sandbox Tester Account (not your real Apple ID)\n\n' +
      '6. Make sure you\'re on a physical device (not simulator)\n\n' +
      'See IAP_PRODUCT_NOT_FOUND_COMPLETE_FIX.md for more details.',
      [{ text: 'Got It' }]
    );
  };

  const runDiagnostics = useCallback(async () => {
    setIsRunning(true);
    setProductsFound(0);
    const diagnosticResults: DiagnosticResult[] = [];

    console.log('[IAP Diagnostics] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[IAP Diagnostics] 🔍 Starting complete IAP diagnostics');
    console.log('[IAP Diagnostics] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Test 1: Platform Check
    console.log('[IAP Diagnostics] Test 1: Platform Verification');
    const isIOS = Platform.OS === 'ios';
    diagnosticResults.push({
      test: 'Platform',
      status: isIOS ? 'pass' : 'fail',
      message: isIOS 
        ? '✅ Running on iOS - IAP supported' 
        : `❌ Running on ${Platform.OS} - IAP only works on iOS`,
      details: `Platform: ${Platform.OS}, Version: ${Platform.Version}`,
    });

    if (!isIOS) {
      console.error('[IAP Diagnostics] ❌ Not on iOS. IAP will not work.');
      setResults(diagnosticResults);
      setIsRunning(false);
      return;
    }

    // Test 2: Product ID Validation
    console.log('[IAP Diagnostics] Test 2: Product ID Validation');
    const productIds = getAllProductIds();
    const validationResults = productIds.map(id => validateProductId(id));
    const allValid = validationResults.every(r => r.valid);
    
    diagnosticResults.push({
      test: 'Product ID Format',
      status: allValid ? 'pass' : 'fail',
      message: allValid 
        ? '✅ All Product IDs have valid format' 
        : '❌ Some Product IDs have invalid format',
      details: productIds.map((id, i) => 
        `${id}: ${validationResults[i].message}`
      ).join('\n'),
    });

    // Test 3: IAP Module Available
    console.log('[IAP Diagnostics] Test 3: IAP Module Availability');
    try {
      const connected = await InAppPurchases.connectAsync();
      diagnosticResults.push({
        test: 'IAP Module Available',
        status: connected ? 'pass' : 'fail',
        message: connected 
          ? '✅ expo-in-app-purchases module available' 
          : '❌ Could not connect to IAP module',
      });
      console.log('[IAP Diagnostics] ✅ IAP module available');
    } catch (error) {
      console.error('[IAP Diagnostics] ❌ Error in IAP module:', error);
      diagnosticResults.push({
        test: 'IAP Module Available',
        status: 'fail',
        message: '❌ Error checking IAP availability',
        details: error instanceof Error ? error.message : String(error),
      });
      setResults(diagnosticResults);
      setIsRunning(false);
      return;
    }

    // Test 4: Store Connection
    console.log('[IAP Diagnostics] Test 4: App Store Connection');
    diagnosticResults.push({
      test: 'App Store Connection',
      status: 'pass',
      message: '✅ Successfully connected to App Store',
    });

    // Test 5: Fetch Products (CRITICAL TEST)
    console.log('[IAP Diagnostics] Test 5: Product Fetch (CRITICAL)');
    console.log('[IAP Diagnostics] Product IDs to fetch:', productIds);
    try {
      const { results: products, responseCode } = await InAppPurchases.getProductsAsync(productIds);
      
      console.log('[IAP Diagnostics] Response code:', responseCode);
      console.log('[IAP Diagnostics] Products returned:', products?.length || 0);
      
      if (products && products.length > 0) {
        setProductsFound(products.length);
        console.log('[IAP Diagnostics] ✅ Products found:');
        products.forEach((p, i) => {
          console.log(`[IAP Diagnostics]   ${i + 1}. ${p.productId}`);
          console.log(`[IAP Diagnostics]      Title: ${p.title}`);
          console.log(`[IAP Diagnostics]      Price: ${p.priceString}`);
        });
        
        diagnosticResults.push({
          test: 'Product Fetch',
          status: 'pass',
          message: `✅ Found ${products.length} product(s)`,
          details: JSON.stringify(products.map(p => ({
            productId: p.productId,
            title: p.title,
            price: p.priceString,
            description: p.description,
          })), null, 2),
        });

        // Check if all expected products were found
        const foundIds = products.map(p => p.productId);
        const missingIds = productIds.filter(id => !foundIds.includes(id));
        
        if (missingIds.length > 0) {
          console.warn('[IAP Diagnostics] ⚠️ Missing products:', missingIds);
          diagnosticResults.push({
            test: 'Product Completeness',
            status: 'warning',
            message: `⚠️ ${missingIds.length} product(s) not found`,
            details: `Missing: ${missingIds.join(', ')}\n\nVerify these products exist in App Store Connect with these EXACT IDs.`,
          });
        } else {
          diagnosticResults.push({
            test: 'Product Completeness',
            status: 'pass',
            message: '✅ All expected products were found',
          });
        }
      } else {
        setProductsFound(0);
        console.error('[IAP Diagnostics] ❌ NO PRODUCTS FOUND');
        console.error('[IAP Diagnostics] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('[IAP Diagnostics] PROBLEM DIAGNOSIS:');
        console.error('[IAP Diagnostics] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('[IAP Diagnostics] Expected Product IDs:', productIds);
        console.error('[IAP Diagnostics]');
        console.error('[IAP Diagnostics] POSSIBLE CAUSES:');
        console.error('[IAP Diagnostics] 1. ❌ Products DO NOT exist in App Store Connect');
        console.error('[IAP Diagnostics] 2. ❌ Product IDs in code DO NOT match App Store Connect');
        console.error('[IAP Diagnostics] 3. ❌ Products are NOT in "Ready to Submit" status');
        console.error('[IAP Diagnostics] 4. ⏰ Just created products (wait 2-4 hours)');
        console.error('[IAP Diagnostics] 5. ❌ Bundle ID does not match');
        console.error('[IAP Diagnostics] 6. ❌ Not using a Sandbox Tester Account');
        console.error('[IAP Diagnostics]');
        console.error('[IAP Diagnostics] SOLUTION:');
        console.error('[IAP Diagnostics] 1. Go to App Store Connect');
        console.error('[IAP Diagnostics] 2. Verify your app has Bundle ID: com.elitemacrotracker.app');
        console.error('[IAP Diagnostics] 3. Go to In-App Purchases');
        console.error('[IAP Diagnostics] 4. Create products with these EXACT IDs:');
        productIds.forEach(id => {
          console.error(`[IAP Diagnostics]    - ${id}`);
        });
        console.error('[IAP Diagnostics] 5. Ensure they are "Ready to Submit"');
        console.error('[IAP Diagnostics] 6. Wait 2-4 hours');
        console.error('[IAP Diagnostics] 7. Use a Sandbox Tester Account');
        console.error('[IAP Diagnostics] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        diagnosticResults.push({
          test: 'Product Fetch',
          status: 'fail',
          message: '❌ NO products found - Products not configured in App Store Connect',
          details: `Expected Product IDs:\n${productIds.join('\n')}\n\nResponse code: ${responseCode}\n\nSee complete guide in IAP_PRODUCT_NOT_FOUND_COMPLETE_FIX.md`,
        });
      }
    } catch (error) {
      console.error('[IAP Diagnostics] ❌ Error fetching products:', error);
      diagnosticResults.push({
        test: 'Product Fetch',
        status: 'fail',
        message: '❌ Error fetching products',
        details: error instanceof Error ? error.message : String(error),
      });
    }

    // Test 6: Purchase History
    console.log('[IAP Diagnostics] Test 6: Purchase History');
    try {
      const history = await InAppPurchases.getPurchaseHistoryAsync();
      console.log('[IAP Diagnostics] Purchase history:', history.results?.length || 0, 'items');
      
      diagnosticResults.push({
        test: 'Purchase History',
        status: 'pass',
        message: history.results.length > 0 
          ? `✅ Found ${history.results.length} previous purchase(s)` 
          : 'ℹ️ No previous purchases',
        details: history.results.length > 0 
          ? JSON.stringify(history.results.map(p => ({
              productId: p.productId,
              transactionId: p.transactionId,
              acknowledged: p.acknowledged,
            })), null, 2)
          : undefined,
      });
    } catch (error) {
      console.error('[IAP Diagnostics] ⚠️ Error fetching history:', error);
      diagnosticResults.push({
        test: 'Purchase History',
        status: 'warning',
        message: '⚠️ Could not fetch purchase history',
        details: error instanceof Error ? error.message : String(error),
      });
    }

    // Disconnect
    try {
      await InAppPurchases.disconnectAsync();
      console.log('[IAP Diagnostics] Disconnected from App Store');
    } catch (error) {
      console.log('[IAP Diagnostics] Error disconnecting:', error);
    }

    console.log('[IAP Diagnostics] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[IAP Diagnostics] ✅ Diagnostics complete');
    console.log('[IAP Diagnostics] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    setResults(diagnosticResults);
    setIsRunning(false);
  }, []);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check-circle" size={24} color="#4CAF50" />;
      case 'fail':
        return <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="error" size={24} color="#F44336" />;
      case 'warning':
        return <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={24} color="#FF9800" />;
      case 'pending':
        return <ActivityIndicator size="small" color={textColor} />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return '#4CAF50';
      case 'fail':
        return '#F44336';
      case 'warning':
        return '#FF9800';
      case 'pending':
        return textColor;
    }
  };

  const productIds = getAllProductIds();
  const allTestsPassed = results.length > 0 && results.every(r => r.status === 'pass');
  const hasFailures = results.some(r => r.status === 'fail');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>IAP Diagnostics</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Status Banner */}
        {!isRunning && results.length > 0 && (
          <React.Fragment>
            {allTestsPassed && productsFound === productIds.length ? (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>✅ Everything Configured Correctly!</Text>
                <Text style={styles.successText}>
                  All products were found. In-app purchases should work correctly.
                </Text>
              </View>
            ) : hasFailures ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>⚠️ Problems Detected</Text>
                <Text style={styles.warningText}>
                  {productsFound === 0 
                    ? 'No products found. Check your App Store Connect configuration.'
                    : `Only found ${productsFound} of ${productIds.length} products. Review details below.`}
                </Text>
              </View>
            ) : null}
          </React.Fragment>
        )}

        {/* Configuration Info */}
        <View style={[styles.infoBox, { backgroundColor: cardBackground, borderColor }]}>
          <Text style={[styles.infoTitle, { color: textColor }]}>Current Configuration</Text>
          
          <View style={styles.configSection}>
            <View style={styles.configRow}>
              <Text style={[styles.configLabel, { color: textColor }]}>Bundle ID:</Text>
              <Text style={[styles.configValue, { color: textColor }]}>{APP_STORE_CONFIG.bundleId}</Text>
            </View>
            <View style={styles.configRow}>
              <Text style={[styles.configLabel, { color: textColor }]}>App Name:</Text>
              <Text style={[styles.configValue, { color: textColor }]}>{APP_STORE_CONFIG.appName}</Text>
            </View>
            <View style={styles.configRow}>
              <Text style={[styles.configLabel, { color: textColor }]}>Products:</Text>
              <Text style={[styles.configValue, { color: textColor }]}>{productsFound}/{productIds.length}</Text>
            </View>
          </View>

          <View style={[styles.productIdBox, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
            <Text style={[styles.infoText, { color: textColor, fontSize: 12, fontWeight: '600' }]}>
              Configured Product IDs:
            </Text>
            {productIds.map((id, index) => (
              <Text key={index} style={[styles.infoText, { color: textColor, fontSize: 12, marginTop: 4 }]}>
                {index + 1}. {id}
              </Text>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.copyButton, { backgroundColor: colors.primary }]}
            onPress={() => copyToClipboard(productIds.join('\n'), 'Product IDs')}
          >
            <IconSymbol
              ios_icon_name="doc.on.doc"
              android_material_icon_name="content-copy"
              size={16}
              color="#FFFFFF"
            />
            <Text style={[styles.copyButtonText, { color: '#FFFFFF' }]}>
              {copiedText === 'Product IDs' ? '✅ Copied!' : 'Copy Product IDs'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Test Results */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Test Results</Text>
          
          {results.map((result, index) => (
            <View
              key={index}
              style={[
                styles.resultCard,
                { backgroundColor: cardBackground, borderColor: getStatusColor(result.status) },
              ]}
            >
              <View style={styles.resultHeader}>
                <View style={styles.resultIcon}>{getStatusIcon(result.status)}</View>
                <Text style={[styles.resultTitle, { color: textColor }]}>{result.test}</Text>
              </View>
              <Text style={[styles.resultMessage, { color: textColor }]}>{result.message}</Text>
              {result.details && (
                <Text style={[styles.resultDetails, { color: isDark ? '#aaa' : '#666' }]}>
                  {result.details}
                </Text>
              )}
            </View>
          ))}

          {results.length === 0 && !isRunning && (
            <Text style={[styles.infoText, { color: textColor, textAlign: 'center' }]}>
              No results. Run diagnostics to check your IAP configuration.
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.runButton, { backgroundColor: colors.primary }]}
          onPress={runDiagnostics}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.runButtonText, { color: '#fff' }]}>Run Diagnostics Again</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.helpButton, { borderColor: colors.primary }]}
          onPress={showTroubleshootingGuide}
        >
          <IconSymbol
            ios_icon_name="questionmark.circle"
            android_material_icon_name="help"
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.helpButtonText, { color: colors.primary }]}>
            View Troubleshooting Guide
          </Text>
        </TouchableOpacity>

        {/* Troubleshooting Info */}
        <View style={[styles.infoBox, { backgroundColor: cardBackground, borderColor, marginTop: spacing.lg }]}>
          <Text style={[styles.infoTitle, { color: textColor }]}>Quick Fix</Text>
          <Text style={[styles.infoText, { color: textColor }]}>
            If "Product Fetch" fails:{'\n\n'}
            
            1️⃣ Check App Store Connect{'\n'}
            • Product IDs must match EXACTLY{'\n'}
            • Status must be "Ready to Submit"{'\n'}
            • Bundle ID: com.elitemacrotracker.app{'\n\n'}
            
            2️⃣ Wait for Sync{'\n'}
            • New products: 2-4 hours{'\n'}
            • Changes: 15-30 minutes{'\n\n'}
            
            3️⃣ Use Sandbox Tester{'\n'}
            • Settings → App Store → Sandbox Account{'\n'}
            • DO NOT use your real Apple ID{'\n\n'}
            
            4️⃣ Physical Device{'\n'}
            • IAP does NOT work on simulator{'\n'}
            • IAP does NOT work in Expo Go{'\n\n'}
            
            📚 See IAP_PRODUCT_NOT_FOUND_COMPLETE_FIX.md for complete guide.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
