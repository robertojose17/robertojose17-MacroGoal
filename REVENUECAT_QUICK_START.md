
# 🚀 RevenueCat - Configuración Rápida

## ✅ Lo que necesito de ti:

### 1. **API Keys de RevenueCat** (5 minutos)

1. Ve a [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Crea un proyecto (si no lo has hecho)
3. Ve a **Project Settings** → **API Keys**
4. Copia estas 2 keys:
   - **iOS Public SDK Key**: `appl_XXXXXXXXXXXXXXXX`
   - **Android Public SDK Key**: `goog_XXXXXXXXXXXXXXXX`

### 2. **Configurar en el Código**

Abre `app/subscription.tsx` (línea ~95) y pega tus keys:

```typescript
const apiKey = Platform.select({
  ios: 'appl_XXXXXXXXXXXXXXXX', // ← Pega tu iOS key aquí
  android: 'goog_XXXXXXXXXXXXXXXX', // ← Pega tu Android key aquí
});
```

### 3. **Conectar App Store Connect** (10 minutos)

1. En RevenueCat Dashboard → **Project Settings** → **Apple App Store**
2. Haz clic en **"Connect to App Store Connect"**
3. Necesitas crear una **App Store Connect API Key**:
   - Ve a [App Store Connect](https://appstoreconnect.apple.com/)
   - **Users and Access** → **Keys** → **App Store Connect API**
   - Crea una nueva key (rol: Admin)
   - Descarga el archivo `.p8`
   - Copia el **Key ID** y el **Issuer ID**
4. Vuelve a RevenueCat y pega los datos + sube el `.p8`

### 4. **Crear Entitlement y Productos** (5 minutos)

#### Entitlement:
1. RevenueCat Dashboard → **Entitlements** → **"+ New"**
2. **Identifier**: `premium` (exactamente así)
3. Guarda

#### Productos:
1. RevenueCat Dashboard → **Products** → **"+ New"**
2. Producto mensual:
   - **Identifier**: `monthly_premium`
   - **App Store Product ID**: `Monthly_MG`
3. Producto anual:
   - **Identifier**: `yearly_premium`
   - **App Store Product ID**: `Yearly_MG`

#### Offering:
1. RevenueCat Dashboard → **Offerings** → **"+ New"**
2. **Identifier**: `default`
3. Marca como **Current Offering**
4. Agrega paquetes:
   - **Monthly**: producto `monthly_premium`, entitlement `premium`
   - **Annual**: producto `yearly_premium`, entitlement `premium`

### 5. **Configurar Webhook** (3 minutos)

1. RevenueCat Dashboard → **Integrations** → **Webhooks** → **"+ Add Webhook"**
2. **URL**: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/revenuecat-webhook`
3. **Authorization**: `Bearer YOUR_SUPABASE_ANON_KEY`
   - Obtén tu key desde [Supabase Dashboard](https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/settings/api)
4. Selecciona todos los eventos
5. Guarda y haz clic en **"Send Test"** para verificar

---

## 🧪 Probar

1. Abre la app en un **dispositivo físico** (no simulador)
2. Ve a **Profile** → **Go Premium**
3. Deberías ver los precios reales cargados
4. Haz una compra de prueba con una cuenta sandbox
5. Verifica que el usuario sea marcado como premium

---

## 🐛 Problemas Comunes

### "Configuration Required"
→ No pegaste las API keys en `app/subscription.tsx`

### "No packages available"
→ Verifica que el Offering "default" esté marcado como "Current" en RevenueCat

### Webhook falla
→ Verifica la URL y el Authorization header en RevenueCat Dashboard

---

## 📋 Checklist Final

- [ ] API Keys configuradas en el código
- [ ] App Store Connect conectado a RevenueCat
- [ ] Entitlement "premium" creado
- [ ] Productos creados y vinculados
- [ ] Offering "default" configurado
- [ ] Webhook configurado y probado
- [ ] Compra de prueba exitosa

---

**¿Necesitas ayuda?** Revisa `REVENUECAT_SETUP_GUIDE.md` para instrucciones detalladas.
