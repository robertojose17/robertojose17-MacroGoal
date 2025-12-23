
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';

/**
 * BARCODE SCANNER SCREEN
 * 
 * MyFitnessPal-style flow:
 * 1. Open camera
 * 2. Scan barcode ONCE
 * 3. Immediately close camera
 * 4. Navigate to lookup handler screen
 * 
 * NO API CALLS HERE - just scan and pass barcode to next screen
 */
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
  
  // One-scan lock using ref (doesn't cause re-renders)
  const hasScannedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    console.log('[BarcodeScanner] ========== COMPONENT MOUNTED ==========');
    console.log('[BarcodeScanner] Params:', { mode, mealType, date, myMealId });
    isMountedRef.current = true;

    return () => {
      console.log('[BarcodeScanner] ========== COMPONENT UNMOUNTED ==========');
      isMountedRef.current = false;
    };
  }, [mode, mealType, date, myMealId]);

  // Reset state when screen gains focus
  useFocusEffect(
    useCallback(() => {
      console.log('[BarcodeScanner] Screen focused → reset scan state');
      hasScannedRef.current = false;

      return () => {
        console.log('[BarcodeScanner] Screen unfocused');
      };
    }, [])
  );

  /**
   * Handle barcode scan
   * This function is called ONCE when a barcode is scanned
   * It immediately navigates to the lookup handler screen
   */
  const handleBarCodeScanned = useCallback(({ type, data }: { type: string; data: string }) => {
    // Check one-scan lock
    if (hasScannedRef.current) {
      console.log('[BarcodeScanner] ⚠️ Already scanned, ignoring duplicate scan');
      return;
    }

    // Check if component is still mounted
    if (!isMountedRef.current) {
      console.log('[BarcodeScanner] ⚠️ Component unmounted, ignoring scan');
      return;
    }

    console.log('[BarcodeScanner] ========== BARCODE SCANNED ==========');
    console.log('[BarcodeScanner] SCANNED BARCODE:', data);
    console.log('[BarcodeScanner] Type:', type);

    // Clean the barcode
    const cleanBarcode = data.trim();
    
    // Validate barcode
    if (!cleanBarcode || cleanBarcode.length === 0) {
      console.log('[BarcodeScanner] ❌ Empty barcode, ignoring');
      return;
    }

    // Set one-scan lock IMMEDIATELY
    hasScannedRef.current = true;
    console.log('[BarcodeScanner] ✅ One-scan lock activated');

    // Navigate to lookup handler screen
    console.log('[BarcodeScanner] 🚀 NAVIGATING TO BARCODE-LOOKUP');
    console.log('[BarcodeScanner] Barcode being passed:', cleanBarcode);
    console.log('[BarcodeScanner] Meal:', mealType);
    console.log('[BarcodeScanner] Date:', date);
    console.log('[BarcodeScanner] Mode:', mode);
    
    router.push({
      pathname: '/barcode-lookup',
      params: {
        barcode: cleanBarcode,
        meal: mealType,
        date: date,
        mode: mode,
        mealId: myMealId || '',
      },
    });
  }, [router, mealType, date, mode, myMealId]);

  // Show loading while checking permissions
  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
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
          onBarcodeScanned={hasScannedRef.current ? undefined : handleBarCodeScanned}
        />

        {/* Overlay with scanning frame */}
        <View style={styles.overlay}>
          {/* Top overlay */}
          <View style={styles.overlayTop}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                console.log('[BarcodeScanner] Close button pressed');
                hasScannedRef.current = false;
                router.back();
              }}
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
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsText}>
                Align the barcode within the frame
              </Text>
              <Text style={styles.instructionsSubtext}>
                The barcode will be scanned automatically
              </Text>
            </View>
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
});
