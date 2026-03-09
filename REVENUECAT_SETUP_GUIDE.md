
# 🚀 RevenueCat Integration Setup Guide

Esta guía te ayudará a configurar RevenueCat como intermediario para las compras in-app en tu aplicación.

## 📋 Requisitos Previos

1. **Cuenta de RevenueCat**: Crea una cuenta gratuita en [RevenueCat](https://www.revenuecat.com/)
2. **App Store Connect / Google Play Console**: Productos IAP ya creados
3. **Supabase**: Base de datos configurada (ya está lista)

---

## 🔧 Paso 1: Configurar RevenueCat Dashboard

### 1.1 Crear un Proyecto en RevenueCat

1. Ve a [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Haz clic en **"Create new project"**
3. Nombre del proyecto: `Elite Macro Tracker` (o el nombre de tu app)
4. Selecciona la plataforma: **iOS** y/o **Android**

### 1.2 Conectar App Store Connect (iOS)

1. En RevenueCat Dashboard, ve a **Project Settings** → **Apple App Store**
2. Haz clic en **"Connect to App Store Connect"**
3. Necesitarás crear una **App Store Connect API Key**:
   - Ve a [App Store Connect](https://appstoreconnect.apple.com/)
   - **Users and Access** → **Keys** → **App Store Connect API**
   - Haz clic en **"+"** para crear una nueva key
   - Nombre: `RevenueCat Integration`
   - Rol: **Admin** (o **App Manager**)
   - Descarga el archivo `.p8` (solo se puede descargar una vez)
   - Copia el **Key ID** y el **Issuer ID**
4. Vuelve a RevenueCat y pega:
   - **Key ID**
   - **Issuer ID**
   - Sube el archivo `.p8`
5. Selecciona tu **Bundle ID** de la lista

### 1.3 Conectar Google Play Console (Android)

1. En RevenueCat Dashboard, ve a **Project Settings** → **Google Play Store**
2. Haz clic en **"Connect to Google Play"**
3. Necesitarás crear una **Service Account**:
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Selecciona tu proyecto (o créalo)
   - **IAM & Admin** → **Service Accounts** → **Create Service Account**
   - Nombre: `RevenueCat Integration`
   - Rol: **Pub/Sub Admin**
   - Crea una **JSON key** y descárgala
4. Ve a [Google Play Console](https://play.google.com/console/)
   - **Setup** → **API access**
   - Vincula tu Service Account
   - Otorga permisos: **View financial data**, **Manage orders and subscriptions**
5. Vuelve a RevenueCat y sube el archivo JSON

---

## 🎁 Paso 2: Configurar Productos y Entitlements

### 2.1 Crear Entitlements

Los **Entitlements** son las características premium que desbloqueas (ej: "premium").

1. En RevenueCat Dashboard, ve a **Entitlements**
2. Haz clic en **"+ New"**
3. **Identifier**: `premium` (IMPORTANTE: debe ser exactamente "premium")
4. **Display Name**: `Premium Access`
5. Guarda

### 2.2 Crear Productos

1. Ve a **Products** en RevenueCat Dashboard
2. Haz clic en **"+ New"**
3. Configura el producto mensual:
   - **Identifier**: `monthly_premium`
   - **Display Name**: `Monthly Premium`
   - **App Store Product ID**: `Monthly_MG` (el ID que creaste en App Store Connect)
   - **Google Play Product ID**: `Monthly_MG` (el ID que creaste en Google Play Console)
4. Repite para el producto anual:
   - **Identifier**: `yearly_premium`
   - **Display Name**: `Yearly Premium`
   - **App Store Product ID**: `Yearly_MG`
   - **Google Play Product ID**: `Yearly_MG`

### 2.3 Crear Offerings

Los **Offerings** agrupan productos para mostrarlos en tu app.

1. Ve a **Offerings** en RevenueCat Dashboard
2. Haz clic en **"+ New"**
3. **Identifier**: `default` (IMPORTANTE: debe ser "default")
4. **Display Name**: `Default Offering`
5. Marca como **Current Offering**
6. Agrega los paquetes:
   - **Monthly Package**:
     - **Identifier**: `$rc_monthly` (RevenueCat usa este formato automáticamente)
     - **Product**: `monthly_premium`
     - **Entitlement**: `premium`
   - **Annual Package**:
     - **Identifier**: `$rc_annual`
     - **Product**: `yearly_premium`
     - **Entitlement**: `premium`
7. Guarda

---

## 🔑 Paso 3: Obtener API Keys

### 3.1 API Keys de RevenueCat

1. En RevenueCat Dashboard, ve a **Project Settings** → **API Keys**
2. Copia las siguientes keys:
   - **iOS Public SDK Key**: `appl_XXXXXXXXXXXXXXXX`
   - **Android Public SDK Key**: `goog_XXXXXXXXXXXXXXXX`
   - **Public API Key** (para webhooks): `sk_XXXXXXXXXXXXXXXX`

### 3.2 Configurar en el Código

Abre el archivo `app/subscription.tsx` y reemplaza las API keys:

```typescript
// Línea ~95
const apiKey = Platform.select({
  ios: 'appl_XXXXXXXXXXXXXXXX', // ← Pega tu iOS Public SDK Key aquí
  android: 'goog_XXXXXXXXXXXXXXXX', // ← Pega tu Android Public SDK Key aquí
});
```

---

## 🔗 Paso 4: Configurar Webhooks (Sincronización con Supabase)

Los webhooks permiten que RevenueCat notifique a tu backend cuando hay cambios en las suscripciones.

### 4.1 Obtener URL del Webhook

Tu webhook de Supabase ya está desplegado en:
```
https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook
```

### 4.2 Configurar en RevenueCat

1. En RevenueCat Dashboard, ve a **Integrations** → **Webhooks**
2. Haz clic en **"+ Add Webhook"**
3. **Webhook URL**: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook`
4. **Authorization Header**: `Bearer YOUR_SUPABASE_ANON_KEY`
   - Obtén tu Supabase Anon Key desde [Supabase Dashboard](https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/settings/api)
5. **Events to Send**: Selecciona todos (recomendado):
   - ✅ Initial Purchase
   - ✅ Renewal
   - ✅ Cancellation
   - ✅ Uncancellation
   - ✅ Non Renewing Purchase
   - ✅ Expiration
   - ✅ Billing Issue
   - ✅ Product Change
6. Guarda

### 4.3 Probar el Webhook

1. En RevenueCat Dashboard, ve a **Integrations** → **Webhooks**
2. Haz clic en **"Send Test"** junto a tu webhook
3. Verifica que el estado sea **200 OK**
4. Si falla, revisa:
   - La URL del webhook es correcta
   - El Authorization header tiene el Supabase Anon Key correcto
   - El Edge Function está desplegado en Supabase

---

## 📱 Paso 5: Configurar App Store Connect / Google Play Console

### 5.1 iOS - App Store Connect

1. Ve a [App Store Connect](https://appstoreconnect.apple.com/)
2. Selecciona tu app
3. **Features** → **In-App Purchases**
4. Verifica que los productos existan:
   - **Product ID**: `Monthly_MG`
   - **Type**: Auto-Renewable Subscription
   - **Subscription Group**: Crea uno si no existe (ej: "Premium Subscriptions")
   - **Price**: $9.99/month
   - **Product ID**: `Yearly_MG`
   - **Type**: Auto-Renewable Subscription
   - **Price**: $79.99/year
5. **Submit for Review** si aún no están aprobados

### 5.2 Android - Google Play Console

1. Ve a [Google Play Console](https://play.google.com/console/)
2. Selecciona tu app
3. **Monetize** → **Subscriptions**
4. Verifica que los productos existan:
   - **Product ID**: `Monthly_MG`
   - **Billing Period**: 1 month
   - **Price**: $9.99
   - **Product ID**: `Yearly_MG`
   - **Billing Period**: 1 year
   - **Price**: $79.99
5. **Activate** los productos

---

## 🧪 Paso 6: Probar las Compras

### 6.1 Sandbox Testing (iOS)

1. En tu iPhone/iPad, ve a **Settings** → **App Store** → **Sandbox Account**
2. Crea una cuenta de prueba en [App Store Connect](https://appstoreconnect.apple.com/):
   - **Users and Access** → **Sandbox Testers** → **"+"**
   - Email: `test@example.com` (usa un email que no exista)
   - Contraseña: Crea una segura
3. Inicia sesión con la cuenta sandbox en tu dispositivo
4. Abre tu app y prueba la compra
5. Verifica en RevenueCat Dashboard → **Customers** que aparezca la compra

### 6.2 Test Purchases (Android)

1. En Google Play Console, ve a **Setup** → **License Testing**
2. Agrega tu email de Google a la lista de testers
3. Descarga tu app desde Google Play (versión internal testing)
4. Prueba la compra (será gratis para testers)
5. Verifica en RevenueCat Dashboard → **Customers** que aparezca la compra

---

## ✅ Paso 7: Verificar la Integración

### 7.1 Checklist de Verificación

- [ ] RevenueCat Dashboard configurado
- [ ] App Store Connect / Google Play Console conectados
- [ ] Entitlement "premium" creado
- [ ] Productos creados y vinculados
- [ ] Offering "default" configurado con paquetes
- [ ] API Keys copiadas en `app/subscription.tsx`
- [ ] Webhook configurado y probado
- [ ] Productos aprobados en App Store Connect / Google Play Console
- [ ] Compra de prueba exitosa en sandbox
- [ ] Usuario aparece como premium en la app después de comprar

### 7.2 Verificar en la App

1. Abre la app en un dispositivo físico (no simulador)
2. Ve a **Profile** → **Go Premium**
3. Deberías ver:
   - Los precios correctos cargados desde RevenueCat
   - Botón "Subscribe Now" habilitado
4. Haz una compra de prueba
5. Verifica que:
   - La compra se complete sin errores
   - El usuario sea marcado como premium en la app
   - Aparezca en RevenueCat Dashboard → **Customers**
   - Se cree un registro en Supabase → **subscriptions** table

---

## 🐛 Troubleshooting

### Problema: "No packages available"

**Causa**: RevenueCat no puede cargar los productos.

**Solución**:
1. Verifica que los productos estén creados en App Store Connect / Google Play Console
2. Verifica que los Product IDs coincidan exactamente en RevenueCat
3. Espera 24 horas después de crear productos (sincronización de Apple/Google)
4. Verifica que el Offering "default" esté marcado como "Current"

### Problema: "Configuration Required"

**Causa**: Las API Keys no están configuradas en el código.

**Solución**:
1. Abre `app/subscription.tsx`
2. Reemplaza `YOUR_IOS_API_KEY_HERE` y `YOUR_ANDROID_API_KEY_HERE` con tus keys reales

### Problema: "Purchase completed but no premium entitlement found"

**Causa**: El Entitlement no está vinculado correctamente al producto.

**Solución**:
1. Ve a RevenueCat Dashboard → **Offerings**
2. Verifica que cada paquete tenga el Entitlement "premium" asignado
3. Guarda y espera unos minutos para que se sincronice

### Problema: Webhook no funciona

**Causa**: URL incorrecta o Authorization header faltante.

**Solución**:
1. Verifica la URL: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook`
2. Verifica el Authorization header: `Bearer YOUR_SUPABASE_ANON_KEY`
3. Prueba el webhook con "Send Test" en RevenueCat Dashboard
4. Revisa los logs en Supabase Dashboard → **Edge Functions** → **revenuecat-webhook**

---

## 📊 Monitoreo y Analytics

### RevenueCat Dashboard

- **Customers**: Ver todos los usuarios y sus suscripciones
- **Charts**: Ingresos, nuevos suscriptores, churn rate
- **Events**: Historial de eventos de compra

### Supabase Dashboard

- **subscriptions** table: Estado de suscripciones de cada usuario
- **revenuecat_events** table: Historial completo de eventos para auditoría

---

## 🎉 ¡Listo!

Tu app ahora está completamente integrada con RevenueCat. Los usuarios pueden:

1. Ver los planes de suscripción con precios reales
2. Comprar suscripciones a través de RevenueCat
3. Restaurar compras previas
4. Acceder a funciones premium automáticamente

RevenueCat se encarga de:
- Validación de recibos con Apple/Google
- Renovaciones automáticas
- Cancelaciones y reembolsos
- Sincronización con tu backend vía webhooks
- Analytics y reportes

---

## 📚 Recursos Adicionales

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [RevenueCat React Native SDK](https://docs.revenuecat.com/docs/reactnative)
- [App Store Connect Guide](https://developer.apple.com/app-store-connect/)
- [Google Play Console Guide](https://support.google.com/googleplay/android-developer/)

---

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs en la app (busca `[RevenueCat]` en la consola)
2. Revisa RevenueCat Dashboard → **Customers** → busca tu usuario
3. Revisa Supabase Dashboard → **Edge Functions** → **revenuecat-webhook** logs
4. Contacta a RevenueCat Support (responden rápido y son muy útiles)
