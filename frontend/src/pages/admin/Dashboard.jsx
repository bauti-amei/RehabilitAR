import { useAuth } from '../../hooks/useAuth'

export default function AdminDashboard() {
  const { user } = useAuth()
  return (
    <div>
      <h1 style={{ fontFamily:'var(--font-display)', marginBottom:'8px' }}>Bienvenido, {user?.name}</h1>
      <p style={{ color:'var(--color-text-muted)' }}>Panel de administración — Rehabilitar</p>
    </div>
  )
}
