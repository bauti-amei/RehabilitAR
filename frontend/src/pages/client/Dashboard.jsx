import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import styles from './Dashboard.module.css'

/* ══════════════════════════════════════════════════════════
   MOCK DATA — reemplazar con llamadas a la API cuando estén
   ══════════════════════════════════════════════════════════ */

// Cuando exista la API, reemplazar null/[] por la respuesta del backend
const PROXIMA_CLASE = null   // null = sin clases pendientes

const MI_PLAN = []           // [] = sin reservas ni suscripciones

// Días con clase — clave: 'YYYY-MM-DD' (vacío hasta que el usuario reserve)
const MIS_CLASES = {}

// Feriados nacionales argentinos 2026
const FERIADOS = {
  '2026-01-01': 'Año Nuevo',
  '2026-02-16': 'Carnaval',
  '2026-02-17': 'Carnaval',
  '2026-03-24': 'Día Nacional de la Memoria',
  '2026-04-02': 'Día del Veterano de Malvinas',
  '2026-04-03': 'Viernes Santo',
  '2026-05-01': 'Día del Trabajador',
  '2026-05-25': 'Día de la Revolución de Mayo',
  '2026-06-15': 'Paso a la Inmortalidad del Gral. Belgrano',
  '2026-07-09': 'Día de la Independencia',
  '2026-08-17': 'Paso a la Inmortalidad del Gral. San Martín',
  '2026-10-12': 'Día del Respeto a la Diversidad Cultural',
  '2026-11-20': 'Día de la Soberanía Nacional',
  '2026-12-08': 'Inmaculada Concepción de María',
  '2026-12-25': 'Navidad',
}

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════ */
const MESES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_S = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function formatFecha(str) {
  const [y, m, d] = str.split('-')
  const date = new Date(+y, +m - 1, +d)
  return date.toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
}

function getTodayStr() {
  const t = new Date()
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate())
}

/* ══════════════════════════════════════════════════════════
   MODAL GENÉRICO
   ══════════════════════════════════════════════════════════ */
function Modal({ title, onClose, children }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
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
   CALENDARIO
   ══════════════════════════════════════════════════════════ */
function Calendario() {
  const today      = new Date()
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [dayModal, setDayModal] = useState(null)  // string 'YYYY-MM-DD'

  const year  = month.getFullYear()
  const mes   = month.getMonth()

  const prevMes = () => setMonth(new Date(year, mes - 1, 1))
  const nextMes = () => setMonth(new Date(year, mes + 1, 1))

  const primerDia   = new Date(year, mes, 1).getDay()
  const diasEnMes   = new Date(year, mes + 1, 0).getDate()
  const todayStr    = getTodayStr()

  // Construir celdas: nulls para el relleno inicial + días
  const celdas = [
    ...Array(primerDia).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ]

  const selectedClase  = dayModal ? MIS_CLASES[dayModal]  : null
  const selectedFeria  = dayModal ? FERIADOS[dayModal]    : null

  return (
    <section className={styles.calSection}>
      <div className={styles.calHeader}>
        <button className={styles.calNav} onClick={prevMes}>‹</button>
        <h2 className={styles.calTitle}>{MESES[mes]} {year}</h2>
        <button className={styles.calNav} onClick={nextMes}>›</button>
      </div>

      {/* Nombres de días */}
      <div className={styles.calGrid}>
        {DIAS_S.map(d => (
          <div key={d} className={styles.calDayName}>{d}</div>
        ))}

        {/* Celdas */}
        {celdas.map((dia, i) => {
          if (!dia) return <div key={`empty-${i}`} />

          const ds        = toDateStr(year, mes, dia)
          const esFeriado = !!FERIADOS[ds]
          const tieneClase = !!MIS_CLASES[ds]
          const esHoy     = ds === todayStr
          const clickable = esFeriado || tieneClase

          return (
            <div
              key={ds}
              onClick={() => clickable && setDayModal(ds)}
              className={[
                styles.calDay,
                esFeriado    ? styles.feriado   : '',
                tieneClase   ? styles.conClase  : '',
                esHoy        ? styles.hoy       : '',
                clickable    ? styles.clickable : '',
              ].filter(Boolean).join(' ')}
            >
              <span className={styles.calDayNum}>{dia}</span>
              {tieneClase && !esFeriado && <span className={styles.claseDot} />}
            </div>
          )
        })}
      </div>

      {/* Referencias */}
      <div className={styles.calLeyenda}>
        <span className={styles.leyendaItem}>
          <span className={styles.leyendaDot} style={{ background: '#ef4444' }} />
          Feriado
        </span>
        <span className={styles.leyendaItem}>
          <span className={styles.leyendaDot} style={{ background: '#22c55e' }} />
          Tengo clase
        </span>
        <span className={styles.leyendaItem}>
          <span className={`${styles.leyendaDot} ${styles.leyendaHoy}`} />
          Hoy
        </span>
      </div>

      {/* Modal detalle del día */}
      {dayModal && (
        <Modal
          title={`${formatFecha(dayModal)}`}
          onClose={() => setDayModal(null)}
        >
          <div className={styles.dayDetail}>
            {selectedClase && (
              <div className={styles.dayClase}>
                <div className={styles.dayClaseTag}>Clase</div>
                <p><span>Nombre</span>{selectedClase.nombre}</p>
                <p><span>Hora</span>{selectedClase.hora} hs</p>
                <p><span>Profesor</span>{selectedClase.profesor}</p>
                <p><span>Aula</span>{selectedClase.aula}</p>
              </div>
            )}
            {selectedFeria && (
              <div className={styles.dayFeriado}>
                <span>🎉</span>
                <p>{selectedFeria}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </section>
  )
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD PRINCIPAL
   ══════════════════════════════════════════════════════════ */
export default function ClientDashboard() {
  const { user }           = useAuth()
  const [planModal, setPlanModal] = useState(null)
  const [vistaActual, setVistaActual] = useState('inicio')
  const todayStr = getTodayStr()
  const fechaProxima = PROXIMA_CLASE
    ? PROXIMA_CLASE.fecha === todayStr
      ? `Hoy — ${PROXIMA_CLASE.hora} hs`
      : `${formatFecha(PROXIMA_CLASE.fecha)} — ${PROXIMA_CLASE.hora} hs`
    : null

  return (
    <div className={styles.container}>

      {/* Saludo */}
      <div className={styles.greeting}>
        <h1>Hola, <span>{user?.first_name}</span> 👋</h1>
        <p>Bienvenido a tu espacio en RehabilitAR</p>
      </div>

      {/* ── Fila superior: Próxima clase + Mi plan ── */}
      <div className={styles.topRow}>

        {/* Próxima clase */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Próxima clase</h2>
          {PROXIMA_CLASE ? (
            <div className={styles.proximaBody}>
              <p className={styles.proximaNombre}>{PROXIMA_CLASE.nombre}</p>
              <div className={styles.proximaInfo}>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Fecha</span><span>{fechaProxima}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Profesor</span><span>{PROXIMA_CLASE.profesor}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Aula</span><span>{PROXIMA_CLASE.aula}</span></div>
              </div>
              <button className={styles.linkBtn}>Ver detalle →</button>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📅</span>
              <p>No tenés clases pendientes aún</p>
            </div>
          )}
        </div>

        {/* Mi plan */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Mi plan</h2>

          {MI_PLAN.length > 0 ? (
            <div className={styles.planLista}>
              {MI_PLAN.map(item => (
                <div key={item.id} className={styles.planItem}>
                  <div className={styles.planLeft}>
                    <span className={`${styles.tipoBadge} ${item.tipo === 'suscripcion' ? styles.badgeSub : styles.badgeRes}`}>
                      {item.tipo === 'suscripcion' ? 'Suscripción' : 'Reserva'}
                    </span>
                    <div>
                      <p className={styles.planNombre}>{item.nombre}</p>
                      <p className={styles.planDesc}>{item.descripcion}</p>
                    </div>
                  </div>
                  <button className={styles.verMasBtn} onClick={() => setPlanModal(item)}>
                    Ver más
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🏋️</span>
              <p>Reservá tu clase o comprá tu suscripción ahora</p>
            </div>
          )}

          <div className={styles.planAcciones}>
            <button className={styles.btnPrimary}>Reservar clase</button>
            <button className={styles.btnOutline}>Comprar suscripción</button>
          </div>
        </div>

      </div>

      {/* ── Calendario ── */}
      <Calendario />

      {/* ── Modal detalle del plan ── */}
      {planModal && (
        <Modal title={planModal.nombre} onClose={() => setPlanModal(null)}>
          <div className={styles.planDetail}>
            <div className={styles.planDetailRow}>
              <span>Tipo</span>
              <span className={`${styles.tipoBadge} ${planModal.tipo === 'suscripcion' ? styles.badgeSub : styles.badgeRes}`}>
                {planModal.tipo === 'suscripcion' ? 'Suscripción' : 'Reserva de clase'}
              </span>
            </div>
            <div className={styles.planDetailRow}><span>Estado</span><span className={styles.estadoOk}>{planModal.estado}</span></div>
            <div className={styles.planDetailRow}><span>Fecha</span><span>{formatFecha(planModal.fecha)}</span></div>
            <div className={styles.planDetailRow}><span>Hora</span><span>{planModal.hora} hs</span></div>
            <div className={styles.planDetailRow}><span>Profesor</span><span>{planModal.profesor}</span></div>
            <div className={styles.planDetailRow}><span>Aula</span><span>{planModal.aula}</span></div>
            {planModal.descripcion && (
              <div className={styles.planDetailRow}><span>Detalle</span><span>{planModal.descripcion}</span></div>
            )}
          </div>
        </Modal>
      )}

    </div>
  )
}
