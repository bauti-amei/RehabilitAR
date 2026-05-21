import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getMisClasesRequest, getClasesOfertadasRequest, asignarseClaseRequest } from '../../api/clases'
import styles from './Dashboard.module.css'

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const NOTIFICACIONES_PANEL = []

/* ── Calcula la próxima clase del profesor ─────────────── */
function calcularProximaClase(clases) {
  if (!clases.length) return null
  const ahora  = new Date()
  const hoyIdx = (ahora.getDay() + 6) % 7
  const horaStr = ahora.toTimeString().slice(0, 5)

  let mejor = null
  let mejorDias = Infinity

  for (const c of clases) {
    let diasHasta = Infinity
    if (c.tipo_clase === 'individual') {
      if (!c.fecha) continue
      const fechaClase = new Date(c.fecha + 'T00:00:00')
      const hoy        = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
      const diff       = Math.round((fechaClase - hoy) / 86400000)
      if (diff < 0) continue
      if (diff === 0 && c.horario_fin < horaStr) continue
      diasHasta = diff
    } else {
      const idxClase = DIAS_SEMANA.indexOf(c.dias)
      if (idxClase === -1) continue
      let diff = idxClase - hoyIdx
      if (diff < 0) diff += 7
      if (diff === 0 && c.horario_fin < horaStr) diff = 7
      diasHasta = diff
    }
    if (diasHasta < mejorDias || (diasHasta === mejorDias && c.horario_inicio < mejor?.horario_inicio)) {
      mejorDias = diasHasta
      mejor = { ...c, diasHasta }
    }
  }
  return mejor
}

/* ══════════════════════════════════════════════════════════
   MODAL GENÉRICO
   ══════════════════════════════════════════════════════════ */
function Modal({ title, onClose, children, wide }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${wide ? styles.modalWide : ''}`}
        onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   PRÓXIMA CLASE + NOTIFICACIONES
   ══════════════════════════════════════════════════════════ */
function TopRow({ clases, cargando }) {
  const [detalleModal, setDetalle] = useState(false)
  const proxima = cargando ? null : calcularProximaClase(clases)

  function labelFecha(c) {
    if (!c) return ''
    if (c.tipo_clase === 'individual') {
      return new Date(c.fecha + 'T00:00:00')
        .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    }
    if (c.diasHasta === 0) return `Hoy — ${c.horario_inicio.slice(0,5)} hs`
    if (c.diasHasta === 1) return `Mañana — ${c.horario_inicio.slice(0,5)} hs`
    return `${c.dias} — ${c.horario_inicio.slice(0,5)} hs`
  }

  return (
    <div className={styles.topRow}>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Próxima clase</h2>
        {cargando ? (
          <div className={styles.emptyState}><p>Cargando...</p></div>
        ) : !proxima ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📅</span>
            <p>No tenés clases próximas asignadas</p>
          </div>
        ) : (
          <div className={styles.proximaInfo}>
            <div className={styles.proximaRow}>
              <span className={styles.proximaLabel}>Clase</span>
              <span className={styles.proximaValor}>{proxima.nombre}</span>
            </div>
            <div className={styles.proximaRow}>
              <span className={styles.proximaLabel}>Especialidad</span>
              <span className={styles.proximaValor}>{proxima.especialidad_display}</span>
            </div>
            <div className={styles.proximaRow}>
              <span className={styles.proximaLabel}>Cuándo</span>
              <span className={styles.proximaValor}>{labelFecha(proxima)}</span>
            </div>
            <div className={styles.proximaRow}>
              <span className={styles.proximaLabel}>Horario</span>
              <span className={styles.proximaValor}>{proxima.horario}</span>
            </div>
            <div className={styles.proximaRow}>
              <span className={styles.proximaLabel}>Aula</span>
              <span className={styles.proximaValor}>{proxima.aula || '—'}</span>
            </div>
            <button className={styles.verDetalleBtn} onClick={() => setDetalle(true)}>Ver detalle</button>
          </div>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Últimas notificaciones</h2>
        {NOTIFICACIONES_PANEL.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔔</span>
            <p>No tenés notificaciones recientes</p>
          </div>
        ) : (
          <div className={styles.notifPanelList}>
            {NOTIFICACIONES_PANEL.slice(0, 4).map(n => (
              <div key={n.id} className={`${styles.notifPanelItem} ${!n.leida ? styles.notifUnread : ''}`}>
                {!n.leida && <span className={styles.notifDot} />}
                <div>
                  <p className={styles.notifTexto}>{n.texto}</p>
                  <p className={styles.notifHora}>{n.hora}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {detalleModal && proxima && (
        <Modal title={proxima.nombre} onClose={() => setDetalle(false)}>
          <div className={styles.detalleGrid}>
            <span>Especialidad</span>  <span>{proxima.especialidad_display}</span>
            <span>Horario</span>       <span>{proxima.horario}</span>
            <span>Días</span>          <span>{proxima.dias}</span>
            <span>Aula</span>          <span>{proxima.aula || '—'}</span>
            <span>Inscriptos</span>    <span>{proxima.cantidad_inscriptos}/{proxima.cupo}</span>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   ÁREA DE ASISTENCIA
   ══════════════════════════════════════════════════════════ */
function AreaAsistencia({ clases }) {
  const [busqueda,  setBusqueda]  = useState('')
  const [qrModal,   setQrModal]   = useState(false)
  const [userModal, setUserModal] = useState(null)

  const ahora   = new Date().toTimeString().slice(0, 5)
  const hoyIdx  = (new Date().getDay() + 6) % 7
  const claseActiva = clases.find(c => {
    if (c.horario_inicio > ahora || c.horario_fin <= ahora) return false
    if (c.tipo_clase === 'individual') return c.fecha === new Date().toISOString().slice(0, 10)
    return DIAS_SEMANA.indexOf(c.dias) === hoyIdx
  }) || null

  const inscriptosFiltrados = claseActiva
    ? (claseActiva.inscriptos_detalle || []).filter(u =>
        u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.nombre.toLowerCase().includes(busqueda.toLowerCase())
      )
    : []

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            Asistencia
            {claseActiva && <span className={styles.claseActivaBadge}> — {claseActiva.nombre}</span>}
          </h2>
          {!claseActiva && <p className={styles.sectionSubtitle}>Esta sección se habilita cuando comienza tu clase</p>}
        </div>
        {claseActiva && (
          <button className={styles.qrBtn} onClick={() => setQrModal(true)}>📱 Ver QR para asistencia</button>
        )}
      </div>

      {!claseActiva ? (
        <div className={styles.asistenciaDisabled}>
          <span className={styles.emptyIcon}>🔒</span>
          <p>No hay ninguna clase en curso en este momento</p>
        </div>
      ) : (
        <>
          <div className={styles.buscarRow}>
            <input className={styles.buscador} type="text"
              placeholder="Buscar usuario por mail o nombre..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            <button className={styles.btnPrimary} disabled={!busqueda.trim()}>Registrar asistencia</button>
          </div>
          <div className={styles.inscriptosList}>
            {inscriptosFiltrados.length === 0 ? (
              <p className={styles.noResultados}>No se encontraron usuarios.</p>
            ) : inscriptosFiltrados.map(u => (
              <div key={u.id} className={styles.inscriptoRow}>
                <button className={styles.inscriptoNombre} onClick={() => setUserModal(u)}>{u.nombre}</button>
                <span className={u.presente ? styles.badgePresente : styles.badgeAusente}>
                  {u.presente ? 'Presente' : 'Ausente'}
                </span>
                <button className={styles.registrarBtn}>Registrar asistencia</button>
              </div>
            ))}
          </div>
        </>
      )}

      {qrModal && (
        <Modal title="QR de asistencia" onClose={() => setQrModal(false)}>
          <div className={styles.qrPlaceholder}>
            <div className={styles.qrBox}>QR</div>
            <p className={styles.qrDesc}>Mostrá este código a tus alumnos para que registren su asistencia.</p>
          </div>
        </Modal>
      )}
      {userModal && (
        <Modal title={userModal.nombre} onClose={() => setUserModal(null)}>
          <div className={styles.detalleGrid}>
            <span>Email</span>    <span>{userModal.email}</span>
            <span>Teléfono</span> <span>{userModal.telefono || '—'}</span>
          </div>
        </Modal>
      )}
    </section>
  )
}

/* ══════════════════════════════════════════════════════════
   CURSOS QUE DICTA
   ══════════════════════════════════════════════════════════ */
function MisClases({ clases, cargando }) {
  const [claseModal, setClaseModal] = useState(null)
  const [userModal,  setUserModal]  = useState(null)

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Cursos que dicta</h2>
      {cargando ? (
        <p className={styles.noResultados}>Cargando clases...</p>
      ) : clases.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🏫</span>
          <p>No tenés clases asignadas aún</p>
        </div>
      ) : (
        <div className={styles.misClasesList}>
          {clases.map(c => (
            <div key={c.id} className={styles.miClaseRow}>
              <div className={styles.miClaseInfo}>
                <p className={styles.miClaseNombre}>{c.nombre}</p>
                <p className={styles.miClaseMeta}>
                  {c.especialidad_display} · {c.dias}
                  {c.tipo_clase === 'individual' && c.fecha ? ` ${c.fecha}` : ''} · {c.horario} · {c.aula || 'Sin sala'}
                </p>
                <p className={styles.miClaseCupo}>{c.cantidad_inscriptos}/{c.cupo} inscriptos</p>
              </div>
              <button className={styles.verInscriptosBtn}
                onClick={() => { setClaseModal(c); setUserModal(null) }}>
                Ver usuarios inscriptos
              </button>
            </div>
          ))}
        </div>
      )}

      {claseModal && (
        <Modal title={`Inscriptos — ${claseModal.nombre}`}
          onClose={() => { setClaseModal(null); setUserModal(null) }} wide>
          {(claseModal.inscriptos_detalle || []).length === 0 ? (
            <p className={styles.emptyMsg}>No hay usuarios inscriptos en esta clase.</p>
          ) : (
            <div className={styles.inscriptosModalList}>
              {claseModal.inscriptos_detalle.map(u => (
                <div key={u.id} className={styles.inscriptoModalRow}>
                  <div>
                    <button className={styles.inscriptoNombre} onClick={() => setUserModal(u)}>{u.nombre}</button>
                    <p className={styles.inscriptoEmail}>{u.email}</p>
                  </div>
                  <button className={styles.suspenderBtn}>Suspender</button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {userModal && (
        <Modal title={userModal.nombre} onClose={() => setUserModal(null)}>
          <div className={styles.detalleGrid}>
            <span>Email</span>    <span>{userModal.email}</span>
            <span>Teléfono</span> <span>{userModal.telefono || '—'}</span>
          </div>
        </Modal>
      )}
    </section>
  )
}

/* ══════════════════════════════════════════════════════════
   ASIGNARSE A UNA CLASE
   ══════════════════════════════════════════════════════════ */
function AsignarseClase({ onAsignado }) {
  const [open,      setOpen]      = useState(false)
  const [clases,    setClases]    = useState([])
  const [cargando,  setCargando]  = useState(false)
  const [asignando, setAsignando] = useState(null)
  const [error,     setError]     = useState('')
  const [exito,     setExito]     = useState('')

  const abrir = () => {
    setOpen(true)
    setError('')
    setExito('')
    setCargando(true)
    getClasesOfertadasRequest()
      .then(res => setClases(res.data))
      .catch(() => { setClases([]); setError('No se pudieron cargar las clases disponibles.') })
      .finally(() => setCargando(false))
  }

  const handleAsignarse = async (clase) => {
    setAsignando(clase.id)
    setError('')
    setExito('')
    try {
      await asignarseClaseRequest(clase.id)
      setExito(`¡Te asignaste correctamente a "${clase.nombre}"!`)
      setClases(prev => prev.filter(c => c.id !== clase.id))
      onAsignado()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Error al asignarse a la clase.')
    } finally {
      setAsignando(null)
    }
  }

  return (
    <>
      <div className={styles.asignarseRow}>
        <button className={styles.btnOutline} onClick={abrir}>+ Asignarse a una clase</button>
      </div>

      {open && (
        <Modal title="Clases disponibles para asignarse" onClose={() => setOpen(false)} wide>
          {error && <p className={styles.formError} style={{ marginBottom: '1rem' }}>{error}</p>}
          {exito && <p className={styles.formExito} style={{ marginBottom: '1rem' }}>{exito}</p>}

          {cargando ? (
            <p className={styles.noResultados}>Cargando clases ofertadas...</p>
          ) : clases.length === 0 ? (
            <div className={styles.emptyState} style={{ padding: '1.5rem 0' }}>
              <span className={styles.emptyIcon}>📋</span>
              <p>No hay clases disponibles para tu especialidad en este momento</p>
            </div>
          ) : (
            <div className={styles.ofertadasList}>
              {clases.map(c => (
                <div key={c.id} className={styles.ofertadaRow}>
                  <div className={styles.ofertadaInfo}>
                    <p className={styles.ofertadaNombre}>{c.nombre}</p>
                    <p className={styles.ofertadaMeta}>
                      {c.especialidad_display} · {c.dias}
                      {c.tipo_clase === 'individual' && c.fecha ? ` ${c.fecha}` : ''} · {c.horario} · {c.aula || 'Sin sala'}
                    </p>
                    <p className={styles.ofertadaCupo}>{c.cantidad_inscriptos}/{c.cupo} inscriptos</p>
                    {c.descripcion && <p className={styles.ofertadaDesc}>{c.descripcion}</p>}
                  </div>
                  <button className={styles.btnAsignarse}
                    onClick={() => handleAsignarse(c)}
                    disabled={asignando === c.id}>
                    {asignando === c.id ? 'Asignando...' : 'Asignarme'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD PRINCIPAL
   ══════════════════════════════════════════════════════════ */
export default function TeacherDashboard() {
  const { user } = useAuth()
  const [clases,   setClases]   = useState([])
  const [cargando, setCargando] = useState(true)

  const cargarMisClases = () => {
    getMisClasesRequest()
      .then(res => setClases(res.data))
      .catch(() => setClases([]))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargarMisClases() }, [])

  return (
    <div className={styles.container}>
      <div className={styles.greeting}>
        <h1>Bienvenido, <span>{user?.first_name}</span> 👋</h1>
        <p>Panel del profesor — RehabilitAR</p>
      </div>
      <TopRow clases={clases} cargando={cargando} />
      <AreaAsistencia clases={clases} />
      <MisClases clases={clases} cargando={cargando} />
      <AsignarseClase onAsignado={cargarMisClases} />
    </div>
  )
}
