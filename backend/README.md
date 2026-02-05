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
