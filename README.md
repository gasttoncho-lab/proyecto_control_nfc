# 🔐 Sistema de Login Completo

Sistema de autenticación completo con:
- **Backend**: API REST con NestJS
- **Panel Web**: Interfaz de gestión de usuarios con React
- **App Android**: Aplicación móvil en Kotlin

## 📁 Estructura del Proyecto

```
login-project/
├── backend/          # API REST con NestJS
├── web-panel/        # Panel de administración web con React
└── android-app/      # Aplicación Android en Kotlin
```

## 🚀 Inicio Rápido

### 1. Backend (NestJS)

```bash
cd backend
npm install
npm run start:dev
```

El servidor estará corriendo en `http://localhost:3000`

**Endpoints disponibles:**
- `POST /auth/login` - Iniciar sesión
- `GET /auth/me` - Obtener perfil del usuario autenticado
- `GET /users` - Listar todos los usuarios (requiere autenticación)
- `POST /users` - Crear nuevo usuario (requiere autenticación)
- `PUT /users/:id` - Actualizar usuario (requiere autenticación)
- `DELETE /users/:id` - Eliminar usuario (requiere autenticación)

**Usuario por defecto:**
- Email: `admin@example.com`
- Password: `admin123`

### 2. Panel Web (React)

```bash
cd web-panel
npm install
npm run dev
```

La aplicación web estará disponible en `http://localhost:5173`

**Funcionalidades:**
- ✅ Login con validación
- ✅ Lista de usuarios registrados
- ✅ Crear nuevos usuarios
- ✅ Editar usuarios existentes
- ✅ Eliminar usuarios
- ✅ Sesión persistente

### 3. App Android (Kotlin)

**Requisitos:**
- Android Studio Arctic Fox o superior
- SDK de Android 24 o superior
- Gradle 8.1+

**Pasos:**
1. Abre el proyecto `android-app` en Android Studio
2. Sincroniza Gradle
3. Configura la URL de la API en `ApiService.kt`:
   - Para emulador: `http://10.0.2.2:3000/` (ya configurado)
   - Para dispositivo físico: Cambia a `http://TU_IP_LOCAL:3000/`
4. Ejecuta la aplicación

**Funcionalidades:**
- ✅ Pantalla de login con validación
- ✅ Persistencia de sesión
- ✅ Pantalla de bienvenida con datos del usuario
- ✅ Cerrar sesión
- ✅ Interfaz moderna con Material Design

#### Flujo de cobro CHARGE (solo UI)
1. En Web Admin se autoriza el device en modo **CHARGE** con un **boothId** asignado.
2. En Android, Home muestra **Evento + Booth** con `authorized=true`.
3. En pantalla de cobro se seleccionan productos y se valida el **total grande**.
4. Se acerca la pulsera por NFC y el flujo responde **APPROVED** cuando el cobro fue exitoso.

## 🔧 Configuración

### Cambiar la Clave Secreta JWT

En `backend/src/app.module.ts` y `backend/src/auth/jwt.strategy.ts`, cambia:
```typescript
secret: 'your-secret-key-change-in-production'
```

### Conectar desde Dispositivo Android Real

1. Asegúrate de que tu computadora y dispositivo estén en la misma red WiFi
2. Obtén la IP de tu computadora:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` o `ip addr`
3. En `android-app/app/src/main/java/com/example/loginapp/data/api/ApiService.kt`:
   ```kotlin
   const val BASE_URL = "http://TU_IP:3000/"
   ```

## 📝 Notas Importantes

### Backend
- Los datos se almacenan en memoria (para producción, usar una base de datos real)
- Las contraseñas se hashean con bcrypt
- Tokens JWT con expiración de 24 horas
- CORS habilitado para desarrollo

### Panel Web
- Token guardado en localStorage
- Validación de formularios
- Manejo de errores
- Diseño responsive

### App Android
- ViewBinding para acceso a vistas
- Retrofit para llamadas HTTP
- Coroutines para operaciones asíncronas
- SharedPreferences para persistencia de sesión
- Validación de formularios
- Material Design 3

## 🔐 Seguridad

**Para producción, considera:**
- ✅ Usar HTTPS
- ✅ Implementar refresh tokens
- ✅ Agregar rate limiting
- ✅ Validar entrada de datos más estrictamente
- ✅ Usar variables de entorno para secrets
- ✅ Implementar base de datos real (PostgreSQL, MongoDB, etc.)
- ✅ Agregar logs de auditoría
- ✅ Implementar 2FA

## 📱 Capturas de Pantalla

### Panel Web
- Login con validación
- Dashboard con lista de usuarios
- Formularios para crear/editar usuarios

### App Android
- Pantalla de login moderna
- Pantalla de bienvenida
- Diseño con gradientes y Material Design

## 🛠️ Stack Tecnológico

**Backend:**
- NestJS
- TypeScript
- JWT para autenticación
- Bcrypt para hash de contraseñas
- Passport.js

**Web Panel:**
- React 18
- Vite
- Axios
- CSS moderno

**Android App:**
- Kotlin
- Retrofit
- Coroutines
- Material Design Components
- ViewBinding

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.


## 📊 MVP B — Reportes y Cierre de Caja

### Endpoints de reportes (ADMIN)
- `GET /reports/events/:eventId/summary`
- `GET /reports/events/:eventId/by-booth`
- `GET /reports/events/:eventId/transactions?boothId=&from=&to=&page=&limit=`
- `GET /reports/events/:eventId/export.csv`

### Flujo recomendado
1. Crear evento en panel admin.
2. Autorizar dispositivos (TOPUP/CHARGE) para el evento.
3. Realizar cobros desde Android (prepare/commit).
4. Ir a **Reportes / Cierre** en el web-panel, seleccionar evento, revisar métricas y exportar CSV.

### Alcance explícito de esta etapa
- ✅ Reportes por evento y por booth.
- ✅ Listado de transacciones CHARGE con filtros/paginación.
- ✅ Exportación CSV de cobros aprobados.
- ❌ Ventas por producto (fuera de alcance; requiere fase **B2** con persistencia de ítems por transacción).
