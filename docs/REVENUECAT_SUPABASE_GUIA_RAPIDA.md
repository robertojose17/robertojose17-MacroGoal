
# Guía Rápida: Integración RevenueCat + Supabase

## 🎯 ¿Qué hace esta integración?

Conecta RevenueCat con tu base de datos Supabase para sincronizar automáticamente el estado de las suscripciones de in-app purchases.

## 📦 Archivos Creados

1. **Migración de Base de Datos**
   - `supabase/migrations/20250131000000_create_revenuecat_integration.sql`
   - Crea tablas para almacenar eventos y datos de suscripción

2. **Edge Function (Webhook)**
   - `supabase/functions/revenuecat-webhook/index.ts`
   - Recibe eventos de RevenueCat y actualiza la base de datos

3. **Pantalla de Diagnóstico**
   - `app/revenuecat-diagnostics.tsx`
   - Verifica que todo esté funcionando correctamente

4. **Documentación**
   - `docs/REVENUECAT_SUPABASE_SETUP.md` (en inglés, detallada)
   - `docs/REVENUECAT_INTEGRATION_SUMMARY.md` (resumen)

## 🚀 Pasos de Configuración

### 1. Aplicar la Migración

**Opción A: Dashboard de Supabase**
1. Ve a tu proyecto en Supabase Dashboard
2. Abre SQL Editor
3. Copia el contenido de `supabase/migrations/20250131000000_create_revenuecat_integration.sql`
4. Ejecuta el SQL

**Opción B: CLI de Supabase** (si lo tienes instalado)
```bash
supabase db push
```

### 2. Desplegar el Edge Function

**Opción A: Dashboard de Supabase**
1. Ve a Edge Functions en tu proyecto
2. Crea una nueva función llamada `revenuecat-webhook`
3. Copia el contenido de `supabase/functions/revenuecat-webhook/index.ts`
4. Despliega

**Opción B: CLI de Supabase**
```bash
supabase functions deploy revenuecat-webhook
```

### 3. Configurar el Webhook en RevenueCat

1. Ve a [RevenueCat Dashboard](https://app.revenuecat.com)
2. Selecciona tu app
3. Ve a **Integrations** → **Webhooks**
4. Haz clic en **+ New**
5. Configura:
   - **URL**: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook`
   - **Authorization Header**: `Bearer TU_SUPABASE_ANON_KEY`
     - Obtén tu anon key en: Supabase Dashboard → Settings → API
   - **Events to Send**: Selecciona todos (recomendado)
6. Guarda

### 4. Probar la Integración

1. Abre tu app
2. Ve a Profile → RevenueCat Diagnostics (al final de la página)
3. Verifica que todos los checks estén en verde
4. Haz una compra de prueba
5. Refresca la pantalla de diagnóstico
6. Deberías ver el evento en la tabla `revenuecat_events`

## ✅ Verificación

Después de configurar, verifica:

- [ ] Migración aplicada (tablas `revenuecat_events` y `subscriptions` actualizadas)
- [ ] Edge Function desplegado
- [ ] Webhook configurado en RevenueCat
- [ ] Pantalla de diagnóstico muestra checks verdes
- [ ] Compra de prueba crea evento en la base de datos

## 🔍 Cómo Verificar en Supabase

### Ver Eventos Recientes
1. Ve a Supabase Dashboard → Table Editor
2. Abre la tabla `revenuecat_events`
3. Deberías ver eventos después de hacer compras

### Ver Estado de Suscripción
1. Ve a la tabla `subscriptions`
2. Busca tu `user_id`
3. Verifica que `revenuecat_app_user_id` tenga un valor
4. Verifica que `status` sea `active` si tienes suscripción activa

### Ver Logs del Edge Function
1. Ve a Edge Functions → revenuecat-webhook → Logs
2. Deberías ver mensajes como: `[RevenueCat Webhook] 📨 Received webhook request`

## 🐛 Solución de Problemas

### El webhook no recibe eventos
- ✅ Verifica que la URL del webhook sea correcta
- ✅ Verifica que el Authorization header tenga tu anon key correcta
- ✅ Prueba con "Send Test Event" en RevenueCat Dashboard

### Los eventos se guardan pero la suscripción no se actualiza
- ✅ Revisa los logs del Edge Function
- ✅ Verifica que el `user_id` coincida entre tablas
- ✅ Verifica las políticas RLS en la tabla `subscriptions`

### Error "Product Not Found"
- ℹ️ Esto es normal en sandbox hasta que configures los productos en App Store Connect
- ℹ️ La integración del webhook funciona independientemente de esto
- ℹ️ Una vez que los productos estén configurados, las compras se sincronizarán correctamente

## 📊 Qué Datos se Sincronizan

Cuando un usuario hace una compra, RevenueCat envía un webhook que actualiza:

- **Estado de suscripción** (`active`, `inactive`, `past_due`)
- **Producto comprado** (Monthly_MG, Yearly_MG, etc.)
- **Fechas** (compra, expiración)
- **Entitlements** (permisos activos)
- **Información de la tienda** (App Store, Play Store)
- **Renovación automática** (si está activada)

## 🎉 Beneficios

Con esta integración, ahora tienes:

1. ✅ **Sincronización en tiempo real** - El estado de suscripción se actualiza automáticamente
2. ✅ **Historial de eventos** - Todos los eventos de compra se guardan para análisis
3. ✅ **Verificación del servidor** - Puedes verificar suscripciones desde el backend
4. ✅ **Confiabilidad** - RevenueCat maneja reintentos automáticos
5. ✅ **Multiplataforma** - Funciona para iOS y Android

## 📱 Acceso a la Pantalla de Diagnóstico

Para verificar el estado de la integración en cualquier momento:

1. Abre tu app
2. Ve a la pestaña **Profile**
3. Desplázate hasta el final
4. Toca **RevenueCat Diagnostics**

Esta pantalla te mostrará:
- Estado de conexión con Supabase
- Existencia de tablas
- Eventos recibidos
- Estado de sincronización
- Información de RevenueCat SDK

## 📚 Documentación Completa

Para más detalles, consulta:
- `docs/REVENUECAT_SUPABASE_SETUP.md` - Guía completa en inglés
- `docs/REVENUECAT_INTEGRATION_SUMMARY.md` - Resumen de la integración

## ❓ ¿Necesitas Ayuda?

Si encuentras problemas:
1. Revisa los logs del Edge Function en Supabase
2. Verifica la configuración del webhook en RevenueCat
3. Usa "Send Test Event" en RevenueCat Dashboard
4. Revisa la tabla `revenuecat_events` para ver los datos crudos del evento
