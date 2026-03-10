
# 🔔 RevenueCat Webhook - Guía Rápida

## 📊 Arquitectura

```
Usuario compra en App
         ↓
    RevenueCat
         ↓
   [WEBHOOK] ← Aquí estamos configurando esto
         ↓
  Supabase Edge Function
         ↓
  Base de Datos (subscriptions)
         ↓
   App detecta cambio
         ↓
  Usuario ve contenido premium
```

---

## ✅ Estado Actual

| Componente | Estado | Archivo |
|------------|--------|---------|
| Edge Function | ✅ Implementado | `supabase/functions/revenuecat-webhook/index.ts` |
| Schema BD | ✅ Creado | `supabase/migrations/20250131000000_*.sql` |
| Frontend | ✅ Integrado | `hooks/usePremium.ts`, `app/subscription.tsx` |
| **Webhook Config** | ⚠️ **PENDIENTE** | RevenueCat Dashboard |

---

## 🚀 Configuración (12 minutos)

### Paso 1: Base de Datos (5 min)
```
Supabase Dashboard → SQL Editor → Ejecutar 3 migraciones
```

### Paso 2: RevenueCat (5 min)
```
RevenueCat Dashboard → Webhooks → Agregar URL del webhook
```

### Paso 3: Verificar (2 min)
```
SQL Editor → SELECT * FROM revenuecat_events
```

---

## 🔗 URL del Webhook

```
https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook
```

**Copia esta URL y pégala en RevenueCat Dashboard.**

---

## 📋 Eventos que Maneja

| Evento | Acción |
|--------|--------|
| `INITIAL_PURCHASE` | Activa suscripción |
| `RENEWAL` | Mantiene activa |
| `CANCELLATION` | Marca para cancelar (sigue activa hasta expiración) |
| `EXPIRATION` | Desactiva suscripción |
| `BILLING_ISSUE` | Marca como problema de pago |

---

## 🗄️ Tablas de Base de Datos

### `revenuecat_events` (Auditoría)
Almacena **todos** los eventos del webhook.

### `subscriptions` (Estado Actual)
Almacena el **estado actual** de cada usuario.

---

## 🔍 Queries Útiles

### Ver eventos recientes
```sql
SELECT * FROM revenuecat_events ORDER BY created_at DESC LIMIT 10;
```

### Ver suscripciones activas
```sql
SELECT * FROM subscriptions WHERE status = 'active';
```

### Ver ingresos totales
```sql
SELECT SUM(amount_usd) as total_revenue 
FROM revenuecat_events 
WHERE event_type IN ('INITIAL_PURCHASE', 'RENEWAL');
```

---

## 📞 Soporte

**Problema:** Webhook no recibe eventos
- Verifica la URL en RevenueCat
- Revisa logs: Supabase → Edge Functions → Logs

**Problema:** Eventos no se guardan
- Verifica que las migraciones se ejecutaron
- Ejecuta: `SELECT * FROM revenuecat_events`

**Problema:** Usuario no ve premium
- Verifica: `SELECT * FROM subscriptions WHERE user_id = '[USER_ID]'`
- Fuerza refresh: `usePremium().refreshPremiumStatus()`

---

## 📄 Documentación Completa

1. **`QUICK_START.md`** ← Empieza aquí (3 pasos, 12 minutos)
2. **`INSTRUCCIONES_FINALES.md`** ← Guía completa con checklist
3. **`CONFIGURACION_COMPLETA_REVENUECAT.md`** ← Documentación detallada
4. **`REVENUECAT_VERIFICATION.md`** ← Queries SQL para monitoreo
5. **`VERIFICACION_FINAL.md`** ← Checklist de verificación

---

## 🎉 Resultado Final

Después de configurar:
- ✅ Compras se procesan automáticamente
- ✅ Base de datos se actualiza en tiempo real
- ✅ App detecta cambios instantáneamente
- ✅ Tracking de ingresos automático
- ✅ Cero mantenimiento manual

**Todo funciona automáticamente. Solo configura una vez.** 🚀

---

## ⏱️ Tiempo Total

- **Configuración:** 12 minutos
- **Mantenimiento:** 0 minutos (automático)

**¡Listo para producción!** 🎯
