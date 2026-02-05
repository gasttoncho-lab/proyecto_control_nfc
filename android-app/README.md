# App Android - Login con Kotlin

Aplicación Android nativa con sistema de autenticación.

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

### Para Emulador Android

La configuración por defecto funciona con el emulador:

```kotlin
const val BASE_URL = "http://10.10.0.155:3000/"
```

`10.0.2.2` es la IP especial del emulador que apunta a `localhost` de tu computadora.

### Para Dispositivo Físico

1. Asegúrate de que tu computadora y dispositivo estén en la misma red WiFi
2. Obtén la IP de tu computadora:
   - Windows: Ejecuta `ipconfig` en cmd
   - Mac/Linux: Ejecuta `ifconfig` en terminal
3. Edita `app/src/main/java/com/example/loginapp/data/api/ApiService.kt`:

```kotlin
const val BASE_URL = "http://10.10.0.155:3000/"
// Ejemplo: "http://192.168.1.100:3000/"
```

## ✨ Funcionalidades

- ✅ **Login**: Autenticación con email y contraseña
- ✅ **Validación**: Validación de formularios en tiempo real
- ✅ **Sesión Persistente**: El token se guarda en SharedPreferences
- ✅ **Auto-login**: Si hay sesión activa, va directo a Home
- ✅ **Home Screen**: Pantalla de bienvenida con datos del usuario
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

### Pantalla de Home
- Mismo fondo degradado para consistencia
- Emoji de éxito ✅
- Mensaje de bienvenida
- Tarjeta con información del usuario
- Botón de cerrar sesión en rojo

## 🏗️ Arquitectura

### Capas

```
app/
├── data/
│   ├── api/
│   │   ├── ApiService.kt         # Interface de Retrofit
│   │   └── RetrofitClient.kt     # Cliente HTTP
│   ├── model/
│   │   └── Models.kt              # Data classes
│   └── repository/
│       └── AuthRepository.kt      # Lógica de negocio
├── MainActivity.kt                # Pantalla de login
└── HomeActivity.kt                # Pantalla después del login
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
6. Se navega a HomeActivity
7. HomeActivity carga los datos del usuario guardados

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
- [ ] Implementar DataStore en lugar de SharedPreferences
- [ ] Agregar animaciones de transición
- [ ] Implementar ViewModel para mejor arquitectura
- [ ] Agregar tests unitarios e instrumentales

## 📄 Licencia

MIT License
