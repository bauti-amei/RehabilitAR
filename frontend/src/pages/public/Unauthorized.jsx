import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { HOME_BY_ROLE } from '../../utils/roles'

export default function Unauthorized() {
  const { user } = useAuth()
  const navigate = useNavigate()
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', minHeight:'100vh', gap:'16px', textAlign:'center', padding:'32px' }}>
      <h1 style={{ fontSize:'4rem', fontFamily:'var(--font-display)', color:'var(--color-danger)' }}>403</h1>
      <p style={{ color:'var(--color-text-muted)' }}>No tenés permiso para acceder a esta página.</p>
      <button className="btn btn-primary" onClick={() => navigate(HOME_BY_ROLE[user?.role] ?? '/login')}>
        Volver al inicio
      </button>
    </div>
  )
}
