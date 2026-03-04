
# 🚀 Guía Paso a Paso: Configuración de In-App Purchases con RevenueCat

## 📋 Resumen
Esta guía te llevará paso a paso para configurar las compras dentro de la app (subscripciones) usando RevenueCat en tu app Elite Macro Tracker.

---

## ✅ PASO 1: Configurar Productos en App Store Connect (Apple)

### 1.1 Accede a App Store Connect
- Ve a [https://appstoreconnect.apple.com](https://appstoreconnect.apple.com)
- Inicia sesión con tu Apple Developer Account
- Selecciona tu app "Elite Macro Tracker"

### 1.2 Crea los Productos de Subscripción
1. Ve a **"My Apps"** → Tu App → **"Subscriptions"**
2. Haz clic en el botón **"+"** para crear un nuevo grupo de subscripciones
3. Nombre del grupo: `Premium Membership`
4. Crea dos productos:

**Producto 1: Subscripción Mensual**
- Product ID: `macro_goal_premium_monthly`
- Reference Name: `Premium Monthly`
- Subscription Duration: `1 Month`
- Price: Selecciona tu precio (ej: $9.99 USD)

**Producto 2: Subscripción Anual**
- Product ID: `macro_goal_premium_yearly`
- Reference Name: `Premium Yearly`
- Subscription Duration: `1 Year`
- Price: Selecciona tu precio (ej: $79.99 USD)

### 1.3 Completa la Información Requerida
Para cada producto, completa:
- **Subscription Display Name**: Nombre visible para usuarios
- **Description**: Descripción de los beneficios
- **Review Information**: Captura de pantalla y notas para Apple

### 1.4 Guarda y Espera Sincronización
- Haz clic en **"Save"**
- ⏰ **IMPORTANTE**: Apple tarda 2-4 horas en sincronizar los productos
- Los productos deben estar en estado **"Ready to Submit"**

---

## ✅ PASO 2: Configurar RevenueCat

### 2.1 Crea una Cuenta en RevenueCat
- Ve a [https://app.revenuecat.com](https://app.revenuecat.com)
- Regístrate con tu email
- Crea un nuevo proyecto: `Elite Macro Tracker`

### 2.2 Configura la App en RevenueCat
1. En el dashboard, ve a **"Apps"** → **"Add App"**
2. Selecciona **"iOS"**
3. Ingresa:
   - **App Name**: Elite Macro Tracker
   - **Bundle ID**: El Bundle ID de tu app (ej: `com.tuempresa.macrogoal`)
   - **Shared Secret**: Lo obtendrás en el siguiente paso

### 2.3 Obtén el Shared Secret de Apple
1. Regresa a App Store Connect
2. Ve a **"My Apps"** → Tu App → **"App Information"**
3. Scroll hasta **"App-Specific Shared Secret"**
4. Haz clic en **"Generate"** si no existe
5. Copia el código generado
6. Pégalo en RevenueCat en el campo **"Shared Secret"**

### 2.4 Copia las API Keys de RevenueCat
1. En RevenueCat, ve a **"API Keys"** en el menú lateral
2. Copia:
   - **Public iOS API Key** (empieza con `appl_...`)
   - **Public Android API Key** (si planeas Android)
3. **GUARDA ESTAS KEYS** - las necesitarás en el siguiente paso

---

## ✅ PASO 3: Configurar Productos en RevenueCat

### 3.1 Crea los Productos
1. En RevenueCat, ve a **"Products"** → **"Add Product"**
2. Crea dos productos que coincidan con App Store Connect:

**Producto 1:**
- **Product ID**: `macro_goal_premium_monthly` (debe coincidir exactamente)
- **Type**: Subscription
- **Duration**: 1 month

**Producto 2:**
- **Product ID**: `macro_goal_premium_yearly` (debe coincidir exactamente)
- **Type**: Subscription
- **Duration**: 1 year

### 3.2 Crea un Entitlement
1. Ve a **"Entitlements"** → **"Add Entitlement"**
2. Nombre: `premium`
3. Identifier: `premium`
4. Asocia ambos productos a este entitlement

### 3.3 Crea un Offering
1. Ve a **"Offerings"** → **"Add Offering"**
2. Identifier: `default`
3. Agrega ambos productos al offering
4. Marca uno como **"Default Package"** (recomendado: el anual)

---

## ✅ PASO 4: Configurar Variables de Entorno en tu App

### 4.1 Crea/Actualiza el archivo .env
Crea un archivo `.env` en la raíz de tu proyecto con:

```env
# RevenueCat API Keys
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_TuKeyAquí
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_TuKeyAquí

# Supabase (ya deberías tenerlas)
EXPO_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tuAnonKeyAquí
```

### 4.2 Verifica que las Keys estén correctas
- Las keys de RevenueCat empiezan con `appl_` (iOS) o `goog_` (Android)
- NO compartas estas keys públicamente

---

## ✅ PASO 5: Probar las Compras (Sandbox Testing)

### 5.1 Crea un Sandbox Tester en App Store Connect
1. Ve a **"Users and Access"** → **"Sandbox Testers"**
2. Haz clic en **"+"** para agregar un tester
3. Completa:
   - Email: Usa un email que NO esté asociado a ninguna Apple ID real
   - Password: Crea una contraseña segura
   - First/Last Name: Tu nombre
   - Country: Tu país
4. Guarda el tester

### 5.2 Configura tu Dispositivo iOS para Testing
1. En tu iPhone/iPad, ve a **Settings** → **App Store**
2. Scroll hasta **"Sandbox Account"**
3. Inicia sesión con el email del Sandbox Tester que creaste
4. **NO** uses tu Apple ID real para testing

### 5.3 Prueba la Compra en tu App
1. Abre tu app en el dispositivo de prueba
2. Ve a la pantalla de subscripción (Profile → Upgrade to Premium)
3. Selecciona un plan (mensual o anual)
4. Toca **"Subscribe"**
5. Verás un diálogo de confirmación que dice **"[Sandbox]"**
6. Confirma la compra
7. La compra debería completarse sin cargo real

### 5.4 Verifica en RevenueCat
1. Ve al dashboard de RevenueCat
2. En **"Customers"**, busca tu usuario (por email o ID)
3. Deberías ver la subscripción activa
4. Verifica que el entitlement `premium` esté activo

---

## ✅ PASO 6: Verificar la Integración con Supabase

### 6.1 Verifica que el Webhook esté Configurado
Tu app ya tiene configurado el webhook de RevenueCat → Supabase.
Verifica que la tabla `users` tenga la columna `user_type` actualizada a `'premium'`.

### 6.2 Prueba el Flujo Completo
1. Inicia sesión en tu app
2. Ve a Profile → deberías ver `user_type: 'free'`
3. Compra una subscripción
4. Regresa a Profile → deberías ver `user_type: 'premium'`
5. Las funciones premium deberían desbloquearse automáticamente

---

## ✅ PASO 7: Preparar para Producción

### 7.1 Antes de Publicar en App Store
- [ ] Verifica que todos los productos estén en estado **"Ready to Submit"**
- [ ] Completa toda la información de subscripción en App Store Connect
- [ ] Prueba exhaustivamente en Sandbox
- [ ] Verifica que el webhook de RevenueCat esté funcionando
- [ ] Configura las políticas de privacidad y términos de servicio

### 7.2 Después de la Aprobación
- [ ] Los productos se activarán automáticamente en producción
- [ ] Los usuarios reales podrán comprar subscripciones
- [ ] Monitorea el dashboard de RevenueCat para ver las compras

---

## 🆘 Solución de Problemas Comunes

### ❌ Error: "Product not found"
**Causa**: Los productos no están sincronizados en App Store Connect
**Solución**: 
- Espera 2-4 horas después de crear los productos
- Verifica que los Product IDs coincidan exactamente
- Asegúrate de estar usando un Sandbox Tester

### ❌ Error: "Cannot connect to iTunes Store"
**Causa**: No estás usando un Sandbox Tester
**Solución**:
- Cierra sesión de tu Apple ID real en Settings → App Store
- Inicia sesión con el Sandbox Tester

### ❌ La subscripción no se refleja en Supabase
**Causa**: El webhook no está configurado correctamente
**Solución**:
- Verifica que el webhook esté configurado en RevenueCat
- Revisa los logs de Supabase Edge Functions
- Verifica que la tabla `users` tenga la columna `user_type`

### ❌ Error: "Invalid API Key"
**Causa**: Las API Keys de RevenueCat son incorrectas
**Solución**:
- Verifica que las keys en `.env` sean correctas
- Asegúrate de usar la key de iOS (empieza con `appl_`)
- Reinicia el servidor de desarrollo después de cambiar `.env`

---

## 📚 Recursos Adicionales

- [Documentación de RevenueCat](https://docs.revenuecat.com)
- [Guía de Sandbox Testing de Apple](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_sandbox)
- [App Store Connect](https://appstoreconnect.apple.com)
- [RevenueCat Dashboard](https://app.revenuecat.com)

---

## ✅ Checklist Final

Antes de considerar la configuración completa, verifica:

- [ ] Productos creados en App Store Connect
- [ ] Productos sincronizados (2-4 horas de espera)
- [ ] Cuenta de RevenueCat creada
- [ ] App configurada en RevenueCat con Shared Secret
- [ ] Productos creados en RevenueCat (IDs coinciden)
- [ ] Entitlement `premium` creado
- [ ] Offering `default` creado
- [ ] API Keys copiadas al archivo `.env`
- [ ] Sandbox Tester creado en App Store Connect
- [ ] Dispositivo configurado con Sandbox Tester
- [ ] Compra de prueba exitosa
- [ ] Subscripción visible en RevenueCat
- [ ] `user_type` actualizado a `premium` en Supabase
- [ ] Funciones premium desbloqueadas en la app

---

## 🎉 ¡Listo!

Si completaste todos los pasos, tu sistema de subscripciones debería estar funcionando correctamente.

**Próximos pasos:**
1. Prueba exhaustivamente en Sandbox
2. Completa la información de la app en App Store Connect
3. Envía la app para revisión
4. Una vez aprobada, las subscripciones estarán disponibles para usuarios reales

**¿Necesitas ayuda?** Revisa la sección de Solución de Problemas o consulta la documentación de RevenueCat.
