import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { HOME_BY_ROLE } from '../../utils/roles'

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth()
  if (loading) return <div>Cargando…</div>
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const home = HOME_BY_ROLE[user.role] ?? '/'
    return <Navigate to={home} replace />
  }
  return children
}
