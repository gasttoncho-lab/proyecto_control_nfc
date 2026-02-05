# 🚀 GUÍA RÁPIDA DE INICIO

## Orden de Ejecución

### 1️⃣ Iniciar el Backend (PRIMERO)

```bash
cd backend
npm install
npm run start:dev
```

✅ El servidor debe estar corriendo en http://localhost:3000

### 2️⃣ Iniciar el Panel Web

```bash
cd web-panel
npm install
npm run dev
```

✅ Abre tu navegador en http://localhost:5173

**Credenciales de acceso:**
- Email: `admin@example.com`
- Password: `admin123`

### 3️⃣ Ejecutar la App Android

1. Abre Android Studio
2. Abre el proyecto de la carpeta `android-app`
3. Espera a que sincronice Gradle
4. Conecta un dispositivo o inicia un emulador
5. Presiona Run (▶️)

**Credenciales de acceso:**
- Email: `admin@example.com`
- Password: `admin123`

## ⚠️ IMPORTANTE

### Para Emulador Android
La configuración por defecto funciona. No necesitas cambiar nada.

### Para Dispositivo Android Real
1. Obtén la IP de tu computadora:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig`
2. Edita `android-app/app/src/main/java/com/example/loginapp/data/api/ApiService.kt`
3. Cambia:
   ```kotlin
   const val BASE_URL = "http://TU_IP:3000/"
   // Ejemplo: "http://192.168.1.100:3000/"
   ```

## 🎯 Pruebas Rápidas

### En el Panel Web:
1. Inicia sesión con las credenciales
2. Haz clic en "➕ Agregar Usuario"
3. Crea un nuevo usuario
4. Intenta editar el usuario
5. Prueba eliminar el usuario

### En la App Android:
1. Inicia sesión con las credenciales
2. Verás la pantalla de bienvenida
3. Cierra sesión
4. La app te regresa al login
5. Vuelve a iniciar sesión (el token persiste)

## 🔧 Solución de Problemas

### El backend no inicia
- Asegúrate de tener Node.js instalado (v16 o superior)
- Ejecuta `npm install` nuevamente

### El panel web no carga
- Verifica que el backend esté corriendo
- Abre la consola del navegador para ver errores

### La app Android no conecta
- Verifica que el backend esté corriendo
- Para emulador usa `http://10.0.2.2:3000/`
- Para dispositivo real usa tu IP local
- Revisa que `usesCleartextTraffic="true"` esté en AndroidManifest.xml

## 📚 Documentación Completa

Lee el README.md en la raíz del proyecto para documentación detallada.
