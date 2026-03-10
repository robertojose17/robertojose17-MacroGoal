
# 🔔 Configuración del Webhook de RevenueCat

## ✅ Estado Actual
El webhook de RevenueCat ya está **completamente implementado** en tu proyecto. Solo necesitas configurarlo en el dashboard de RevenueCat.

---

## 📋 Pasos de Configuración

### 1️⃣ Obtener la URL del Webhook

Tu URL del webhook es:
```
https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook
```

### 2️⃣ Configurar en RevenueCat Dashboard

1. Ve a [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Selecciona tu proyecto
3. Ve a **Integrations** → **Webhooks**
4. Haz clic en **+ New Webhook**
5. Configura los siguientes campos:

   **Webhook URL:**
   ```
   https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook
   ```

   **Authorization Header:** (Opcional pero recomendado)
   ```
   Bearer YOUR_SUPABASE_ANON_KEY
   ```
   *(Puedes obtener tu anon key desde el Supabase Dashboard → Settings → API)*

   **Events to Send:** Selecciona todos los eventos (recomendado):
   - ✅ Initial Purchase
   - ✅ Renewal
   - ✅ Cancellation
   - ✅ Uncancellation
   - ✅ Non Renewing Purchase
   - ✅ Expiration
   - ✅ Billing Issue
   - ✅ Product Change

6. Haz clic en **Save**

### 3️⃣ Probar el Webhook

1. En el dashboard de RevenueCat, ve a la configuración del webhook
2. Haz clic en **Send Test Event**
3. Verifica que el evento se reciba correctamente

---

## 🔍 Verificar que Funciona

### Opción 1: Revisar Logs de Supabase
1. Ve a Supabase Dashboard → Edge Functions → `revenuecat-webhook`
2. Haz clic en **Logs**
3. Deberías ver mensajes como:
   ```
   [RevenueCat Webhook] 📨 Received webhook request
   [RevenueCat Webhook] Event type: TEST
   [RevenueCat Webhook] ✅ Event stored successfully
   ```

### Opción 2: Revisar la Base de Datos
Ejecuta esta query en Supabase SQL Editor:
```sql
SELECT * FROM revenuecat_events ORDER BY created_at DESC LIMIT 10;
```

Deberías ver los eventos del webhook almacenados aquí.

---

## 📊 Eventos que Maneja el Webhook

| Evento | Descripción | Acción |
|--------|-------------|--------|
| `INITIAL_PURCHASE` | Primera compra del usuario | Activa suscripción |
| `RENEWAL` | Renovación automática | Mantiene suscripción activa |
| `CANCELLATION` | Usuario cancela (sigue activo hasta expiración) | Marca `will_renew = false` |
| `UNCANCELLATION` | Usuario reactiva auto-renovación | Marca `will_renew = true` |
| `EXPIRATION` | Suscripción expira | Desactiva suscripción |
| `BILLING_ISSUE` | Problema con el pago | Marca como `past_due` |
| `PRODUCT_CHANGE` | Usuario cambia de plan | Actualiza plan |
| `NON_RENEWING_PURCHASE` | Compra única (no recurrente) | Activa sin renovación |

---

## 🗄️ Estructura de Datos

### Tabla `revenuecat_events` (Auditoría)
Almacena **todos** los eventos del webhook para auditoría:
```sql
- id (UUID)
- event_type (TEXT)
- app_user_id (TEXT)
- product_id (TEXT)
- price_in_purchased_currency (NUMERIC)
- currency (TEXT)
- amount_usd (NUMERIC)
- raw_event (JSONB) -- Evento completo de RevenueCat
- created_at (TIMESTAMPTZ)
```

### Tabla `subscriptions` (Estado Actual)
Almacena el **estado actual** de la suscripción de cada usuario:
```sql
- user_id (TEXT) -- ID del usuario en Supabase
- status (TEXT) -- 'active', 'inactive', 'past_due'
- plan_name (TEXT) -- 'Monthly_MG' o 'Yearly_MG'
- product_id (TEXT)
- revenuecat_app_user_id (TEXT)
- entitlement_ids (TEXT[])
- will_renew (BOOLEAN)
- current_period_start (TIMESTAMPTZ)
- current_period_end (TIMESTAMPTZ)
- expiration_at (TIMESTAMPTZ)
- unsubscribe_detected_at (TIMESTAMPTZ)
- billing_issues_detected_at (TIMESTAMPTZ)
```

---

## 🔐 Seguridad

El webhook usa:
- ✅ **CORS headers** para permitir requests desde RevenueCat
- ✅ **Service Role Key** de Supabase (bypasses RLS para escritura)
- ✅ **Row Level Security (RLS)** en `revenuecat_events` para que usuarios solo vean sus propios eventos
- ⚠️ **Opcional:** Puedes agregar verificación de firma de RevenueCat para mayor seguridad

---

## 🐛 Troubleshooting

### El webhook no recibe eventos
1. Verifica que la URL sea correcta
2. Verifica que el Edge Function esté desplegado
3. Revisa los logs en Supabase Dashboard

### Eventos se reciben pero no se guardan
1. Revisa los logs del Edge Function
2. Verifica que las tablas `revenuecat_events` y `subscriptions` existan
3. Verifica que el `SUPABASE_SERVICE_ROLE_KEY` esté configurado

### Usuario no ve su suscripción en la app
1. Verifica que `app_user_id` en RevenueCat coincida con `user_id` en Supabase
2. Ejecuta esta query para verificar:
   ```sql
   SELECT * FROM subscriptions WHERE user_id = 'TU_USER_ID';
   ```

---

## 💰 Tracking de Ingresos

El webhook automáticamente:
- ✅ Convierte todas las monedas a USD
- ✅ Almacena el precio original y la moneda
- ✅ Calcula `amount_usd` para reportes

Para ver ingresos totales:
```sql
SELECT 
  SUM(amount_usd) as total_revenue_usd,
  COUNT(*) as total_purchases,
  COUNT(DISTINCT app_user_id) as unique_customers
FROM revenuecat_events
WHERE event_type IN ('INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE');
```

---

## ✅ Checklist Final

- [ ] Webhook URL configurada en RevenueCat
- [ ] Eventos seleccionados (todos recomendado)
- [ ] Test event enviado y recibido
- [ ] Logs verificados en Supabase
- [ ] Tabla `revenuecat_events` tiene datos
- [ ] Tabla `subscriptions` se actualiza correctamente

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs del Edge Function en Supabase
2. Verifica la tabla `revenuecat_events` para ver si los eventos llegan
3. Ejecuta queries SQL para verificar el estado de las suscripciones

---

**¡Listo!** Tu webhook de RevenueCat está completamente configurado y listo para usar. 🎉
