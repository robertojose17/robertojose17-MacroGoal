
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getProductNameByBarcode, searchProducts, OpenFoodFactsProduct, extractNutrition } from '@/utils/openFoodFacts';

type ScanState = 'scanning' | 'finding-name' | 'searching-library' | 'showing-results' | 'not-found' | 'error';

export default function BarcodeScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];

  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [searchResults, setSearchResults] = useState<OpenFoodFactsProduct[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasScannedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('[BarcodeScanner] ✓ Screen mounted on platform:', Platform.OS);
    if (permission && !permission.granted) {
      requestPermission();
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Prevent multiple scans
    if (hasScannedRef.current || scanState !== 'scanning') {
      console.log('[BarcodeScanner] Ignoring duplicate scan');
      return;
    }

    hasScannedRef.current = true;
    setScannedBarcode(data);
    setScanState('finding-name');

    console.log('[BarcodeScanner] 📷 Scanned barcode:', data);
    console.log('[BarcodeScanner] 📱 Platform:', Platform.OS);
    console.log('[BarcodeScanner] Camera stopped, starting 2-step search...');

    // STEP 1: GET PRODUCT NAME BY BARCODE
    console.log('[BarcodeScanner] STEP 1: Finding product name...');
    
    // Set a failsafe timeout (8 seconds for step 1)
    timeoutRef.current = setTimeout(() => {
      console.log('[BarcodeScanner] ⏱️ Step 1 timeout after 8 seconds');
      setErrorMessage('Request timed out. Please check your internet connection and try again.');
      setScanState('error');
    }, 8000);

    try {
      const name = await getProductNameByBarcode(data);

      // Clear timeout if request completes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      let searchQuery = name;

      if (!name) {
        console.log('[BarcodeScanner] ⚠️ No product name found, using barcode digits as fallback');
        searchQuery = data; // Use raw barcode as fallback
      } else {
        console.log('[BarcodeScanner] ✅ Found product name:', name);
        setProductName(name);
      }

      // STEP 2: SEARCH BY NAME USING FOOD LIBRARY
      console.log('[BarcodeScanner] STEP 2: Searching Food Library for:', searchQuery);
      setScanState('searching-library');

      // Set a new timeout for step 2 (8 seconds)
      timeoutRef.current = setTimeout(() => {
        console.log('[BarcodeScanner] ⏱️ Step 2 timeout after 8 seconds');
        setErrorMessage('Search timed out. Please check your internet connection and try again.');
        setScanState('error');
      }, 8000);

      const searchData = await searchProducts(searchQuery);

      // Clear timeout if request completes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (searchData === null) {
        console.error('[BarcodeScanner] ❌ Search returned null (API error)');
        setErrorMessage('Failed to connect to OpenFoodFacts. Please check your internet connection and try again.');
        setScanState('error');
        return;
      }

      if (searchData.products && searchData.products.length > 0) {
        console.log('[BarcodeScanner] ✅ Found', searchData.products.length, 'products from Food Library');
        
        // Filter out products with no name
        const validProducts = searchData.products.filter(p => p.product_name && p.product_name.trim().length > 0);
        
        if (validProducts.length === 0) {
          console.log('[BarcodeScanner] ⚠️ No valid products after filtering');
          setScanState('not-found');
          return;
        }

        setSearchResults(validProducts);
        setScanState('showing-results');
      } else {
        console.log('[BarcodeScanner] ⚠️ No results found for query:', searchQuery);
        setScanState('not-found');
      }
    } catch (error) {
      // Clear timeout if error occurs
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      console.error('[BarcodeScanner] ❌ Error in 2-step search:', error);
      
      let errorMsg = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMsg = error.message;
        
        // Check for specific error types
        if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
          errorMsg = 'Request timed out. Please check your internet connection and try again.';
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          errorMsg = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMsg = 'Error contacting OpenFoodFacts. Please try again or add manually.';
        }
      }
      
      setErrorMessage(errorMsg);
      setScanState('error');
    }
  };

  const handleSelectProduct = (product: OpenFoodFactsProduct) => {
    console.log('[BarcodeScanner] User selected product:', product.product_name);
    router.push({
      pathname: '/food-details',
      params: {
        meal: mealType,
        date: date,
        offData: JSON.stringify(product),
        source: 'barcode',
      },
    });
  };

  const handleTryAgain = () => {
    console.log('[BarcodeScanner] Restarting scanner');
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    hasScannedRef.current = false;
    setScannedBarcode('');
    setProductName('');
    setSearchResults([]);
    setErrorMessage('');
    setScanState('scanning');
  };

  const handleAddManually = () => {
    console.log('[BarcodeScanner] Navigating to quick add');
    router.push(`/quick-add?meal=${mealType}&date=${date}`);
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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

        <View style={styles.permissionContainer}>
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

  // Show error screen
  if (scanState === 'error') {
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

        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundIcon}>⚠️</Text>
          <Text style={[styles.notFoundTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Connection Error
          </Text>
          <Text style={[styles.notFoundSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            {errorMessage}
          </Text>
          {scannedBarcode && (
            <Text style={[styles.barcodeText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Barcode: {scannedBarcode}
            </Text>
          )}

          <View style={styles.notFoundButtons}>
            <TouchableOpacity
              style={[styles.notFoundButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderWidth: 1, borderColor: isDark ? colors.borderDark : colors.border }]}
              onPress={handleTryAgain}
            >
              <IconSymbol
                ios_icon_name="camera"
                android_material_icon_name="camera_alt"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.notFoundButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                Scan Another Barcode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.notFoundButton, { backgroundColor: colors.primary }]}
              onPress={handleAddManually}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={24}
                color="#FFFFFF"
              />
              <Text style={[styles.notFoundButtonText, { color: '#FFFFFF' }]}>
                Add Manually
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show "not found" screen
  if (scanState === 'not-found') {
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

        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundIcon}>🔍</Text>
          <Text style={[styles.notFoundTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Food Not Found
          </Text>
          <Text style={[styles.notFoundSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            No food found for this barcode in the Food Library.
          </Text>
          {scannedBarcode && (
            <Text style={[styles.barcodeText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Barcode: {scannedBarcode}
            </Text>
          )}
          {productName && (
            <Text style={[styles.productNameText, { color: isDark ? colors.textDark : colors.text }]}>
              Product: {productName}
            </Text>
          )}

          <View style={styles.notFoundButtons}>
            <TouchableOpacity
              style={[styles.notFoundButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderWidth: 1, borderColor: isDark ? colors.borderDark : colors.border }]}
              onPress={handleTryAgain}
            >
              <IconSymbol
                ios_icon_name="camera"
                android_material_icon_name="camera_alt"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.notFoundButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                Scan Another Barcode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.notFoundButton, { backgroundColor: colors.primary }]}
              onPress={handleAddManually}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={24}
                color="#FFFFFF"
              />
              <Text style={[styles.notFoundButtonText, { color: '#FFFFFF' }]}>
                Add Manually
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading screen for step 1 (finding product name)
  if (scanState === 'finding-name') {
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

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            Finding product name…
          </Text>
          <Text style={[styles.loadingSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Step 1 of 2
          </Text>
          {scannedBarcode && (
            <Text style={[styles.barcodeText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Barcode: {scannedBarcode}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Show loading screen for step 2 (searching food library)
  if (scanState === 'searching-library') {
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

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            Searching Food Library…
          </Text>
          <Text style={[styles.loadingSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Step 2 of 2
          </Text>
          {productName && (
            <Text style={[styles.productNameText, { color: isDark ? colors.textDark : colors.text }]}>
              Searching for: {productName}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Show search results
  if (scanState === 'showing-results') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleTryAgain}>
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

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {productName && (
            <View style={[styles.searchInfoCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
              <Text style={[styles.searchInfoLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Searched for:
              </Text>
              <Text style={[styles.searchInfoText, { color: isDark ? colors.textDark : colors.text }]}>
                {productName}
              </Text>
            </View>
          )}

          <Text style={[styles.resultsCount, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Found {searchResults.length} results
          </Text>

          {searchResults.map((product, index) => {
            const nutrition = extractNutrition(product);
            const brandText = product.brands || '';
            
            return (
              <React.Fragment key={index}>
                <TouchableOpacity
                  style={[styles.resultCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
                  onPress={() => handleSelectProduct(product)}
                >
                  <View style={styles.resultContent}>
                    <View style={styles.resultHeader}>
                      <Text style={[styles.resultName, { color: isDark ? colors.textDark : colors.text }]}>
                        {product.product_name || 'Unknown Product'}
                      </Text>
                    </View>
                    
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
                </TouchableOpacity>
              </React.Fragment>
            );
          })}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show camera view (scanning state)
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
            <Text style={styles.instructionText}>
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
  loadingContainer: {
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
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
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
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  notFoundIcon: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  notFoundTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  notFoundSubtext: {
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
  productNameText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  notFoundButtons: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  notFoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  notFoundButtonText: {
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
  instructionText: {
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
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  searchInfoCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  searchInfoLabel: {
    ...typography.caption,
    marginBottom: 4,
  },
  searchInfoText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  resultsCount: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: spacing.sm,
  },
  resultName: {
    ...typography.bodyBold,
    fontSize: 16,
    flex: 1,
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
  bottomSpacer: {
    height: 100,
  },
});
