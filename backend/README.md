# Backend - API REST con NestJS

API REST para sistema de autenticación con usuarios y contraseñas.

## 🚀 Instalación

```bash
npm install
```

## 🏃 Ejecutar en Desarrollo

```bash
npm run start:dev
```

## 🗄️ Base de Datos (MariaDB con TypeORM)

1. Copiar variables de entorno de ejemplo:

```bash
cp ../.env.example .env
```

2. Levantar la base de datos con Docker:

```bash
docker compose up -d mariadb
```

3. Ejecutar migraciones:

```bash
npm run migration:run
```

## ✅ Comandos rápidos

- Levantar DB: `docker compose up -d mariadb`
- Correr migraciones: `npm run migration:run`
- Levantar backend: `npm run start:dev`

## 🔨 Build

```bash
npm run build
npm run start
```

## 📋 Endpoints

### Autenticación

#### POST /auth/login
Iniciar sesión con email y contraseña.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "admin@example.com",
    "name": "Admin User"
  }
}
```

#### GET /auth/me
Obtener información del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "1",
  "email": "admin@example.com",
  "name": "Admin User"
}
```

### Usuarios (Requieren Autenticación)

#### GET /users
Listar todos los usuarios.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "1",
    "email": "admin@example.com",
    "name": "Admin User",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### POST /users
Crear un nuevo usuario.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "New User"
}
```

**Response:**
```json
{
  "id": "2",
  "email": "user@example.com",
  "name": "New User",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### PUT /users/:id
Actualizar un usuario existente.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "password": "newpassword123"
}
```

#### DELETE /users/:id
Eliminar un usuario.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

### Eventos (ADMIN)

#### POST /events
Crear un evento.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Festival Primavera"
}
```

**Response (incluye secret):**
```json
{
  "id": "uuid",
  "name": "Festival Primavera",
  "status": "OPEN",
  "hmacSecretHex": "32byteshex...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### GET /events?status=OPEN
Lista eventos filtrados por estado (sin exponer secrets).

#### GET /events/:id
Obtener un evento con sus booths y productos.

**Headers:**
```
Authorization: Bearer <token>
```

#### POST /events/:id/close
Cerrar un evento.

**Headers:**
```
Authorization: Bearer <token>
```

### Booths (ADMIN)

#### POST /events/:id/booths
Crear un booth para un evento.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Bar Principal"
}
```

### Productos (ADMIN)

#### POST /events/:id/products
Crear un producto para un evento.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Bebida",
  "priceCents": 1500,
  "isActive": true
}
```

### Wristbands (ADMIN)

#### POST /wristbands/init
Inicializa una pulsera para un evento (crea wallet si no existía).

**Headers:**
```
Authorization: Bearer <token>
X-Device-Id: <uuid>
```

**Request:**
```json
{
  "uidHex": "a1b2c3d4"
}
```

**Response:**
```json
{
  "alreadyInitialized": false,
  "tagIdHex": "16byteshex...",
  "ctrCurrent": 0,
  "sigHex": "8byteshex..."
}
```

### Topups (ADMIN)

#### POST /topups
Recarga de saldo con idempotencia.

**Headers:**
```
Authorization: Bearer <token>
X-Device-Id: <uuid>
```

**Request:**
```json
{
  "transactionId": "uuid",
  "uidHex": "a1b2c3d4",
  "tagIdHex": "16byteshex...",
  "ctr": 0,
  "sigHex": "8byteshex...",
  "amountCents": 1500
}
```

**Response:**
```json
{
  "status": "APPROVED",
  "balanceCents": 1500
}
```

### Balance Check (ADMIN)

#### POST /balance-check
Consulta de saldo con registro en ledger.

**Headers:**
```
Authorization: Bearer <token>
X-Device-Id: <uuid>
```

**Request:**
```json
{
  "transactionId": "uuid",
  "uidHex": "a1b2c3d4",
  "tagIdHex": "16byteshex...",
  "ctr": 0,
  "sigHex": "8byteshex..."
}
```

**Response:**
```json
{
  "status": "APPROVED",
  "balanceCents": 1500,
  "wristbandStatus": "ACTIVE"
}
```

### Dispositivos (ADMIN)

#### GET /devices
Lista autorizaciones de dispositivos (ADMIN).

#### GET /devices/session
Devuelve la sesión asignada al dispositivo actual.

**Headers:**
```
Authorization: Bearer <token>
X-Device-Id: <uuid>
```

#### POST /devices/authorize
Autoriza un dispositivo para un usuario y evento.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "deviceId": "uuid",
  "userId": "uuid",
  "eventId": "uuid",
  "mode": "TOPUP",
  "boothId": "uuid-optional"
}
```

#### POST /devices/revoke
Revoca un dispositivo autorizado.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "deviceId": "uuid"
}
```

## 🧪 Flujo por UI (Web + Android)

1. Levanta DB y backend (`docker compose up -d mariadb`, `npm run migration:run`, `npm run start:dev`).
2. En el **Web Panel**:
   - Inicia sesión como admin.
   - Crea un evento en la pestaña **Eventos**.
   - Ve a **Dispositivos**, pega el Device ID visible en Android, selecciona usuario y evento OPEN, y autoriza.
3. En Android:
   - Login con `admin@example.com` / `admin123`.
   - Verifica que la Home muestre dispositivo autorizado y evento OPEN.
   - Ejecuta Top-up o Balance con NFC.

## 🔐 Seguridad

- Las contraseñas se hashean con bcrypt (10 rounds)
- JWT con expiración de 24 horas
- CORS habilitado para desarrollo
- Validación de datos con class-validator

## ⚙️ Configuración

### Cambiar Secret JWT

Edita `src/app.module.ts` y `src/auth/jwt.strategy.ts`:

```typescript
secret: 'tu-nuevo-secret-aqui'
```

### Usuario por Defecto

Email: `admin@example.com`
Password: `admin123`

## 📦 Estructura del Proyecto

```
src/
├── auth/
│   ├── auth.controller.ts    # Endpoints de autenticación
│   ├── auth.service.ts        # Lógica de autenticación
│   ├── jwt.strategy.ts        # Estrategia JWT de Passport
│   └── jwt-auth.guard.ts      # Guard para proteger rutas
├── users/
│   ├── users.controller.ts    # Endpoints de usuarios
│   └── users.service.ts       # Lógica de usuarios
├── events/
│   ├── dto/                    # DTOs de eventos
│   ├── entities/               # Entidad Event
│   ├── events.controller.ts    # Endpoints de eventos
│   ├── events.module.ts        # Módulo de eventos
│   └── events.service.ts       # Lógica de eventos
├── booths/
│   ├── dto/                    # DTOs de booths
│   ├── entities/               # Entidad Booth
│   ├── booths.controller.ts    # Endpoints de booths
│   ├── booths.module.ts        # Módulo de booths
│   └── booths.service.ts       # Lógica de booths
├── products/
│   ├── dto/                    # DTOs de productos
│   ├── entities/               # Entidad Product
│   ├── products.controller.ts  # Endpoints de productos
│   ├── products.module.ts      # Módulo de productos
│   └── products.service.ts     # Lógica de productos
├── migrations/
│   └── ...                     # Migraciones TypeORM
├── data-source.ts              # Configuración de migraciones
├── app.module.ts              # Módulo principal
└── main.ts                    # Punto de entrada
```

## 🚧 Para Producción

- [ ] Implementar base de datos real (PostgreSQL, MongoDB, etc.)
- [ ] Usar variables de entorno para secrets
- [ ] Agregar rate limiting
- [ ] Implementar refresh tokens
- [ ] Agregar logs
- [ ] Configurar HTTPS
- [ ] Implementar paginación en listado de usuarios
- [ ] Agregar validaciones más robustas
#### GET /events?status=OPEN
Listar eventos (opcionalmente filtrados por status).

**Headers:**
```
Authorization: Bearer <token>
```
