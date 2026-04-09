import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import { apiGet } from '@/utils/api';
import { Food } from '@/types';
import { X } from 'lucide-react-native';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

export default function BarcodeScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ meal_type?: string; date?: string }>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Camera = require('expo-camera');
        const { status } = await Camera.Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch {
        setHasPermission(false);
      }
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || looking) return;
    console.log('[BarcodeScanner] Barcode scanned:', data);
    setScanned(true);
    setLooking(true);
    try {
      let food: Food | null = null;

      // Try custom foods first
      try {
        const customRes = await apiGet<{ food: Food }>(`${API_BASE}/api/foods/barcode/${data}`);
        if (customRes.food) food = customRes.food;
      } catch {
        // not found in custom foods
      }

      // Try OpenFoodFacts
      if (!food) {
        const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${data}.json`);
        if (offRes.ok) {
          const offData = await offRes.json();
          if (offData.status === 1 && offData.product) {
            const p = offData.product;
            const n = p.nutriments ?? {};
            food = {
              id: `off-${data}`,
              name: p.product_name ?? 'Unknown Product',
              brand: p.brands,
              calories: Number(n['energy-kcal_100g']) || 0,
              protein: Number(n['proteins_100g']) || 0,
              carbs: Number(n['carbohydrates_100g']) || 0,
              fat: Number(n['fat_100g']) || 0,
              serving_size: 100,
              serving_unit: 'g',
              barcode: data,
              is_custom: false,
            };
          }
        }
      }

      if (food) {
        router.replace({
          pathname: '/food-details',
          params: {
            food: JSON.stringify(food),
            meal_type: params.meal_type ?? 'breakfast',
            date: params.date ?? new Date().toISOString().split('T')[0],
          },
        });
      } else {
        Alert.alert(
          'Not Found',
          `No food found for barcode ${data}. Would you like to create a custom food?`,
          [
            { text: 'Cancel', onPress: () => { setScanned(false); setLooking(false); } },
            { text: 'Create Food', onPress: () => router.push('/my-foods-create') },
          ]
        );
      }
    } catch (err) {
      console.error('[BarcodeScanner] Lookup error:', err);
      Alert.alert('Error', 'Failed to look up barcode. Please try again.', [
        { text: 'OK', onPress: () => { setScanned(false); setLooking(false); } },
      ]);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: 32 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center' }}>
          Camera permission required
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 }}>
          Please enable camera access in Settings to scan barcodes
        </Text>
        <AnimatedPressable
          onPress={() => router.back()}
          style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
        </AnimatedPressable>
      </View>
    );
  }

  let CameraView: React.ComponentType<{
    style?: object;
    onBarcodeScanned?: (data: { data: string }) => void;
    barcodeScannerSettings?: object;
  }> | null = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const CameraModule = require('expo-camera');
    CameraView = CameraModule.CameraView ?? CameraModule.Camera;
  } catch {
    CameraView = null;
  }

  if (!CameraView) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
        <Text style={{ color: COLORS.danger }}>Camera not available</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Scan Barcode', headerTransparent: true }} />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={{ flex: 1 }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] }}
        />

        {/* Overlay */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 260,
              height: 160,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: COLORS.primary,
            }}
          />
          <Text style={{ color: '#fff', marginTop: 20, fontSize: 14, fontWeight: '500' }}>
            {looking ? 'Looking up barcode...' : 'Point camera at barcode'}
          </Text>
          {looking && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} />}
        </View>

        {/* Close button */}
        <AnimatedPressable
          onPress={() => router.back()}
          style={{
            position: 'absolute',
            top: insets.top + 60,
            right: 20,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} color="#fff" />
        </AnimatedPressable>
      </View>
    </>
  );
}
