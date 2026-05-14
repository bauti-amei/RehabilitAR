import { useAuth } from '../../hooks/useAuth'

export default function ClientDashboard() {
  const { user } = useAuth()
  return (
    <div>
      <h1 style={{ fontFamily:'var(--font-display)', marginBottom:'8px' }}>Hola, {user?.name}</h1>
      <p style={{ color:'var(--color-text-muted)' }}>Tu espacio en Rehabilitar</p>
    </div>
  )
}
