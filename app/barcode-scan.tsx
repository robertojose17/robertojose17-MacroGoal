
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { colors, spacing, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { lookupProductByBarcode } from '@/utils/openFoodFacts';

type ScanState = 'scanning' | 'loading' | 'not-found' | 'error';

export default function BarcodeScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mode = (params.mode as string) || 'diary';
  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  const returnTo = (params.returnTo as string) || undefined;
  const myMealId = (params.mealId as string) || undefined;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Prevent multiple scans
  const isProcessingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('[BarcodeScan] Screen mounted, meal:', mealType, 'date:', date);
    console.log('[BarcodeScan] Mode:', mode, 'returnTo:', returnTo, 'mealId:', myMealId);
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [date, mealType, mode, returnTo, myMealId]);

  // Request permission if not granted
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    // Prevent multiple scans
    if (isProcessingRef.current) {
      console.log('[BarcodeScan] Already processing a scan, ignoring...');
      return;
    }

    isProcessingRef.current = true;
    const barcode = result.data;
    
    console.log('[BarcodeScan] ========== BARCODE DETECTED ==========');
    console.log('[BarcodeScan] Type:', result.type);
    console.log('[BarcodeScan] Code:', barcode);
    
    setScannedCode(barcode);
    setScanState('loading');

    // Set hard timeout (10 seconds)
    timeoutRef.current = setTimeout(() => {
      console.log('[BarcodeScan] ⏱️ Lookup timeout reached');
      setScanState('error');
      setErrorMessage('Request timed out. Please check your internet connection and try again.');
      isProcessingRef.current = false;
    }, 10000);

    try {
      console.log('[BarcodeScan] Looking up product in OpenFoodFacts...');
      const product = await lookupProductByBarcode(barcode);
      
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (product) {
        console.log('[BarcodeScan] ✅ Product found:', product.product_name);
        console.log('[BarcodeScan] Navigating to food-details with params:', {
          meal: mealType,
          date: date,
          mode: mode,
          returnTo: returnTo || '/add-food',
          mealId: myMealId,
        });
        
        // Navigate to Food Details screen with push (not replace) to maintain stack
        router.push({
          pathname: '/food-details',
          params: {
            meal: mealType,
            date: date,
            offData: JSON.stringify(product),
            source: 'barcode',
            mode: mode,
            returnTo: returnTo || '/add-food',
            mealId: myMealId,
          },
        });
      } else {
        console.log('[BarcodeScan] ❌ Product not found in OpenFoodFacts');
        setScanState('not-found');
        isProcessingRef.current = false;
      }
    } catch (error) {
      console.error('[BarcodeScan] ❌ Error looking up product:', error);
      
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      setScanState('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
      isProcessingRef.current = false;
    }
  };

  const handleScanAgain = () => {
    console.log('[BarcodeScan] Scan again requested');
    setScannedCode(null);
    setErrorMessage(null);
    setScanState('scanning');
    isProcessingRef.current = false;
  };

  const handleSearchLibrary = () => {
    console.log('[BarcodeScan] Navigating to search library');
    router.replace({
      pathname: '/food-search',
      params: {
        meal: mealType,
        date: date,
      },
    });
  };

  const handleQuickAdd = () => {
    console.log('[BarcodeScan] Navigating to quick add');
    router.replace({
      pathname: '/quick-add',
      params: {
        meal: mealType,
        date: date,
      },
    });
  };

  // Permission not determined yet
  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.messageText, { color: isDark ? colors.textDark : colors.text }]}>
            Loading camera...
          </Text>
        </View>
      </View>
    );
  }

  // Permission not granted
  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Scan Barcode
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.centerContent}>
          <Text style={[styles.permissionIcon, { color: isDark ? colors.textDark : colors.text }]}>
            📷
          </Text>
          <Text style={[styles.permissionTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Camera Permission Required
          </Text>
          <Text style={[styles.permissionMessage, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            We need access to your camera to scan barcodes
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading state
  if (scanState === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            Searching product...
          </Text>
          {scannedCode && (
            <Text style={[styles.loadingSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Barcode: {scannedCode}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Not found state
  if (scanState === 'not-found') {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Product Not Found
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.centerContent}>
          <Text style={styles.notFoundIcon}>🔍</Text>
          <Text style={[styles.notFoundTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Product Not Found
          </Text>
          <Text style={[styles.notFoundMessage, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            We couldn&apos;t find this product in OpenFoodFacts database
          </Text>
          {scannedCode && (
            <Text style={[styles.notFoundBarcode, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Barcode: {scannedCode}
            </Text>
          )}

          <View style={styles.notFoundButtons}>
            <TouchableOpacity
              style={[styles.notFoundButton, { backgroundColor: colors.primary }]}
              onPress={handleScanAgain}
            >
              <IconSymbol
                ios_icon_name="barcode.viewfinder"
                android_material_icon_name="qr_code_scanner"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.notFoundButtonText}>Scan Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.notFoundButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderWidth: 1, borderColor: colors.primary }]}
              onPress={handleSearchLibrary}
            >
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.notFoundButtonTextAlt, { color: colors.primary }]}>Search Library</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.notFoundButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderWidth: 1, borderColor: colors.primary }]}
              onPress={handleQuickAdd}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.notFoundButtonTextAlt, { color: colors.primary }]}>Quick Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Error state
  if (scanState === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Error
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Something Went Wrong
          </Text>
          <Text style={[styles.errorMessage, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            {errorMessage || 'An unexpected error occurred'}
          </Text>

          <View style={styles.errorButtons}>
            <TouchableOpacity
              style={[styles.errorButton, { backgroundColor: colors.primary }]}
              onPress={handleScanAgain}
            >
              <Text style={styles.errorButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.errorButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderWidth: 1, borderColor: colors.primary }]}
              onPress={handleSearchLibrary}
            >
              <Text style={[styles.errorButtonTextAlt, { color: colors.primary }]}>Search Manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Scanning state - show camera
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: [
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
            'code128',
            'code39',
            'qr',
          ],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      >
        {/* Header overlay */}
        <View style={styles.cameraHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cameraBackButton}>
            <View style={styles.cameraBackButtonInner}>
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="arrow_back"
                size={24}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Scanning frame */}
        <View style={styles.scanningFrame}>
          <View style={styles.frameCornerTopLeft} />
          <View style={styles.frameCornerTopRight} />
          <View style={styles.frameCornerBottomLeft} />
          <View style={styles.frameCornerBottomRight} />
        </View>

        {/* Instruction text */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            Position barcode within the frame
          </Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    zIndex: 10,
  },
  cameraBackButton: {
    width: 44,
    height: 44,
  },
  cameraBackButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningFrame: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    height: 200,
  },
  frameCornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFFFFF',
  },
  frameCornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFFFFF',
  },
  frameCornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFFFFF',
  },
  frameCornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFFFFF',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  messageText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  permissionIcon: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  permissionMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  permissionButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    ...typography.h3,
    marginTop: spacing.lg,
  },
  loadingSubtext: {
    ...typography.caption,
    marginTop: spacing.sm,
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
  notFoundMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  notFoundBarcode: {
    ...typography.caption,
    marginBottom: spacing.xl,
    fontStyle: 'italic',
  },
  notFoundButtons: {
    width: '100%',
    gap: spacing.md,
  },
  notFoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  notFoundButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  notFoundButtonTextAlt: {
    fontSize: 16,
    fontWeight: '600',
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
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorButtons: {
    width: '100%',
    gap: spacing.md,
  },
  errorButton: {
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorButtonTextAlt: {
    fontSize: 16,
    fontWeight: '600',
  },
});
