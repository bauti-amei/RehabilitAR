# Rehabilitar — Frontend

## Requisitos
- Node.js 18+
- npm 9+

## Instalación y arranque

```bash
# Desde la carpeta /frontend
npm install
npm run dev
```

El sitio corre en http://localhost:3000

## Estructura

```
src/
├── api/          → Llamadas HTTP al backend (axios)
├── components/   → Componentes reutilizables (Sidebar, Layout, ProtectedRoute)
├── context/      → AuthContext: usuario logueado y rol
├── hooks/        → useAuth()
├── pages/        → Páginas separadas por rol (admin, teacher, receptionist, client)
└── utils/        → Constantes de roles y helpers
```

## Usuarios de prueba (cuando el backend esté listo)

| Rol           | Email                      | Contraseña |
|---------------|----------------------------|------------|
| Admin         | admin@rehabilitar.com      | admin123   |
| Profesor      | profesor@rehabilitar.com   | prof123    |
| Recepcionista | recep@rehabilitar.com      | recep123   |
| Cliente       | cliente@rehabilitar.com    | cliente123 |

## Notas

- El frontend espera el backend en `http://localhost:8000/api`
- El proxy de Vite redirige `/api/*` al backend automáticamente en desarrollo
- La autenticación usa JWT; el token se guarda en `localStorage`
