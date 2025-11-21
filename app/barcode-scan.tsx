
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getProductNameByBarcode, searchProducts, OpenFoodFactsProduct, extractNutrition } from '@/utils/openFoodFacts';

/**
 * BARCODE SCAN FLOW - WITH TEMPORARY AUTO-PICK
 * 
 * FLOW:
 * 1) SCAN - Open camera, detect barcode, pause camera
 * 2) GET PRODUCT NAME - Extract name from barcode lookup
 * 3) SEARCH FULL LIBRARY - Use the same search as Food Library
 * 4) AUTO-PICK FIRST RESULT - Temporary workaround for broken taps on iPhone
 * 5) OPEN FOOD DETAILS - Navigate to details screen
 */

type FlowState = 'scanning' | 'loading' | 'results' | 'not-found' | 'error';

export default function BarcodeScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];

  const [permission, requestPermission] = useCameraPermissions();
  const [flowState, setFlowState] = useState<FlowState>('scanning');
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [searchResults, setSearchResults] = useState<OpenFoodFactsProduct[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  
  // Prevent duplicate scans
  const hasScannedRef = useRef(false);

  useEffect(() => {
    console.log('[BarcodeScan] Screen mounted - Platform:', Platform.OS);
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  /**
   * BARCODE DETECTED - Start the 2-step lookup flow with auto-pick
   */
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (hasScannedRef.current || flowState !== 'scanning') {
      console.log('[BarcodeScan] Ignoring duplicate scan');
      return;
    }

    hasScannedRef.current = true;
    setScannedBarcode(data);
    setFlowState('loading');
    setLoadingMessage('Finding product...');

    console.log('[BarcodeScan] Barcode detected:', data);

    try {
      // STEP 1: Get product name from barcode
      console.log('[BarcodeScan] Step 1: Getting product name...');
      const name = await getProductNameByBarcode(data);
      const searchQuery = name || data;
      
      if (name) {
        console.log('[BarcodeScan] Found product name:', name);
      } else {
        console.log('[BarcodeScan] No product name, using barcode:', data);
      }

      // STEP 2: Search Full Library
      console.log('[BarcodeScan] Step 2: Searching Food Library...');
      setLoadingMessage('Searching Food Library...');
      
      const searchData = await searchProducts(searchQuery);

      if (searchData === null) {
        console.error('[BarcodeScan] Search returned null');
        setErrorMessage('Failed to connect. Please check your internet connection.');
        setFlowState('error');
        return;
      }

      if (!searchData.products || searchData.products.length === 0) {
        console.log('[BarcodeScan] No results found');
        setFlowState('not-found');
        return;
      }

      // Filter out products with no name
      const validProducts = searchData.products.filter(p => p.product_name && p.product_name.trim().length > 0);
      
      if (validProducts.length === 0) {
        console.log('[BarcodeScan] No valid products after filtering');
        setFlowState('not-found');
        return;
      }

      console.log('[BarcodeScan] Found', validProducts.length, 'results');
      setSearchResults(validProducts);

      // TEMPORARY AUTO-PICK: Automatically select the first result
      console.log('[BarcodeScan] ⚡ AUTO-PICKING FIRST RESULT (temporary workaround for broken taps)');
      setLoadingMessage('Opening product details...');
      
      // Small delay to show the message
      setTimeout(() => {
        handleSelectFood(validProducts[0]);
      }, 500);
      
    } catch (error) {
      console.error('[BarcodeScan] Error in flow:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
      setFlowState('error');
    }
  };

  /**
   * USER TAPS RESULT - Navigate to Food Details
   */
  const handleSelectFood = (product: OpenFoodFactsProduct) => {
    console.log('[BarcodeScan] Navigating to food-details for:', product.product_name);
    
    try {
      const offDataString = JSON.stringify(product);
      
      router.push({
        pathname: '/food-details',
        params: {
          meal: mealType,
          date: date,
          offData: offDataString,
          source: 'barcode',
        },
      });
      
      console.log('[BarcodeScan] Navigation triggered');
    } catch (error) {
      console.error('[BarcodeScan] Error navigating:', error);
      setErrorMessage('Failed to open food details. Please try again.');
      setFlowState('error');
    }
  };

  /**
   * RESTART FLOW
   */
  const handleTryAgain = () => {
    console.log('[BarcodeScan] Restarting scanner');
    hasScannedRef.current = false;
    setScannedBarcode('');
    setSearchResults([]);
    setErrorMessage('');
    setLoadingMessage('');
    setFlowState('scanning');
  };

  const handleSearchManually = () => {
    console.log('[BarcodeScan] Navigating to food search');
    router.push(`/food-search?meal=${mealType}&date=${date}`);
  };

  const handleQuickAdd = () => {
    console.log('[BarcodeScan] Navigating to quick add');
    router.push(`/quick-add?meal=${mealType}&date=${date}`);
  };

  // Loading permission
  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Permission not granted
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
            Scan Barcode
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.centerContainer}>
          <IconSymbol
            ios_icon_name="camera"
            android_material_icon_name="camera_alt"
            size={64}
            color={isDark ? colors.textSecondaryDark : colors.textSecondary}
          />
          <Text style={[styles.permissionText, { color: isDark ? colors.textDark : colors.text }]}>
            Camera permission is required
          </Text>
          <Text style={[styles.permissionSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            We need access to your camera to scan barcodes
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ERROR STATE
  if (flowState === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
            Scan Barcode
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Connection Error
          </Text>
          <Text style={[styles.errorSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            {errorMessage}
          </Text>
          {scannedBarcode && (
            <Text style={[styles.barcodeText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Barcode: {scannedBarcode}
            </Text>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderWidth: 1, borderColor: isDark ? colors.borderDark : colors.border }]}
              onPress={handleTryAgain}
            >
              <IconSymbol
                ios_icon_name="camera"
                android_material_icon_name="camera_alt"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.actionButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                Scan Again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderWidth: 1, borderColor: isDark ? colors.borderDark : colors.border }]}
              onPress={handleSearchManually}
            >
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.actionButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                Search Full Library
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleQuickAdd}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={24}
                color="#FFFFFF"
              />
              <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                Quick Add
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // NOT FOUND STATE
  if (flowState === 'not-found') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
            Scan Barcode
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>🔍</Text>
          <Text style={[styles.errorTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Food Not Found
          </Text>
          <Text style={[styles.errorSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            No food found for this barcode in the Food Library.
          </Text>
          {scannedBarcode && (
            <Text style={[styles.barcodeText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Barcode: {scannedBarcode}
            </Text>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderWidth: 1, borderColor: isDark ? colors.borderDark : colors.border }]}
              onPress={handleTryAgain}
            >
              <IconSymbol
                ios_icon_name="camera"
                android_material_icon_name="camera_alt"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.actionButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                Rescan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleQuickAdd}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={24}
                color="#FFFFFF"
              />
              <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                Quick Add Manually
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // LOADING STATE
  if (flowState === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
            Scan Barcode
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            {loadingMessage}
          </Text>
          {scannedBarcode && (
            <Text style={[styles.barcodeTextSmall, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Barcode: {scannedBarcode}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // RESULTS STATE - Kept for fallback, but auto-pick should bypass this
  if (flowState === 'results') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
            Select Food
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Found {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
          </Text>
          {scannedBarcode && (
            <Text style={[styles.barcodeTextSmall, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Barcode: {scannedBarcode}
            </Text>
          )}
        </View>

        <ScrollView
          style={styles.resultsScrollView}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
        >
          {searchResults.map((product, index) => {
            const nutrition = extractNutrition(product);
            const brandText = product.brands || '';
            
            return (
              <Pressable
                key={`${product.code || index}`}
                style={({ pressed }) => [
                  styles.resultCard,
                  { backgroundColor: isDark ? colors.cardDark : colors.card },
                  pressed && styles.resultCardPressed,
                ]}
                onPress={() => {
                  console.log('[BarcodeScan] PRESSABLE TAPPED:', product.product_name);
                  handleSelectFood(product);
                }}
              >
                <View style={styles.resultContent}>
                  <Text style={[styles.resultName, { color: isDark ? colors.textDark : colors.text }]}>
                    {product.product_name || 'Unknown Product'}
                  </Text>
                  
                  {brandText && (
                    <Text style={[styles.resultBrand, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                      {brandText}
                    </Text>
                  )}
                  
                  <Text style={[styles.resultNutrition, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    Per 100g: {Math.round(nutrition.calories)} kcal • P: {Math.round(nutrition.protein)}g • C: {Math.round(nutrition.carbs)}g • F: {Math.round(nutrition.fat)}g
                  </Text>
                  
                  {product.serving_size && (
                    <Text style={[styles.resultServing, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                      Serving: {product.serving_size}
                    </Text>
                  )}
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron_right"
                  size={24}
                  color={isDark ? colors.textSecondaryDark : colors.textSecondary}
                />
              </Pressable>
            );
          })}

          <View style={styles.bottomActionsInScroll}>
            <TouchableOpacity
              style={[styles.bottomButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderWidth: 1, borderColor: isDark ? colors.borderDark : colors.border }]}
              onPress={handleTryAgain}
            >
              <IconSymbol
                ios_icon_name="camera"
                android_material_icon_name="camera_alt"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.bottomButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                Scan Again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bottomButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderWidth: 1, borderColor: isDark ? colors.borderDark : colors.border }]}
              onPress={handleSearchManually}
            >
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.bottomButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                Search
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // SCANNING STATE (camera view)
  return (
    <View style={styles.fullScreenContainer}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={handleBarCodeScanned}
      >
        <SafeAreaView style={styles.cameraOverlay} edges={['top']}>
          <View style={styles.headerTransparent}>
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="arrow_back"
                size={28}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <Text style={styles.titleWhite}>
              Scan Barcode
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.scanAreaContainer}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.cameraInstructionText}>
              Position barcode within the frame
            </Text>
            <Text style={styles.offBadge}>
              Powered by OpenFoodFacts
            </Text>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.md,
  },
  headerTransparent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : spacing.sm,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: borderRadius.full,
  },
  title: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  titleWhite: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  permissionText: {
    ...typography.h3,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  permissionSubtext: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  permissionButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingText: {
    ...typography.h3,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorSubtext: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  barcodeText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  barcodeTextSmall: {
    ...typography.caption,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: spacing.md,
  },
  actionButtons: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
  },
  scanAreaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: 280,
    height: 200,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  cameraInstructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.xl,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  offBadge: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    opacity: 0.8,
  },
  resultsHeader: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  resultsCount: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  resultsScrollView: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
    minHeight: 80,
  },
  resultCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    ...typography.bodyBold,
    fontSize: 16,
    marginBottom: 4,
  },
  resultBrand: {
    ...typography.caption,
    marginBottom: 4,
  },
  resultNutrition: {
    ...typography.caption,
    marginBottom: 2,
  },
  resultServing: {
    ...typography.caption,
    fontStyle: 'italic',
  },
  bottomActionsInScroll: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  bottomButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
