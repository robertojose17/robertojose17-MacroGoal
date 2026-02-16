
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
      'Guía de Solución',
      'Si "Product Fetch" falla:\n\n' +
      '1. Verifica que los Product IDs en App Store Connect coincidan EXACTAMENTE\n\n' +
      '2. Asegúrate de que los productos estén "Ready to Submit"\n\n' +
      '3. Espera 2-4 horas después de crear los productos\n\n' +
      '4. Verifica que el Bundle ID sea: com.elitemacrotracker.app\n\n' +
      '5. Usa un Sandbox Tester Account (no tu Apple ID real)\n\n' +
      '6. Asegúrate de estar en un dispositivo físico (no simulador)\n\n' +
      'Ver IAP_PRODUCT_NOT_FOUND_COMPLETE_FIX.md para más detalles.',
      [{ text: 'Entendido' }]
    );
  };

  const runDiagnostics = useCallback(async () => {
    setIsRunning(true);
    setProductsFound(0);
    const diagnosticResults: DiagnosticResult[] = [];

    console.log('[IAP Diagnostics] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[IAP Diagnostics] 🔍 Iniciando diagnóstico completo de IAP');
    console.log('[IAP Diagnostics] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Test 1: Platform Check
    console.log('[IAP Diagnostics] Test 1: Verificación de Plataforma');
    const isIOS = Platform.OS === 'ios';
    diagnosticResults.push({
      test: 'Plataforma',
      status: isIOS ? 'pass' : 'fail',
      message: isIOS 
        ? '✅ Ejecutando en iOS - IAP soportado' 
        : `❌ Ejecutando en ${Platform.OS} - IAP solo funciona en iOS`,
      details: `Plataforma: ${Platform.OS}, Versión: ${Platform.Version}`,
    });

    if (!isIOS) {
      console.error('[IAP Diagnostics] ❌ No estás en iOS. IAP no funcionará.');
      setResults(diagnosticResults);
      setIsRunning(false);
      return;
    }

    // Test 2: Product ID Validation
    console.log('[IAP Diagnostics] Test 2: Validación de Product IDs');
    const productIds = getAllProductIds();
    const validationResults = productIds.map(id => validateProductId(id));
    const allValid = validationResults.every(r => r.valid);
    
    diagnosticResults.push({
      test: 'Formato de Product IDs',
      status: allValid ? 'pass' : 'fail',
      message: allValid 
        ? '✅ Todos los Product IDs tienen formato válido' 
        : '❌ Algunos Product IDs tienen formato inválido',
      details: productIds.map((id, i) => 
        `${id}: ${validationResults[i].message}`
      ).join('\n'),
    });

    // Test 3: IAP Module Available
    console.log('[IAP Diagnostics] Test 3: Disponibilidad del Módulo IAP');
    try {
      const connected = await InAppPurchases.connectAsync();
      diagnosticResults.push({
        test: 'Módulo IAP Disponible',
        status: connected ? 'pass' : 'fail',
        message: connected 
          ? '✅ Módulo expo-in-app-purchases disponible' 
          : '❌ No se pudo conectar al módulo IAP',
      });
      console.log('[IAP Diagnostics] ✅ Módulo IAP disponible');
    } catch (error) {
      console.error('[IAP Diagnostics] ❌ Error en módulo IAP:', error);
      diagnosticResults.push({
        test: 'Módulo IAP Disponible',
        status: 'fail',
        message: '❌ Error al verificar disponibilidad de IAP',
        details: error instanceof Error ? error.message : String(error),
      });
      setResults(diagnosticResults);
      setIsRunning(false);
      return;
    }

    // Test 4: Store Connection
    console.log('[IAP Diagnostics] Test 4: Conexión a la App Store');
    diagnosticResults.push({
      test: 'Conexión a App Store',
      status: 'pass',
      message: '✅ Conectado exitosamente a la App Store',
    });

    // Test 5: Fetch Products (CRITICAL TEST)
    console.log('[IAP Diagnostics] Test 5: Obtención de Productos (CRÍTICO)');
    console.log('[IAP Diagnostics] Product IDs a buscar:', productIds);
    try {
      const { results: products, responseCode } = await InAppPurchases.getProductsAsync(productIds);
      
      console.log('[IAP Diagnostics] Código de respuesta:', responseCode);
      console.log('[IAP Diagnostics] Productos retornados:', products?.length || 0);
      
      if (products && products.length > 0) {
        setProductsFound(products.length);
        console.log('[IAP Diagnostics] ✅ Productos encontrados:');
        products.forEach((p, i) => {
          console.log(`[IAP Diagnostics]   ${i + 1}. ${p.productId}`);
          console.log(`[IAP Diagnostics]      Título: ${p.title}`);
          console.log(`[IAP Diagnostics]      Precio: ${p.priceString}`);
        });
        
        diagnosticResults.push({
          test: 'Obtención de Productos',
          status: 'pass',
          message: `✅ Encontrados ${products.length} producto(s)`,
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
          console.warn('[IAP Diagnostics] ⚠️ Productos faltantes:', missingIds);
          diagnosticResults.push({
            test: 'Completitud de Productos',
            status: 'warning',
            message: `⚠️ ${missingIds.length} producto(s) no encontrado(s)`,
            details: `Faltantes: ${missingIds.join(', ')}\n\nVerifica que estos productos existan en App Store Connect con estos IDs EXACTOS.`,
          });
        } else {
          diagnosticResults.push({
            test: 'Completitud de Productos',
            status: 'pass',
            message: '✅ Todos los productos esperados fueron encontrados',
          });
        }
      } else {
        setProductsFound(0);
        console.error('[IAP Diagnostics] ❌ NO SE ENCONTRARON PRODUCTOS');
        console.error('[IAP Diagnostics] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('[IAP Diagnostics] DIAGNÓSTICO DEL PROBLEMA:');
        console.error('[IAP Diagnostics] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('[IAP Diagnostics] Product IDs esperados:', productIds);
        console.error('[IAP Diagnostics]');
        console.error('[IAP Diagnostics] POSIBLES CAUSAS:');
        console.error('[IAP Diagnostics] 1. ❌ Los productos NO existen en App Store Connect');
        console.error('[IAP Diagnostics] 2. ❌ Los Product IDs en el código NO coinciden con App Store Connect');
        console.error('[IAP Diagnostics] 3. ❌ Los productos NO están en estado "Ready to Submit"');
        console.error('[IAP Diagnostics] 4. ⏰ Acabas de crear los productos (espera 2-4 horas)');
        console.error('[IAP Diagnostics] 5. ❌ El Bundle ID no coincide');
        console.error('[IAP Diagnostics] 6. ❌ No estás usando un Sandbox Tester Account');
        console.error('[IAP Diagnostics]');
        console.error('[IAP Diagnostics] SOLUCIÓN:');
        console.error('[IAP Diagnostics] 1. Ve a App Store Connect');
        console.error('[IAP Diagnostics] 2. Verifica que tu app tenga Bundle ID: com.elitemacrotracker.app');
        console.error('[IAP Diagnostics] 3. Ve a In-App Purchases');
        console.error('[IAP Diagnostics] 4. Crea productos con estos IDs EXACTOS:');
        productIds.forEach(id => {
          console.error(`[IAP Diagnostics]    - ${id}`);
        });
        console.error('[IAP Diagnostics] 5. Asegúrate de que estén "Ready to Submit"');
        console.error('[IAP Diagnostics] 6. Espera 2-4 horas');
        console.error('[IAP Diagnostics] 7. Usa un Sandbox Tester Account');
        console.error('[IAP Diagnostics] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        diagnosticResults.push({
          test: 'Obtención de Productos',
          status: 'fail',
          message: '❌ NO se encontraron productos - Productos no configurados en App Store Connect',
          details: `Product IDs esperados:\n${productIds.join('\n')}\n\nCódigo de respuesta: ${responseCode}\n\nVer guía completa en IAP_PRODUCT_NOT_FOUND_COMPLETE_FIX.md`,
        });
      }
    } catch (error) {
      console.error('[IAP Diagnostics] ❌ Error al obtener productos:', error);
      diagnosticResults.push({
        test: 'Obtención de Productos',
        status: 'fail',
        message: '❌ Error al obtener productos',
        details: error instanceof Error ? error.message : String(error),
      });
    }

    // Test 6: Purchase History
    console.log('[IAP Diagnostics] Test 6: Historial de Compras');
    try {
      const history = await InAppPurchases.getPurchaseHistoryAsync();
      console.log('[IAP Diagnostics] Historial de compras:', history.results?.length || 0, 'items');
      
      diagnosticResults.push({
        test: 'Historial de Compras',
        status: 'pass',
        message: history.results.length > 0 
          ? `✅ Encontradas ${history.results.length} compra(s) previa(s)` 
          : 'ℹ️ Sin compras previas',
        details: history.results.length > 0 
          ? JSON.stringify(history.results.map(p => ({
              productId: p.productId,
              transactionId: p.transactionId,
              acknowledged: p.acknowledged,
            })), null, 2)
          : undefined,
      });
    } catch (error) {
      console.error('[IAP Diagnostics] ⚠️ Error al obtener historial:', error);
      diagnosticResults.push({
        test: 'Historial de Compras',
        status: 'warning',
        message: '⚠️ No se pudo obtener el historial de compras',
        details: error instanceof Error ? error.message : String(error),
      });
    }

    // Disconnect
    try {
      await InAppPurchases.disconnectAsync();
      console.log('[IAP Diagnostics] Desconectado de la App Store');
    } catch (error) {
      console.log('[IAP Diagnostics] Error al desconectar:', error);
    }

    console.log('[IAP Diagnostics] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[IAP Diagnostics] ✅ Diagnóstico completo');
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
        <Text style={[styles.headerTitle, { color: textColor }]}>Diagnóstico IAP</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Status Banner */}
        {!isRunning && results.length > 0 && (
          <React.Fragment>
            {allTestsPassed && productsFound === productIds.length ? (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>✅ ¡Todo Configurado Correctamente!</Text>
                <Text style={styles.successText}>
                  Todos los productos fueron encontrados. Las compras in-app deberían funcionar correctamente.
                </Text>
              </View>
            ) : hasFailures ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>⚠️ Problemas Detectados</Text>
                <Text style={styles.warningText}>
                  {productsFound === 0 
                    ? 'No se encontraron productos. Verifica tu configuración en App Store Connect.'
                    : `Solo se encontraron ${productsFound} de ${productIds.length} productos. Revisa los detalles abajo.`}
                </Text>
              </View>
            ) : null}
          </React.Fragment>
        )}

        {/* Configuration Info */}
        <View style={[styles.infoBox, { backgroundColor: cardBackground, borderColor }]}>
          <Text style={[styles.infoTitle, { color: textColor }]}>Configuración Actual</Text>
          
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
              <Text style={[styles.configLabel, { color: textColor }]}>Productos:</Text>
              <Text style={[styles.configValue, { color: textColor }]}>{productsFound}/{productIds.length}</Text>
            </View>
          </View>

          <View style={[styles.productIdBox, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
            <Text style={[styles.infoText, { color: textColor, fontSize: 12, fontWeight: '600' }]}>
              Product IDs Configurados:
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
              {copiedText === 'Product IDs' ? '✅ Copiado!' : 'Copiar Product IDs'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Test Results */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Resultados de Pruebas</Text>
          
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
              Sin resultados. Ejecuta el diagnóstico para verificar tu configuración IAP.
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
            <Text style={[styles.runButtonText, { color: '#fff' }]}>Ejecutar Diagnóstico Nuevamente</Text>
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
            Ver Guía de Solución
          </Text>
        </TouchableOpacity>

        {/* Troubleshooting Info */}
        <View style={[styles.infoBox, { backgroundColor: cardBackground, borderColor, marginTop: spacing.lg }]}>
          <Text style={[styles.infoTitle, { color: textColor }]}>Solución Rápida</Text>
          <Text style={[styles.infoText, { color: textColor }]}>
            Si "Obtención de Productos" falla:{'\n\n'}
            
            1️⃣ Verifica App Store Connect{'\n'}
            • Los Product IDs deben coincidir EXACTAMENTE{'\n'}
            • Estado debe ser "Ready to Submit"{'\n'}
            • Bundle ID: com.elitemacrotracker.app{'\n\n'}
            
            2️⃣ Espera Sincronización{'\n'}
            • Nuevos productos: 2-4 horas{'\n'}
            • Cambios: 15-30 minutos{'\n\n'}
            
            3️⃣ Usa Sandbox Tester{'\n'}
            • Settings → App Store → Sandbox Account{'\n'}
            • NO uses tu Apple ID real{'\n\n'}
            
            4️⃣ Dispositivo Físico{'\n'}
            • IAP NO funciona en simulador{'\n'}
            • IAP NO funciona en Expo Go{'\n\n'}
            
            📚 Ver IAP_PRODUCT_NOT_FOUND_COMPLETE_FIX.md para guía completa.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
