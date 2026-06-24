import { useEffect, useState } from 'react'
import { getMiAsistenciaRequest } from '../../api/clases'

function formatFechaCorta(str) {
  const [y, m, d] = str.split('-')
  const date = new Date(+y, +m - 1, +d)
  return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function AsistenciasModal({ claseId, claseNombre, onClose }) {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando]   = useState(true)

  useEffect(() => {
    getMiAsistenciaRequest(claseId)
      .then(r => setRegistros(r.data))
      .catch(() => setRegistros([]))
      .finally(() => setCargando(false))
  }, [claseId])

  const presentes = registros.filter(r => r.asistio).length
  const ausentes  = registros.filter(r => !r.asistio).length

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,31,23,0.65)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999,
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(160deg,#e8f5ee,#daeee3)',
        border: '1px solid #b8dece', borderRadius: '20px',
        padding: '1.5rem 1.75rem', width: '100%', maxWidth: '480px',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ color: '#0f1f17', fontWeight: 700, margin: 0, fontSize: '1.05rem' }}>Mis asistencias</h3>
            <p style={{ color: '#3d6b55', fontSize: '0.82rem', margin: '2px 0 0' }}>{claseNombre}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#3d6b55' }}>✕</button>
        </div>

        {!cargando && registros.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '0.6rem', textAlign: 'center' }}>
              <p style={{ color: '#16a34a', fontWeight: 700, fontSize: '1.4rem', margin: 0 }}>{presentes}</p>
              <p style={{ color: '#3d6b55', fontSize: '0.78rem', margin: 0 }}>Presentes</p>
            </div>
            <div style={{ flex: 1, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '0.6rem', textAlign: 'center' }}>
              <p style={{ color: '#dc2626', fontWeight: 700, fontSize: '1.4rem', margin: 0 }}>{ausentes}</p>
              <p style={{ color: '#3d6b55', fontSize: '0.78rem', margin: 0 }}>Ausentes</p>
            </div>
            <div style={{ flex: 1, background: 'rgba(26,157,133,0.10)', border: '1px solid rgba(26,157,133,0.25)', borderRadius: '10px', padding: '0.6rem', textAlign: 'center' }}>
              <p style={{ color: '#1a7a68', fontWeight: 700, fontSize: '1.4rem', margin: 0 }}>{registros.length}</p>
              <p style={{ color: '#3d6b55', fontSize: '0.78rem', margin: 0 }}>Total</p>
            </div>
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {cargando ? (
            <p style={{ textAlign: 'center', color: '#3d6b55', padding: '2rem 0' }}>Cargando...</p>
          ) : registros.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>No hay clases registradas aún.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {registros.map(r => (
                <div key={r.fecha} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: r.asistio ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.07)',
                  border: `1px solid ${r.asistio ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}`,
                  borderRadius: '10px', padding: '0.55rem 0.9rem',
                }}>
                  <span style={{ color: '#1a2e25', fontSize: '0.88rem', fontWeight: 500 }}>
                    {formatFechaCorta(r.fecha)}
                  </span>
                  <span style={{
                    fontSize: '0.82rem', fontWeight: 600,
                    color: r.asistio ? '#16a34a' : '#dc2626',
                  }}>
                    {r.asistio ? '✅ Presente' : '❌ Ausente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          style={{ marginTop: '1rem', width: '100%', padding: '0.65rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#1a9d85,#147a68)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
