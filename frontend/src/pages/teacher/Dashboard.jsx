import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import styles from './Dashboard.module.css'

/* ══════════════════════════════════════════════════════════
   MOCK DATA — reemplazar con llamadas a la API cuando estén
   ══════════════════════════════════════════════════════════ */

// null = "No tenés clases próximas"
const PROXIMA_CLASE = null
// Ejemplo cuando haya datos:
// const PROXIMA_CLASE = {
//   id: 1, tipo: 'Tren Superior', horario: 'Hoy 18:00 hs',
//   aula: 'Sala A', dias: 'Lun / Mié / Vie', cupo: 15, inscriptos: 14,
// }

// null = área de asistencia deshabilitada (no hay clase en curso)
const CLASE_EN_CURSO = null
// Ejemplo cuando haya datos:
// const CLASE_EN_CURSO = {
//   id: 1, tipo: 'Tren Superior', horario: '18:00 - 19:00',
//   inscriptos: [
//     { id: 1, nombre: 'Ana García',   email: 'ana@gmail.com',   telefono: '221-4567890', presente: false },
//     { id: 2, nombre: 'Luis Pérez',   email: 'luis@gmail.com',  telefono: '221-9876543', presente: true  },
//   ],
// }

// [] = "No tenés clases asignadas"
const MIS_CLASES = []
// Ejemplo cuando haya datos:
// const MIS_CLASES = [
//   {
//     id: 1, tipo: 'Tren Superior', horario: '08:00 - 09:00', dias: 'Lun / Mié / Vie',
//     aula: 'Sala A', cupo: 15,
//     inscriptos: [
//       { id: 1, nombre: 'Ana García', email: 'ana@gmail.com', telefono: '221-4567890', activo: true },
//     ],
//   },
// ]

// últimas 4 notificaciones
const NOTIFICACIONES_PANEL = []

/* ══════════════════════════════════════════════════════════
   MODAL GENÉRICO
   ══════════════════════════════════════════════════════════ */
function Modal({ title, onClose, children, wide }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${wide ? styles.modalWide : ''}`}
        onClick={e => e.stopPropagation()}
      >
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
   SECCIÓN: PRÓXIMA CLASE + NOTIFICACIONES
   ══════════════════════════════════════════════════════════ */
function TopRow() {
  const [detalleModal, setDetalle] = useState(false)

  return (
    <div className={styles.topRow}>

      {/* Próxima clase */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Próxima clase</h2>
        {PROXIMA_CLASE === null ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📅</span>
            <p>No tenés clases próximas asignadas</p>
          </div>
        ) : (
          <div className={styles.proximaInfo}>
            <div className={styles.proximaRow}>
              <span className={styles.proximaLabel}>Clase</span>
              <span className={styles.proximaValor}>{PROXIMA_CLASE.tipo}</span>
            </div>
            <div className={styles.proximaRow}>
              <span className={styles.proximaLabel}>Fecha</span>
              <span className={styles.proximaValor}>{PROXIMA_CLASE.horario}</span>
            </div>
            <div className={styles.proximaRow}>
              <span className={styles.proximaLabel}>Aula</span>
              <span className={styles.proximaValor}>{PROXIMA_CLASE.aula}</span>
            </div>
            <button className={styles.verDetalleBtn} onClick={() => setDetalle(true)}>
              Ver detalle
            </button>
          </div>
        )}
      </div>

      {/* Panel notificaciones (últimas 4) */}
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

      {/* Modal detalle próxima clase */}
      {detalleModal && PROXIMA_CLASE && (
        <Modal title={PROXIMA_CLASE.tipo} onClose={() => setDetalle(false)}>
          <div className={styles.detalleGrid}>
            <span>Horario</span>    <span>{PROXIMA_CLASE.horario}</span>
            <span>Días</span>       <span>{PROXIMA_CLASE.dias}</span>
            <span>Aula</span>       <span>{PROXIMA_CLASE.aula}</span>
            <span>Inscriptos</span> <span>{PROXIMA_CLASE.inscriptos}/{PROXIMA_CLASE.cupo}</span>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   SECCIÓN: ASISTENCIA
   ══════════════════════════════════════════════════════════ */
function AreaAsistencia() {
  const [busqueda,     setBusqueda]     = useState('')
  const [qrModal,      setQrModal]      = useState(false)
  const [userModal,    setUserModal]    = useState(null)

  const claseActiva = CLASE_EN_CURSO !== null

  const inscriptosFiltrados = claseActiva
    ? CLASE_EN_CURSO.inscriptos.filter(u =>
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
            {claseActiva && (
              <span className={styles.claseActivaBadge}> — {CLASE_EN_CURSO.tipo}</span>
            )}
          </h2>
          {!claseActiva && (
            <p className={styles.sectionSubtitle}>Esta sección se habilita cuando comienza tu clase</p>
          )}
        </div>
        {claseActiva && (
          <button className={styles.qrBtn} onClick={() => setQrModal(true)}>
            📱 Ver QR para asistencia
          </button>
        )}
      </div>

      {!claseActiva ? (
        <div className={styles.asistenciaDisabled}>
          <span className={styles.emptyIcon}>🔒</span>
          <p>No hay ninguna clase en curso en este momento</p>
        </div>
      ) : (
        <>
          {/* Buscador */}
          <div className={styles.buscarRow}>
            <input
              className={styles.buscador}
              type="text"
              placeholder="Buscar usuario por mail o nombre..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <button className={styles.btnPrimary} disabled={!busqueda.trim()}>
              Registrar asistencia
            </button>
          </div>

          {/* Lista de inscriptos */}
          <div className={styles.inscriptosList}>
            {inscriptosFiltrados.length === 0 ? (
              <p className={styles.noResultados}>No se encontraron usuarios.</p>
            ) : inscriptosFiltrados.map(u => (
              <div key={u.id} className={styles.inscriptoRow}>
                <button
                  className={styles.inscriptoNombre}
                  onClick={() => setUserModal(u)}
                >
                  {u.nombre}
                </button>
                <span className={u.presente ? styles.badgePresente : styles.badgeAusente}>
                  {u.presente ? 'Presente' : 'Ausente'}
                </span>
                <button className={styles.registrarBtn}>
                  Registrar asistencia
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal QR */}
      {qrModal && (
        <Modal title="QR de asistencia" onClose={() => setQrModal(false)}>
          <div className={styles.qrPlaceholder}>
            <div className={styles.qrBox}>QR</div>
            <p className={styles.qrDesc}>
              Mostrá este código a tus alumnos para que registren su asistencia.
            </p>
          </div>
        </Modal>
      )}

      {/* Modal detalle usuario */}
      {userModal && (
        <Modal title={userModal.nombre} onClose={() => setUserModal(null)}>
          <div className={styles.detalleGrid}>
            <span>Email</span>    <span>{userModal.email}</span>
            <span>Teléfono</span> <span>{userModal.telefono || '—'}</span>
            <span>Estado</span>
            <span className={userModal.presente ? styles.badgePresente : styles.badgeAusente}>
              {userModal.presente ? 'Presente' : 'Ausente'}
            </span>
          </div>
        </Modal>
      )}
    </section>
  )
}

/* ══════════════════════════════════════════════════════════
   SECCIÓN: CURSOS QUE DICTA
   ══════════════════════════════════════════════════════════ */
function MisClases() {
  const [claseModal, setClaseModal] = useState(null)   // clase seleccionada para ver inscriptos
  const [userModal,  setUserModal]  = useState(null)   // usuario seleccionado

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Cursos que dicta</h2>

      {MIS_CLASES.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🏫</span>
          <p>No tenés clases asignadas aún</p>
        </div>
      ) : (
        <div className={styles.misClasesList}>
          {MIS_CLASES.map(c => (
            <div key={c.id} className={styles.miClaseRow}>
              <div className={styles.miClaseInfo}>
                <p className={styles.miClaseNombre}>{c.tipo}</p>
                <p className={styles.miClaseMeta}>{c.dias} · {c.horario} · {c.aula}</p>
                <p className={styles.miClaseCupo}>{c.inscriptos.length}/{c.cupo} inscriptos</p>
              </div>
              <button
                className={styles.verInscriptosBtn}
                onClick={() => setClaseModal(c)}
              >
                Ver usuarios inscriptos
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal lista de inscriptos de una clase */}
      {claseModal && (
        <Modal
          title={`Inscriptos — ${claseModal.tipo}`}
          onClose={() => { setClaseModal(null); setUserModal(null) }}
          wide
        >
          {claseModal.inscriptos.length === 0 ? (
            <p className={styles.emptyMsg}>No hay usuarios inscriptos en esta clase.</p>
          ) : (
            <div className={styles.inscriptosModalList}>
              {claseModal.inscriptos.map(u => (
                <div key={u.id} className={styles.inscriptoModalRow}>
                  <div>
                    <button
                      className={styles.inscriptoNombre}
                      onClick={() => setUserModal(u)}
                    >
                      {u.nombre}
                    </button>
                    <p className={styles.inscriptoEmail}>{u.email}</p>
                  </div>
                  <button className={styles.suspenderBtn}>
                    Suspender
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Modal detalle de usuario */}
      {userModal && (
        <Modal title={userModal.nombre} onClose={() => setUserModal(null)}>
          <div className={styles.detalleGrid}>
            <span>Email</span>    <span>{userModal.email}</span>
            <span>Teléfono</span> <span>{userModal.telefono || '—'}</span>
            <span>Estado</span>
            <span className={userModal.activo ? styles.badgePresente : styles.badgeAusente}>
              {userModal.activo ? 'Activo' : 'Suspendido'}
            </span>
          </div>
        </Modal>
      )}
    </section>
  )
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD PRINCIPAL
   ══════════════════════════════════════════════════════════ */
export default function TeacherDashboard() {
  const { user } = useAuth()

  return (
    <div className={styles.container}>

      <div className={styles.greeting}>
        <h1>Bienvenido, <span>{user?.first_name}</span> 👋</h1>
        <p>Panel del profesor — RehabilitAR</p>
      </div>

      {/* Próxima clase + Notificaciones */}
      <TopRow />

      {/* Área de asistencia */}
      <AreaAsistencia />

      {/* Mis clases */}
      <MisClases />

      {/* Asignarse a una clase */}
      <div className={styles.asignarseRow}>
        <button className={styles.btnOutline}>
          + Asignarse a una clase
        </button>
      </div>

    </div>
  )
}
