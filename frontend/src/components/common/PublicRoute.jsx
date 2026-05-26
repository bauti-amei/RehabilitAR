import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { HOME_BY_ROLE } from '../../utils/roles'

export default function PublicRoute({ children }) {
  const { user, loading, logout } = useAuth()

  if (loading) return <div>Cargando…</div>

  if (user) {
    const home = HOME_BY_ROLE[user.role]
    if (!home) {
      // Rol desconocido — limpiar sesión y mostrar login
      logout()
      return children
    }
    return <Navigate to={home} replace />
  }

  return children
}
