
# 📧 Guía de Configuración de Verificación de Email para iOS

## Problema
Cuando los usuarios hacen clic en el enlace de verificación de email en iOS, ven "Safari no puede abrir la página porque no pudo conectarse al servidor" (error de localhost).

## Solución
La aplicación ahora usa deep links para la verificación de email. Necesitas configurar tu proyecto de Supabase para usar las URLs de redirección correctas.

## ✅ Pasos para Arreglar

### 1. Configurar URLs de Redirección en Supabase

1. Ve a tu Panel de Supabase: https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq
2. Navega a **Authentication** → **URL Configuration**
3. Agrega las siguientes URLs de redirección:

**Para Desarrollo (Expo Go):**
```
exp://192.168.1.100:8081/--/auth/verify
```
Reemplaza `192.168.1.100` con la dirección IP local de tu computadora (se muestra en la terminal de Expo cuando ejecutas `npm run dev`)

**Para Producción (App Independiente):**
```
macrogoal://auth/verify
```

4. Haz clic en **Save** (Guardar)

### 2. Actualizar Plantillas de Email (Opcional pero Recomendado)

1. En el Panel de Supabase, ve a **Authentication** → **Email Templates**
2. Selecciona la plantilla **Confirm signup**
3. Asegúrate de que contenga `{{ .ConfirmationURL }}` en el cuerpo del email
4. La plantilla predeterminada debería funcionar, pero puedes personalizar el mensaje

### 3. Probar el Flujo

1. **Regístrate** con una nueva dirección de email
2. **Revisa tu email** en tu dispositivo iOS
3. **Toca el enlace de confirmación** en el email
4. La aplicación debería abrirse automáticamente y verificar tu cuenta
5. Serás redirigido para completar tu perfil

## 🔍 Cómo Funciona

1. Usuario se registra → Supabase envía email de confirmación
2. El email contiene un enlace como: `macrogoal://auth/verify?access_token=...&refresh_token=...`
3. iOS reconoce el esquema `macrogoal://` y abre la aplicación
4. La pantalla `/auth/verify` procesa los tokens
5. El usuario inicia sesión y es redirigido a onboarding o inicio

## 📱 Encontrar tu Dirección IP Local

**En Mac:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**En Windows:**
```bash
ipconfig
```
Busca "Dirección IPv4" bajo tu adaptador de red activo

**En la Terminal de Expo:**
La IP se muestra cuando ejecutas `npm run dev`, busca:
```
Metro waiting on exp://192.168.1.100:8081
```

## ⚠️ Notas Importantes

- **Desarrollo**: Usa `exp://TU_IP:8081/--/auth/verify` para Expo Go
- **Producción**: Usa `macrogoal://auth/verify` para builds independientes
- El esquema `macrogoal` está definido en `app.json`
- Asegúrate de agregar AMBAS URLs a Supabase para pruebas sin problemas

## 🐛 Solución de Problemas

**El enlace todavía va a localhost:**
- Asegúrate de haber guardado las URLs de redirección en Supabase
- Limpia el caché de tu navegador e intenta registrarte de nuevo
- Verifica que la plantilla de email esté usando `{{ .ConfirmationURL }}`

**La aplicación no se abre al hacer clic en el enlace:**
- Verifica que el esquema en `app.json` coincida con la URL (`macrogoal://`)
- Asegúrate de estar probando en un dispositivo físico (los deep links no funcionan en simuladores para enlaces de email)
- Intenta reiniciar el servidor de desarrollo de Expo

**Error "Enlace de verificación inválido":**
- El enlace puede haber expirado (predeterminado: 24 horas)
- Intenta registrarte de nuevo con un email nuevo
- Revisa los logs de Supabase para ver si hay errores

## ✅ Indicadores de Éxito

Cuando todo está funcionando correctamente:
1. Usuario se registra → ve alerta "¡Revisa tu Email!"
2. Usuario abre email en dispositivo iOS → toca el enlace
3. La aplicación se abre automáticamente → muestra pantalla "Verificando tu email..."
4. Después de 1-2 segundos → muestra mensaje "¡Email verificado!"
5. Usuario es redirigido para completar perfil o pantalla de inicio

---

**¿Necesitas Ayuda?** Revisa los logs de Supabase en Panel → Logs → Auth Logs para ver qué está pasando con las solicitudes de verificación.
