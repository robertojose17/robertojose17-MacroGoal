
# 🔑 CÓMO OBTENER TU ISSUER ID DE APP STORE CONNECT

## El problema que tienes:
El error dice: **"Skipping Provisioning Profile validation on Apple Servers because we aren't authenticated"**

Esto significa que el `issuerId` en `credentials.json` está incorrecto.

## ⚠️ IMPORTANTE: issuerId ≠ App ID
- ❌ **NO** es `6755788871` (ese es tu App ID)
- ✅ **SÍ** es un UUID que se ve así: `69a6de8f-1234-47e3-e053-5b8c7c11a4d1`

## 📋 PASOS PARA OBTENER TU ISSUER ID:

### 1. Ve a App Store Connect
Abre: https://appstoreconnect.apple.com/

### 2. Navega a Users and Access
- En la página principal, haz clic en **"Users and Access"** (Usuarios y Acceso)
- O ve directamente a: https://appstoreconnect.apple.com/access/integrations/api

### 3. Ve a la pestaña "Integrations"
- Haz clic en la pestaña **"Integrations"** (Integraciones)
- Luego haz clic en **"App Store Connect API"**

### 4. Encuentra tu API Key
- Busca la API Key con Key ID: **CVYBYP624P**
- Haz clic en ella para ver los detalles

### 5. Copia el Issuer ID
- Verás un campo llamado **"Issuer ID"**
- Es un UUID largo que se ve así: `69a6de8f-1234-47e3-e053-5b8c7c11a4d1`
- **COPIA** ese valor completo

### 6. Actualiza credentials.json
Reemplaza `REPLACE_WITH_YOUR_ISSUER_ID` en el archivo `credentials.json` con el Issuer ID que copiaste.

El archivo debe quedar así:
```json
{
  "keyId": "CVYBYP624P",
  "issuerId": "69a6de8f-1234-47e3-e053-5b8c7c11a4d1",  ← TU ISSUER ID AQUÍ
  "appleTeamId": "RQ6JHH38HA",
  "appleId": "rivera76115@gmail.com",
  "keyP8": "-----BEGIN PRIVATE KEY-----\n..."
}
```

## 🎯 DESPUÉS DE ACTUALIZAR:
1. Guarda el archivo `credentials.json`
2. Vuelve a hacer el build con EAS
3. El error de autenticación debería desaparecer

## ❓ ¿No encuentras el Issuer ID?
Si no ves el Issuer ID en App Store Connect:
1. Asegúrate de estar usando la cuenta correcta: **rivera76115@gmail.com**
2. Verifica que tengas permisos de Admin o Account Holder
3. Si no tienes acceso, pídele al Account Holder que te dé el Issuer ID

---

**Nota:** El Issuer ID es el mismo para todas las API Keys de tu cuenta de Apple Developer.
