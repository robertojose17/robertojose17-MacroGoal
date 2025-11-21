
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getProductNameByBarcode, searchProducts, OpenFoodFactsProduct, extractNutrition, extractServingSize } from '@/utils/openFoodFacts';

type ScanState = 'scanning' | 'searching' | 'not-found' | 'error';

// Debug info for development
interface DebugInfo {
  stepA: string; // Barcode read
  stepB: string; // Name lookup result
  stepC: string; // Library results count
  stepD: string; // Selected index
}

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
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    stepA: '',
    stepB: '',
    stepC: '',
    stepD: '',
  });
  const hasScannedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('[BarcodeScanner] Screen mounted on platform:', Platform.OS);
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

  /**
   * Auto-select the best match from search results
   * CRITICAL: This function MUST ALWAYS return a product if the array is not empty
   * NEVER wait for a "perfect match" - pick immediately
   * FIXED: Removed strict filtering that was blocking results
   */
  const selectBestMatch = (products: OpenFoodFactsProduct[], searchQuery: string): OpenFoodFactsProduct => {
    console.log('[BarcodeScanner] Auto-selecting best match from', products.length, 'results');

    // Rule C: If only one result, auto-select it IMMEDIATELY
    if (products.length === 1) {
      console.log('[BarcodeScanner] Only one result, auto-selecting:', products[0].product_name);
      setDebugInfo(prev => ({ ...prev, stepD: '0 (only result)' }));
      return products[0];
    }

    // FIXED: Categorize products by serving size with RELAXED criteria
    // We want to prefer non-100g servings, but NOT reject 100g servings entirely
    const non100gProducts: Array<{ product: OpenFoodFactsProduct; index: number; score: number }> = [];
    const is100gProducts: Array<{ product: OpenFoodFactsProduct; index: number; score: number }> = [];

    products.forEach((product, index) => {
      const serving = extractServingSize(product);
      
      // Calculate relevance score for this product
      let score = 0;

      // Score 1: Name similarity (case-insensitive)
      const productName = (product.product_name || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      
      if (productName.includes(query)) {
        score += 10;
      }
      
      // Exact match bonus
      if (productName === query) {
        score += 20;
      }

      // Score 2: Has brand (branded over generic)
      if (product.brands && product.brands.trim().length > 0) {
        score += 5;
      }

      // Score 3: Nutrition completeness
      const nutrition = extractNutrition(product);
      let nutritionFields = 0;
      
      if (nutrition.calories > 0) nutritionFields++;
      if (nutrition.protein > 0) nutritionFields++;
      if (nutrition.carbs > 0) nutritionFields++;
      if (nutrition.fat > 0) nutritionFields++;
      if (nutrition.fiber > 0) nutritionFields++;
      if (nutrition.sugars > 0) nutritionFields++;
      
      score += nutritionFields; // 0-6 points

      // FIXED: More lenient check for "100g" servings
      // Only consider it "100g" if:
      // 1. Grams is exactly 100 (or very close)
      // 2. AND the description is ONLY "100 g" with no other info
      // 3. AND hasValidGrams is false (meaning it's a fallback)
      const isDefault100g = 
        Math.abs(serving.grams - 100) < 1 && 
        !serving.hasValidGrams &&
        serving.description.match(/^100\s*g$/i);

      if (isDefault100g) {
        is100gProducts.push({ product, index, score });
        console.log('[BarcodeScanner] Product categorized as 100g (default):', product.product_name, 'Score:', score);
      } else {
        non100gProducts.push({ product, index, score });
        console.log('[BarcodeScanner] Product categorized as non-100g:', product.product_name, 'Serving:', serving.displayText, 'Score:', score);
      }
    });

    console.log('[BarcodeScanner] Found', non100gProducts.length, 'non-100g products and', is100gProducts.length, '100g products');

    // Rule A: Prefer non-100g servings (sort by score)
    if (non100gProducts.length > 0) {
      non100gProducts.sort((a, b) => b.score - a.score);
      const selected = non100gProducts[0];
      console.log('[BarcodeScanner] Selecting best non-100g product:', selected.product.product_name, 'Score:', selected.score);
      setDebugInfo(prev => ({ ...prev, stepD: `${selected.index} (non-100g, score: ${selected.score})` }));
      return selected.product;
    }

    // Rule B: All are 100g (or default), pick the most relevant by score
    console.log('[BarcodeScanner] All products are 100g defaults, selecting most relevant');
    is100gProducts.sort((a, b) => b.score - a.score);
    const best = is100gProducts[0];
    console.log('[BarcodeScanner] Selected best 100g product:', best.product.product_name, 'Score:', best.score);
    setDebugInfo(prev => ({ ...prev, stepD: `${best.index} (best 100g, score: ${best.score})` }));
    return best.product;
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Prevent multiple scans
    if (hasScannedRef.current || scanState !== 'scanning') {
      console.log('[BarcodeScanner] Ignoring duplicate scan');
      return;
    }

    hasScannedRef.current = true;
    setScannedBarcode(data);
    setScanState('searching');

    console.log('[BarcodeScanner] ========== BARCODE SCAN STARTED ==========');
    console.log('[BarcodeScanner] Scanned barcode:', data);
    console.log('[BarcodeScanner] Platform:', Platform.OS);

    // Initialize debug info
    setDebugInfo({
      stepA: data,
      stepB: 'pending...',
      stepC: 'pending...',
      stepD: 'pending...',
    });

    // Set a HARD TIMEOUT (10 seconds total for entire flow)
    timeoutRef.current = setTimeout(() => {
      console.log('[BarcodeScanner] ❌ TIMEOUT after 10 seconds');
      setDebugInfo(prev => ({ ...prev, stepB: 'TIMEOUT', stepC: 'TIMEOUT', stepD: 'TIMEOUT' }));
      setErrorMessage('Request timed out. Please check your internet connection and try again.');
      setScanState('error');
    }, 10000);

    try {
      // ========== STEP 1: GET PRODUCT NAME BY BARCODE (8 second timeout) ==========
      console.log('[BarcodeScanner] STEP 1: Getting product name...');
      setDebugInfo(prev => ({ ...prev, stepB: 'fetching...' }));
      
      const namePromise = getProductNameByBarcode(data);
      const nameTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
      const name = await Promise.race([namePromise, nameTimeout]);

      if (name) {
        console.log('[BarcodeScanner] ✅ STEP 1 SUCCESS: Found product name:', name);
        setDebugInfo(prev => ({ ...prev, stepB: `ok: "${name}"` }));
      } else {
        console.log('[BarcodeScanner] ⚠️ STEP 1: No product name found, using barcode as fallback');
        setDebugInfo(prev => ({ ...prev, stepB: 'not found (using barcode)' }));
      }

      const searchQuery = name || data;

      // ========== STEP 2: SEARCH FOOD LIBRARY (8 second timeout) ==========
      console.log('[BarcodeScanner] STEP 2: Searching Food Library for:', searchQuery);
      setDebugInfo(prev => ({ ...prev, stepC: 'searching...' }));

      const searchPromise = searchProducts(searchQuery);
      const searchTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
      const searchData = await Promise.race([searchPromise, searchTimeout]);

      // Clear timeout if request completes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Handle timeout
      if (searchData === null) {
        console.error('[BarcodeScanner] ❌ STEP 2 TIMEOUT or ERROR');
        setDebugInfo(prev => ({ ...prev, stepC: 'timeout/error', stepD: 'N/A' }));
        setErrorMessage('Search timed out. Please check your internet connection and try again.');
        setScanState('error');
        return;
      }

      // Handle no results
      if (!searchData.products || searchData.products.length === 0) {
        console.log('[BarcodeScanner] ⚠️ STEP 2: No results found for query:', searchQuery);
        setDebugInfo(prev => ({ ...prev, stepC: '0', stepD: 'N/A' }));
        setScanState('not-found');
        return;
      }

      console.log('[BarcodeScanner] ✅ STEP 2 SUCCESS: Found', searchData.products.length, 'products from Food Library');
      setDebugInfo(prev => ({ ...prev, stepC: searchData.products.length.toString() }));
      
      // ========== CRITICAL FIX: ACCEPT ALL PRODUCTS, NO FILTERING ==========
      // DO NOT filter out products based on:
      // - Missing serving size
      // - Missing nutrients
      // - Default 100g serving
      // - Any undefined fields
      // Accept ALL raw search results, then rank them
      const allProducts = searchData.products;
      
      console.log('[BarcodeScanner] Total products (NO FILTERING APPLIED):', allProducts.length);

      // If we somehow have zero products (shouldn't happen), show not found
      if (allProducts.length === 0) {
        console.log('[BarcodeScanner] ⚠️ No products after processing (unexpected)');
        setDebugInfo(prev => ({ ...prev, stepD: 'N/A (no products)' }));
        setScanState('not-found');
        return;
      }

      // ========== STEP 3: AUTO-SELECT BEST MATCH (IMMEDIATE, NON-BLOCKING) ==========
      console.log('[BarcodeScanner] STEP 3: Auto-selecting best match (IMMEDIATE)...');
      setDebugInfo(prev => ({ ...prev, stepD: 'selecting...' }));
      
      // CRITICAL: This MUST return a product immediately
      // NEVER wait for a "perfect match"
      const bestMatch = selectBestMatch(allProducts, searchQuery);
      console.log('[BarcodeScanner] ✅ STEP 3 SUCCESS: Auto-selected:', bestMatch.product_name);
      
      // ========== STEP 4: NAVIGATE TO FOOD DETAILS (IMMEDIATE) ==========
      console.log('[BarcodeScanner] STEP 4: Navigating to Food Details...');
      console.log('[BarcodeScanner] ========== BARCODE SCAN COMPLETE ==========');
      
      router.push({
        pathname: '/food-details',
        params: {
          meal: mealType,
          date: date,
          offData: JSON.stringify(bestMatch),
          source: 'barcode',
        },
      });
    } catch (error) {
      // Clear timeout if error occurs
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      console.error('[BarcodeScanner] ❌ ERROR in search:', error);
      setDebugInfo(prev => ({ ...prev, stepB: 'error', stepC: 'error', stepD: 'error' }));
      
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

  const handleTryAgain = () => {
    console.log('[BarcodeScanner] Restarting scanner');
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    hasScannedRef.current = false;
    setScannedBarcode('');
    setErrorMessage('');
    setDebugInfo({
      stepA: '',
      stepB: '',
      stepC: '',
      stepD: '',
    });
    setScanState('scanning');
  };

  const handleSearchManually = () => {
    console.log('[BarcodeScanner] Navigating to food search');
    router.push(`/food-search?meal=${mealType}&date=${date}`);
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

        <ScrollView contentContainerStyle={styles.notFoundContainer}>
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

          {/* DEBUG INFO (temporary for development) */}
          <View style={[styles.debugCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.debugTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Debug Info (Dev Only)
            </Text>
            <Text style={[styles.debugText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Step A: barcode = {debugInfo.stepA || 'N/A'}
            </Text>
            <Text style={[styles.debugText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Step B: name lookup = {debugInfo.stepB || 'N/A'}
            </Text>
            <Text style={[styles.debugText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Step C: library results = {debugInfo.stepC || 'N/A'}
            </Text>
            <Text style={[styles.debugText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Step D: selected index = {debugInfo.stepD || 'N/A'}
            </Text>
          </View>

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
                Rescan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.notFoundButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderWidth: 1, borderColor: isDark ? colors.borderDark : colors.border }]}
              onPress={handleSearchManually}
            >
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.notFoundButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                Search Food Library
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
                Quick Add
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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

        <ScrollView contentContainerStyle={styles.notFoundContainer}>
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

          {/* DEBUG INFO (temporary for development) */}
          <View style={[styles.debugCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.debugTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Debug Info (Dev Only)
            </Text>
            <Text style={[styles.debugText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Step A: barcode = {debugInfo.stepA || 'N/A'}
            </Text>
            <Text style={[styles.debugText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Step B: name lookup = {debugInfo.stepB || 'N/A'}
            </Text>
            <Text style={[styles.debugText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Step C: library results = {debugInfo.stepC || 'N/A'}
            </Text>
            <Text style={[styles.debugText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Step D: selected index = {debugInfo.stepD || 'N/A'}
            </Text>
          </View>

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
                Rescan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.notFoundButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderWidth: 1, borderColor: isDark ? colors.borderDark : colors.border }]}
              onPress={handleSearchManually}
            >
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.notFoundButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                Search Food Library
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
                Quick Add
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show loading screen (clean, with debug info)
  if (scanState === 'searching') {
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
            Searching…
          </Text>

          {/* DEBUG INFO (temporary for development) */}
          <View style={[styles.debugCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.debugTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Debug Info (Dev Only)
            </Text>
            <Text style={[styles.debugText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Step A: barcode = {debugInfo.stepA || 'N/A'}
            </Text>
            <Text style={[styles.debugText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Step B: name lookup = {debugInfo.stepB || 'N/A'}
            </Text>
            <Text style={[styles.debugText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Step C: library results = {debugInfo.stepC || 'N/A'}
            </Text>
            <Text style={[styles.debugText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Step D: selected index = {debugInfo.stepD || 'N/A'}
            </Text>
          </View>
        </View>
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
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
  debugCard: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    width: '100%',
    maxWidth: 400,
  },
  debugTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
    fontSize: 12,
  },
  debugText: {
    ...typography.caption,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
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
});
