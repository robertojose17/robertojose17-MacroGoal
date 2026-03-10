
# 🎯 Configuración Completa de RevenueCat - Guía Paso a Paso

## 📌 Resumen
Tu integración de RevenueCat está **100% implementada** en el código. Solo necesitas configurar el webhook en el dashboard de RevenueCat.

---

## 🔧 Información de tu Proyecto

### Credenciales RevenueCat
- **SDK API Key:** `appl_TZdEZxwrVNJdRUPcoavoXaVUCSE`
- **Secret API Key:** `sk_INEvrnxfxYJYlZwDPaxSqeeGsYbhE`
- **RevenueCat App ID:** `app48cb666b48`

### Product IDs
- **Mensual:** `Monthly_MG`
- **Anual:** `Yearly_MG`

### Supabase
- **Project ID:** `esgptfiofoaeguslgvcq`
- **Webhook URL:** `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook`

---

## 🚀 Pasos de Configuración

### Paso 1: Configurar el Webhook en RevenueCat

1. **Ir al Dashboard de RevenueCat**
   - Ve a: https://app.revenuecat.com/
   - Inicia sesión con tu cuenta

2. **Navegar a Webhooks**
   - Selecciona tu proyecto (App ID: `app48cb666b48`)
   - En el menú lateral, ve a: **Integrations** → **Webhooks**

3. **Crear Nuevo Webhook**
   - Haz clic en **+ New Webhook**
   - Completa los campos:

   ```
   Webhook URL:
   https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook
   
   Authorization Header (opcional):
   Bearer [TU_SUPABASE_ANON_KEY]
   ```

   > **Nota:** Puedes obtener tu `SUPABASE_ANON_KEY` desde:
   > Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

4. **Seleccionar Eventos**
   Marca **TODOS** estos eventos:
   - ✅ Initial Purchase
   - ✅ Renewal
   - ✅ Cancellation
   - ✅ Uncancellation
   - ✅ Non Renewing Purchase
   - ✅ Expiration
   - ✅ Billing Issue
   - ✅ Product Change

5. **Guardar**
   - Haz clic en **Save**

---

### Paso 2: Probar el Webhook

1. **Enviar Test Event**
   - En la configuración del webhook, haz clic en **Send Test Event**
   - Selecciona el tipo de evento: **Test**
   - Haz clic en **Send**

2. **Verificar en Supabase**
   - Ve a: Supabase Dashboard → Edge Functions → `revenuecat-webhook`
   - Haz clic en **Logs**
   - Deberías ver:
     ```
     [RevenueCat Webhook] 📨 Received webhook request
     [RevenueCat Webhook] Event type: TEST
     [RevenueCat Webhook] ✅ Event stored successfully
     ```

3. **Verificar en la Base de Datos**
   - Ve a: Supabase Dashboard → SQL Editor
   - Ejecuta:
     ```sql
     SELECT * FROM revenuecat_events ORDER BY created_at DESC LIMIT 5;
     ```
   - Deberías ver el evento TEST almacenado

---

### Paso 3: Verificar la Integración en la App

1. **Abrir la App**
   - Navega a la pantalla de suscripción (`/subscription`)

2. **Verificar que se Muestran las Ofertas**
   - Deberías ver:
     - Plan Mensual (`Monthly_MG`)
     - Plan Anual (`Yearly_MG`)
   - Con sus precios correspondientes

3. **Hacer una Compra de Prueba (Sandbox)**
   - En iOS: Usa una cuenta de prueba de App Store Connect
   - En Android: Usa una cuenta de prueba de Google Play Console
   - Completa la compra

4. **Verificar que el Webhook se Activa**
   - Después de la compra, revisa los logs del webhook
   - Deberías ver un evento `INITIAL_PURCHASE`
   - Ejecuta en SQL Editor:
     ```sql
     SELECT * FROM subscriptions WHERE user_id = '[TU_USER_ID]';
     ```
   - Deberías ver `status = 'active'`

---

## 🔍 Verificación Completa

### ✅ Checklist de Verificación

#### Base de Datos
- [ ] Tabla `revenuecat_events` existe
- [ ] Tabla `subscriptions` tiene columnas de RevenueCat
- [ ] Migraciones aplicadas correctamente

#### Edge Function
- [ ] Edge Function `revenuecat-webhook` desplegado
- [ ] Logs muestran requests entrantes
- [ ] No hay errores en los logs

#### RevenueCat Dashboard
- [ ] Webhook URL configurada correctamente
- [ ] Todos los eventos seleccionados
- [ ] Test event enviado y recibido exitosamente

#### Frontend (App)
- [ ] Pantalla `/subscription` muestra ofertas
- [ ] Precios se cargan correctamente
- [ ] Compra de prueba funciona
- [ ] Estado premium se actualiza después de compra
- [ ] Hook `usePremium` retorna `isPremium: true` después de compra

---

## 📊 Queries Útiles para Monitoreo

### Ver Eventos Recientes
```sql
SELECT 
  event_type,
  app_user_id,
  product_id,
  amount_usd,
  currency,
  created_at
FROM revenuecat_events
ORDER BY created_at DESC
LIMIT 20;
```

### Ver Suscripciones Activas
```sql
SELECT 
  user_id,
  status,
  plan_name,
  product_id,
  will_renew,
  current_period_end
FROM subscriptions
WHERE status = 'active'
ORDER BY current_period_end DESC;
```

### Ver Ingresos Totales
```sql
SELECT 
  COUNT(*) as total_purchases,
  COUNT(DISTINCT app_user_id) as unique_customers,
  SUM(amount_usd) as total_revenue_usd,
  AVG(amount_usd) as avg_purchase_usd
FROM revenuecat_events
WHERE event_type IN ('INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE')
  AND amount_usd IS NOT NULL;
```

### Ver Suscripción de un Usuario Específico
```sql
-- Reemplaza 'USER_ID_AQUI' con el ID real
SELECT * FROM subscriptions WHERE user_id = 'USER_ID_AQUI';
```

---

## 🐛 Solución de Problemas

### Problema: Webhook no recibe eventos
**Solución:**
1. Verifica que la URL sea exactamente: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook`
2. Verifica que el Edge Function esté desplegado
3. Revisa los logs en Supabase Dashboard

### Problema: Eventos se reciben pero no se guardan
**Solución:**
1. Revisa los logs del Edge Function para ver errores
2. Verifica que las tablas existan:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   ```
3. Verifica que el `SUPABASE_SERVICE_ROLE_KEY` esté configurado en el Edge Function

### Problema: Usuario no ve su suscripción en la app
**Solución:**
1. Verifica que `app_user_id` en RevenueCat coincida con `user_id` en Supabase
2. En tu app, cuando configuras RevenueCat, asegúrate de usar:
   ```typescript
   await Purchases.logIn(user.id); // user.id debe ser el mismo que en Supabase
   ```
3. Ejecuta:
   ```sql
   SELECT * FROM subscriptions WHERE user_id = '[USER_ID]';
   ```

### Problema: Compra funciona pero premium no se activa
**Solución:**
1. Verifica que el entitlement ID en RevenueCat sea `premium`
2. Verifica que el webhook haya procesado el evento:
   ```sql
   SELECT * FROM revenuecat_events 
   WHERE app_user_id = '[USER_ID]' 
   ORDER BY created_at DESC;
   ```
3. Fuerza un refresh del estado premium en la app:
   ```typescript
   const { refreshPremiumStatus } = usePremium();
   await refreshPremiumStatus();
   ```

---

## 📱 Flujo Completo de Compra

1. **Usuario abre `/subscription`**
   - App carga ofertas desde RevenueCat
   - Muestra precios y planes

2. **Usuario hace clic en "Subscribe"**
   - App llama a `Purchases.purchasePackage()`
   - Se abre el diálogo nativo de compra (App Store / Google Play)

3. **Usuario completa la compra**
   - RevenueCat procesa la compra
   - RevenueCat envía webhook `INITIAL_PURCHASE` a tu Edge Function

4. **Edge Function procesa el webhook**
   - Almacena evento en `revenuecat_events`
   - Actualiza `subscriptions` con `status = 'active'`

5. **App detecta el cambio**
   - `usePremium` hook verifica el estado
   - `isPremium` cambia a `true`
   - Usuario ve contenido premium

---

## 🎉 ¡Listo!

Tu integración de RevenueCat está completamente configurada. Solo necesitas:

1. ✅ Configurar el webhook en RevenueCat Dashboard (5 minutos)
2. ✅ Enviar un test event para verificar
3. ✅ Hacer una compra de prueba en sandbox

**Archivos Clave en tu Proyecto:**
- `supabase/functions/revenuecat-webhook/index.ts` - Webhook handler
- `hooks/usePremium.ts` - Hook para verificar estado premium
- `app/subscription.tsx` - Pantalla de suscripción
- `supabase/migrations/20250131000000_create_revenuecat_integration.sql` - Schema de BD

**Documentación Adicional:**
- `REVENUECAT_WEBHOOK_SETUP.md` - Guía de configuración del webhook
- `REVENUECAT_VERIFICATION.md` - Queries SQL para verificación

---

## 📞 Necesitas Ayuda?

Si tienes problemas:
1. Revisa los logs del Edge Function en Supabase
2. Ejecuta las queries de verificación en SQL Editor
3. Verifica que los Product IDs coincidan: `Monthly_MG` y `Yearly_MG`

**¡Todo está listo para funcionar!** 🚀
