
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';

export default function BarcodeScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mode = (params.mode as string) || 'diary';
  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  const myMealId = (params.mealId as string) || undefined;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('[BarcodeScanner] Component mounted');
    console.log('[BarcodeScanner] Params:', { mode, mealType, date, myMealId });
  }, []);

  // Handle permission request
  useEffect(() => {
    if (permission && !permission.granted && !permission.canAskAgain) {
      console.log('[BarcodeScanner] Camera permission denied permanently');
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access in your device settings to scan barcodes.',
        [
          {
            text: 'Go Back',
            onPress: () => router.back(),
          },
        ]
      );
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) {
      console.log('[BarcodeScanner] Already processing a scan, ignoring');
      return;
    }

    console.log('[BarcodeScanner] ========== BARCODE SCANNED ==========');
    console.log('[BarcodeScanner] Type:', type);
    console.log('[BarcodeScanner] Data:', data);

    setScanned(true);
    setLoading(true);

    try {
      // Fetch product from Open Food Facts API
      console.log('[BarcodeScanner] Fetching product from Open Food Facts...');
      const url = `https://world.openfoodfacts.org/api/v0/product/${data}.json`;
      console.log('[BarcodeScanner] URL:', url);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'EliteMacroTracker/1.0 (iOS)',
        },
      });

      console.log('[BarcodeScanner] Response status:', response.status);

      if (!response.ok) {
        console.error('[BarcodeScanner] HTTP error:', response.status);
        throw new Error('Network error');
      }

      const result = await response.json();
      console.log('[BarcodeScanner] Response data:', {
        status: result.status,
        hasProduct: !!result.product,
      });

      // Check if product was found
      if (result.status === 1 && result.product) {
        console.log('[BarcodeScanner] ✅ Product found:', result.product.product_name);

        // Navigate to food details screen with the product data
        router.push({
          pathname: '/food-details',
          params: {
            offData: JSON.stringify(result.product),
            meal: mealType,
            date: date,
            mode: mode,
            returnTo: '/add-food',
            mealId: myMealId,
          },
        });
      } else {
        console.log('[BarcodeScanner] ❌ Product not found in database');
        
        // Show "not found" dialog with options
        Alert.alert(
          'Product Not Found',
          'We couldn\'t find this barcode in our database.',
          [
            {
              text: 'Try Again',
              onPress: () => {
                console.log('[BarcodeScanner] User chose to try again');
                setScanned(false);
                setLoading(false);
              },
            },
            {
              text: 'Add Manually',
              onPress: () => {
                console.log('[BarcodeScanner] User chose to add manually');
                router.replace({
                  pathname: '/quick-add',
                  params: {
                    meal: mealType,
                    date: date,
                    mode: mode,
                    mealId: myMealId,
                    barcode: data,
                  },
                });
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                console.log('[BarcodeScanner] User cancelled');
                router.back();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('[BarcodeScanner] Error fetching product:', error);
      
      Alert.alert(
        'Error',
        'Could not look up this barcode. Please check your internet connection and try again.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              console.log('[BarcodeScanner] User chose to retry after error');
              setScanned(false);
              setLoading(false);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              console.log('[BarcodeScanner] User cancelled after error');
              router.back();
            },
          },
        ]
      );
    }
  };

  // Show loading while checking permissions
  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            Checking camera permissions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show permission request screen
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
            Barcode Scanner
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
          <Text style={[styles.permissionTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            We need access to your camera to scan barcodes and find food products.
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: isDark ? colors.textDark : colors.text }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show camera view
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]} edges={['top']}>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        {/* Overlay with scanning frame */}
        <View style={styles.overlay}>
          {/* Top overlay */}
          <View style={styles.overlayTop}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={28}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          {/* Middle with scanning frame */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlayLeft} />
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            <View style={styles.overlayRight} />
          </View>

          {/* Bottom overlay with instructions */}
          <View style={styles.overlayBottom}>
            {loading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingOverlayText}>Looking up product...</Text>
              </View>
            ) : (
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsText}>
                  Align the barcode within the frame
                </Text>
                <Text style={styles.instructionsSubtext}>
                  The barcode will be scanned automatically
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  permissionTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  permissionText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  permissionButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingTop: Platform.OS === 'android' ? spacing.lg : spacing.md,
    paddingHorizontal: spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: 250,
  },
  overlayLeft: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanFrame: {
    width: 280,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
    borderWidth: 4,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: borderRadius.lg,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: borderRadius.lg,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: borderRadius.lg,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: borderRadius.lg,
  },
  overlayRight: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  instructionsContainer: {
    alignItems: 'center',
  },
  instructionsText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  instructionsSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingOverlay: {
    alignItems: 'center',
  },
  loadingOverlayText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.md,
  },
});
