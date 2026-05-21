import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { HOME_BY_ROLE } from '../../utils/roles'

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <div>Cargando…</div>

  if (user) {
    const home = HOME_BY_ROLE[user.role] ?? '/'
    return <Navigate to={home} replace />
  }

  return children
}
