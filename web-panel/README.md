# Panel Web - Administración

Panel de administración web para gestionar usuarios, eventos y autorizaciones de dispositivos.

## 🚀 Instalación

```bash
npm install
```

## 🏃 Ejecutar en Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 🔨 Build para Producción

```bash
npm run build
npm run preview
```

## ✨ Funcionalidades

- ✅ **Login**: Autenticación con email y contraseña
- ✅ **Dashboard**: Vista general con pestañas
- ✅ **Crear Usuarios**: Formulario para agregar nuevos usuarios
- ✅ **Editar Usuarios**: Modificar información de usuarios existentes
- ✅ **Eliminar Usuarios**: Borrar usuarios del sistema
- ✅ **Eventos**: Crear y listar eventos OPEN/CLOSED
- ✅ **Dispositivos**: Autorizar/revocar dispositivos por usuario y evento
- ✅ **Sesión Persistente**: El token se guarda en localStorage
- ✅ **Validación de Formularios**: Validación en cliente
- ✅ **Manejo de Errores**: Mensajes claros de error
- ✅ **Diseño Responsive**: Funciona en móviles y escritorio

## 🎨 Diseño

- Fondo con degradado morado
- Tarjetas con sombras y bordes redondeados
- Formularios con Material Design
- Tabla de usuarios con hover effects
- Modales para crear/editar usuarios
- Mensajes de éxito y error
- Pestañas para usuarios, eventos y dispositivos

## 🔐 Autenticación

El usuario por defecto es:
- **Email**: `admin@example.com`
- **Password**: `admin123`

El token JWT se guarda en localStorage y se envía en todas las peticiones autenticadas.

## 📱 Capturas de Pantalla

### Pantalla de Login
- Campo de email con validación
- Campo de contraseña con toggle de visibilidad
- Botón de inicio de sesión
- Mensaje con credenciales de demo

### Dashboard
- Header con título y botón de cerrar sesión
- Pestañas: Usuarios / Eventos / Dispositivos
- Formularios para eventos y dispositivos
- Botones de editar y eliminar para cada usuario

### Modal de Usuario
- Formulario para crear/editar usuarios
- Campos: nombre, email, contraseña
- Validación en tiempo real
- Botones de cancelar y guardar

## ⚙️ Configuración

### Cambiar URL del Backend

Edita `src/App.jsx`:

```javascript
const API_URL = 'http://localhost:3000'
```

## 📦 Estructura del Proyecto

```
src/
├── App.jsx           # Componente principal con toda la lógica
├── main.jsx          # Punto de entrada
└── index.css         # Estilos globales
```

## 🛠️ Stack Tecnológico

- **React 18**: Biblioteca de UI
- **Vite**: Build tool rápido
- **Axios**: Cliente HTTP
- **CSS Modules**: Estilos encapsulados

## 🚧 Mejoras Futuras

- [ ] Implementar paginación en la tabla de usuarios
- [ ] Agregar búsqueda y filtros
- [ ] Implementar ordenamiento de columnas
- [ ] Agregar roles de usuario
- [ ] Implementar confirmación de eliminación mejorada
- [ ] Agregar indicadores de carga
- [ ] Implementar notificaciones toast
- [ ] Agregar modo oscuro
