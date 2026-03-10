
# 🔍 Verificación de Integración RevenueCat

## Queries SQL para Verificar el Estado

### 1️⃣ Verificar que las tablas existen
```sql
-- Verificar tabla revenuecat_events
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'revenuecat_events'
);

-- Verificar tabla subscriptions
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'subscriptions'
);
```

### 2️⃣ Ver eventos recientes del webhook
```sql
SELECT 
  id,
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

### 3️⃣ Ver suscripciones activas
```sql
SELECT 
  user_id,
  status,
  plan_name,
  product_id,
  will_renew,
  current_period_end,
  expiration_at
FROM subscriptions
WHERE status = 'active'
ORDER BY current_period_end DESC;
```

### 4️⃣ Ver ingresos totales
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

### 5️⃣ Ver eventos por tipo
```sql
SELECT 
  event_type,
  COUNT(*) as count,
  SUM(amount_usd) as total_usd
FROM revenuecat_events
GROUP BY event_type
ORDER BY count DESC;
```

### 6️⃣ Ver suscripciones por usuario específico
```sql
-- Reemplaza 'USER_ID_AQUI' con el ID real del usuario
SELECT 
  s.*,
  (SELECT COUNT(*) FROM revenuecat_events WHERE app_user_id = s.user_id) as total_events
FROM subscriptions s
WHERE user_id = 'USER_ID_AQUI';
```

### 7️⃣ Ver historial de eventos de un usuario
```sql
-- Reemplaza 'USER_ID_AQUI' con el ID real del usuario
SELECT 
  event_type,
  product_id,
  amount_usd,
  currency,
  purchased_at,
  expiration_at,
  created_at
FROM revenuecat_events
WHERE app_user_id = 'USER_ID_AQUI'
ORDER BY created_at DESC;
```

### 8️⃣ Ver suscripciones que van a expirar pronto
```sql
SELECT 
  user_id,
  plan_name,
  status,
  will_renew,
  expiration_at,
  EXTRACT(DAY FROM (expiration_at - NOW())) as days_until_expiration
FROM subscriptions
WHERE status = 'active'
  AND expiration_at IS NOT NULL
  AND expiration_at > NOW()
  AND expiration_at < NOW() + INTERVAL '7 days'
ORDER BY expiration_at ASC;
```

### 9️⃣ Ver cancelaciones recientes
```sql
SELECT 
  user_id,
  plan_name,
  unsubscribe_detected_at,
  expiration_at,
  EXTRACT(DAY FROM (expiration_at - NOW())) as days_remaining
FROM subscriptions
WHERE unsubscribe_detected_at IS NOT NULL
  AND status = 'active'
ORDER BY unsubscribe_detected_at DESC;
```

### 🔟 Ver problemas de facturación
```sql
SELECT 
  user_id,
  plan_name,
  status,
  billing_issues_detected_at,
  expiration_at
FROM subscriptions
WHERE billing_issues_detected_at IS NOT NULL
ORDER BY billing_issues_detected_at DESC;
```

---

## 🧪 Probar el Webhook Manualmente

### Usando cURL (desde terminal)
```bash
curl -X POST https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "type": "TEST",
      "app_user_id": "test-user-123",
      "original_app_user_id": "test-user-123",
      "product_id": "Monthly_MG",
      "entitlement_ids": ["premium"],
      "period_type": "normal",
      "purchased_at_ms": 1704067200000,
      "expiration_at_ms": 1706745600000,
      "store": "app_store",
      "environment": "SANDBOX",
      "price_in_purchased_currency": 9.99,
      "currency": "USD"
    },
    "api_version": "1.0"
  }'
```

### Respuesta Esperada
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "event_type": "TEST",
  "user_id": "test-user-123",
  "amount_usd": "9.99"
}
```

---

## ✅ Checklist de Verificación

### Base de Datos
- [ ] Tabla `revenuecat_events` existe
- [ ] Tabla `subscriptions` tiene columnas de RevenueCat
- [ ] RLS está habilitado en `revenuecat_events`
- [ ] Índices están creados

### Edge Function
- [ ] Edge Function `revenuecat-webhook` está desplegado
- [ ] Logs muestran requests entrantes
- [ ] No hay errores en los logs

### RevenueCat Dashboard
- [ ] Webhook URL configurada
- [ ] Eventos seleccionados
- [ ] Test event enviado exitosamente

### Integración Frontend
- [ ] `usePremium` hook funciona
- [ ] `subscription.tsx` muestra ofertas
- [ ] Compras se procesan correctamente
- [ ] Estado premium se actualiza después de compra

---

## 🐛 Errores Comunes y Soluciones

### Error: "Table revenuecat_events does not exist"
**Solución:** Ejecuta las migraciones:
```sql
-- Copia el contenido de:
-- supabase/migrations/20250131000000_create_revenuecat_integration.sql
-- supabase/migrations/20250131000001_add_revenue_tracking.sql
-- Y ejecútalos en Supabase SQL Editor
```

### Error: "Permission denied for table subscriptions"
**Solución:** Verifica que el Edge Function use `SUPABASE_SERVICE_ROLE_KEY`, no `SUPABASE_ANON_KEY`

### Error: "app_user_id does not match user_id"
**Solución:** Asegúrate de que en tu app, cuando configuras RevenueCat, usas:
```typescript
await Purchases.logIn(user.id); // user.id debe ser el mismo que en Supabase
```

### Webhook recibe eventos pero no actualiza subscriptions
**Solución:** Verifica que el `user_id` en la tabla `subscriptions` coincida con el `app_user_id` de RevenueCat

---

## 📊 Dashboard de Métricas (Query Completo)

```sql
WITH revenue_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE event_type = 'INITIAL_PURCHASE') as new_customers,
    COUNT(*) FILTER (WHERE event_type = 'RENEWAL') as renewals,
    COUNT(*) FILTER (WHERE event_type = 'CANCELLATION') as cancellations,
    SUM(amount_usd) FILTER (WHERE event_type IN ('INITIAL_PURCHASE', 'RENEWAL')) as total_revenue,
    AVG(amount_usd) FILTER (WHERE event_type IN ('INITIAL_PURCHASE', 'RENEWAL')) as avg_revenue
  FROM revenuecat_events
  WHERE created_at >= NOW() - INTERVAL '30 days'
),
subscription_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE status = 'active') as active_subs,
    COUNT(*) FILTER (WHERE status = 'inactive') as inactive_subs,
    COUNT(*) FILTER (WHERE status = 'past_due') as past_due_subs,
    COUNT(*) FILTER (WHERE will_renew = false AND status = 'active') as will_cancel
  FROM subscriptions
)
SELECT 
  r.new_customers,
  r.renewals,
  r.cancellations,
  ROUND(r.total_revenue::numeric, 2) as total_revenue_usd,
  ROUND(r.avg_revenue::numeric, 2) as avg_revenue_usd,
  s.active_subs,
  s.inactive_subs,
  s.past_due_subs,
  s.will_cancel,
  ROUND((s.active_subs::numeric / NULLIF(s.active_subs + s.inactive_subs, 0) * 100), 2) as retention_rate
FROM revenue_stats r, subscription_stats s;
```

---

**¡Todo listo!** Usa estas queries para monitorear tu integración de RevenueCat. 🚀
