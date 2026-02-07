# App Android - Login + NFC Top-up/Balance (Device Binding)

Aplicación Android nativa para login de admin y operaciones NFC (top-up y balance) usando **device binding** con el backend.

## 📱 Requisitos

- Android Studio Arctic Fox o superior
- Android SDK 24 (Android 7.0) o superior
- Gradle 8.1+
- Kotlin 1.9.0

## 🚀 Instalación

1. Abre el proyecto en Android Studio
2. Espera a que Gradle sincronice las dependencias
3. Conecta un dispositivo Android o inicia un emulador
4. Presiona "Run" o `Shift + F10`

## ⚙️ Configuración

### Base URL (emulador y dispositivo físico)

La URL se configura en `BuildConfig.BASE_URL` dentro de `app/build.gradle`.

```gradle
buildConfigField "String", "BASE_URL", "\"http://10.0.2.2:3000/\""
```

`10.0.2.2` apunta al `localhost` de tu computadora en el emulador Android.

### Para Dispositivo Físico

1. Asegúrate de que tu computadora y dispositivo estén en la misma red WiFi
2. Obtén la IP de tu computadora:
   - Windows: Ejecuta `ipconfig` en cmd
   - Mac/Linux: Ejecuta `ifconfig` en terminal
3. Edita `app/build.gradle`:

```gradle
buildConfigField "String", "BASE_URL", "\"http://192.168.1.100:3000/\""
```

### Device Binding (X-Device-Id)

- La app genera un `deviceId` (UUIDv4) en **DataStore** al primer inicio.
- Ese `deviceId` se envía en todas las requests con el header `X-Device-Id`.
- El `deviceId` se muestra en la Home para que el admin lo autorice en el Web Panel.

## ✨ Funcionalidades

- ✅ **Login**: Autenticación con email y contraseña
- ✅ **Validación**: Validación de formularios en tiempo real
- ✅ **Sesión Persistente**: El token se guarda en SharedPreferences
- ✅ **Auto-login**: Si hay sesión activa, va directo a Home
- ✅ **Device Binding**: Genera `deviceId` en DataStore y lo envía en `X-Device-Id`
- ✅ **Session check**: Llama `/devices/session` y muestra autorización/evento
- ✅ **Top-up NFC**: Recarga con pulsera NTAG213
- ✅ **Balance NFC**: Consulta de saldo con pulsera NTAG213
- ✅ **Logout**: Cerrar sesión y volver al login
- ✅ **Material Design**: Interfaz moderna y atractiva
- ✅ **Loading States**: Indicadores de carga durante peticiones
- ✅ **Error Handling**: Manejo de errores con mensajes claros

## 🎨 Diseño

### Pantalla de Login
- Fondo con degradado morado
- Tarjeta con elevación y bordes redondeados
- Logo emoji 🔐
- Campos de texto con Material Design
- Toggle para mostrar/ocultar contraseña
- Botón de login con gradient
- ProgressBar durante la carga
- Credenciales de demo visibles

### Pantallas nuevas
- **Home**: estado del dispositivo (autorizado/evento/mode)
- **TopupScreen**: monto + lectura NFC + estado y saldo
- **BalanceScreen**: lectura NFC + estado y saldo

## 🏗️ Arquitectura

### Capas

```
app/
├── data/
│   ├── api/
│   │   ├── ApiService.kt          # Interface de Retrofit
│   │   ├── AuthInterceptor.kt     # Interceptor JWT
│   │   └── RetrofitClient.kt      # Cliente HTTP
│   ├── model/
│   │   ├── Models.kt              # Login models
│   │   ├── DeviceSessionModels.kt # Session models
│   │   ├── WristbandModels.kt     # Init request/response
│   │   └── TransactionModels.kt   # Topup/balance models
│   └── repository/
│       ├── AuthRepository.kt      # Auth/token
│       ├── DeviceRepository.kt    # DeviceId (DataStore)
│       └── OperationsRepository.kt # Operaciones NFC
├── nfc/
│   ├── NfcPayload.kt              # Payload tagId/ctr/sig
│   └── NfcUtils.kt                # Lectura/escritura RAW
├── MainActivity.kt                # Login
├── HomeActivity.kt                # Home + sesión del dispositivo
├── TopupActivity.kt               # Top-up NFC
└── BalanceActivity.kt             # Balance NFC
```

### Patrones Utilizados

- **Repository Pattern**: Abstracción de fuentes de datos
- **MVVM-Light**: Activities manejan UI y estado
- **Coroutines**: Para operaciones asíncronas
- **ViewBinding**: Acceso seguro a vistas

## 🔐 Autenticación

### Credenciales de Demo
- **Email**: `admin@example.com`
- **Password**: `admin123`

### Flujo de Autenticación

1. Usuario ingresa credenciales
2. Se valida el formato del email y longitud de contraseña
3. Se hace POST a `/auth/login`
4. El backend devuelve token JWT y datos del usuario
5. Se guarda el token en SharedPreferences
6. Se navega a Home
7. Home consulta `/devices/session` y muestra autorización

## 🔐 NFC y permisos

La app usa reader mode (NFC-A) y lectura RAW de páginas (NTAG213).

En `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="false" />
```

## 🧪 Cómo probar

### Backend + DB (local)
1. Levantar MariaDB:
```bash
docker compose up -d mariadb
```

2. Ejecutar migraciones:
```bash
cd backend
npm run migration:run
```

3. Levantar backend:
```bash
npm run start:dev
```

4. Levantar el Web Panel:
```bash
cd ../web-panel
npm run dev
```

5. Abrir el **Web Panel** y:
   - Iniciar sesión como admin.
   - Crear un evento en la pestaña **Eventos**.
   - Autorizar el dispositivo con el **Device ID** que muestra la Home de Android.

### Emulador
- La **lectura NFC no funciona** en emulador para NTAG213.
- Podés probar login y sesión del dispositivo, pero no top-up/balance.

### Samsung / dispositivo real
1. Activa NFC.
2. Abre Top-up o Balance.
3. Toca una pulsera NTAG213 virgen o inicializada.
4. La app:
   - llama `/wristbands/init`
   - si está virgen, escribe `tagId+ctr+sig` en RAW pages
   - lee payload RAW y ejecuta `/topups` o `/balance-check`

### Flujo exacto en Android
1. Login con `admin@example.com` / `admin123`.
2. Home muestra el `Device ID` y si el dispositivo está autorizado.
3. Entrar a **Cargar saldo (Top-up)**.
4. Ingresar monto en centavos y tocar “Leer pulsera y cargar”.
5. Tocar la pulsera NTAG213 (virgen o inicializada).
6. Ver `STATUS` y `Saldo` en pantalla + debug UID/TAG/CTR/SIG.

### NFC RAW pages (NTAG213)
- Se usa **Reader Mode** (NFC-A).
- Se leen páginas desde la **página 4**, 8 páginas en total (32 bytes).
- Payload RAW: `tagId(16)` + `ctr(4)` + `sig(8)` = 28 bytes.

## ⚠️ Manejo de errores

- **401**: cierra sesión automáticamente.
- **DECLINED / validación**: muestra mensaje del backend.
- **Timeout**: reintenta con el mismo `transactionId` en el próximo toque.

### Persistencia de Sesión

```kotlin
// Guardar token
authRepository.saveToken(token)

// Verificar si hay sesión
val isLoggedIn = authRepository.isLoggedIn()

// Cerrar sesión
authRepository.logout()
```

## 📦 Dependencias Principales

```gradle
// Networking
implementation 'com.squareup.retrofit2:retrofit:2.9.0'
implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
implementation 'com.squareup.okhttp3:logging-interceptor:4.12.0'

// Coroutines
implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'

// Material Design
implementation 'com.google.android.material:material:1.11.0'
```

## 🐛 Troubleshooting

### Error de Conexión

**Problema**: La app no puede conectarse al backend

**Soluciones**:
1. Verifica que el backend esté corriendo en `http://localhost:3000`
2. Para emulador, usa `http://10.0.2.2:3000/`
3. Para dispositivo físico, usa tu IP local
4. Asegúrate de que `usesCleartextTraffic="true"` esté en AndroidManifest.xml

### Error "Unable to resolve host"

**Solución**: Verifica la configuración de red y la URL del BASE_URL

### La app se cierra al iniciar

**Solución**: Revisa los logs de Android Studio (Logcat) para ver el error específico

## 🚧 Mejoras Futuras

- [ ] Implementar refresh tokens
- [ ] Agregar biometría (huella digital / Face ID)
- [ ] Implementar registro de nuevos usuarios
- [ ] Agregar recuperación de contraseña
- [ ] Implementar "Recordarme"
- [ ] Agregar validación de red antes de hacer peticiones
- [ ] Agregar animaciones de transición
- [ ] Implementar ViewModel para mejor arquitectura
- [ ] Agregar tests unitarios e instrumentales

## 📄 Licencia

MIT License
