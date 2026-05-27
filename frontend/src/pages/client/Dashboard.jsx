import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  getMisReservasRequest, getMisSuscripcionesRequest,
  cancelarSuscripcionRequest, cambiarTurnoRequest, getClasesDisponiblesParaCambioRequest,
} from '../../api/clases'
import ComprarSuscripcionModal from '../../components/client/ComprarSuscripcionModal'
import ReservarClaseModal from '../../components/client/ReservarClaseModal'
import styles from './Dashboard.module.css'

/* ══════════════════════════════════════════════════════════
   MOCK DATA — reemplazar con llamadas a la API cuando estén
   ══════════════════════════════════════════════════════════ */

// Cuando exista la API, reemplazar null/[] por la respuesta del backend
const PROXIMA_CLASE = null   // null = sin clases pendientes

const MI_PLAN = []           // [] = sin reservas ni suscripciones

// MIS_CLASES se carga dinámicamente desde la API

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
function Calendario({ misClases = {} }) {
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

  const celdas = [
    ...Array(primerDia).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ]

  const selectedClase  = dayModal ? misClases[dayModal]  : null
  const selectedFeria  = dayModal ? FERIADOS[dayModal]   : null

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
          const esFeriado  = !!FERIADOS[ds]
          const tieneClase = !!misClases[ds]
          const pendientePago = misClases[ds]?.pendiente_pago
          const esHoy     = ds === todayStr
          const clickable = esFeriado || tieneClase

          return (
            <div
              key={ds}
              onClick={() => clickable && setDayModal(ds)}
              className={[
                styles.calDay,
                esFeriado     ? styles.feriado        : '',
                tieneClase && !pendientePago ? styles.conClase  : '',
                tieneClase && pendientePago  ? styles.conClasePendiente : '',
                esHoy        ? styles.hoy       : '',
                clickable    ? styles.clickable : '',
              ].filter(Boolean).join(' ')}
            >
              <span className={styles.calDayNum}>{dia}</span>
              {tieneClase && !esFeriado && <span className={`${styles.claseDot} ${pendientePago ? styles.claseDotPendiente : ''}`} />}
            </div>
          )
        })}
      </div>

      {/* Referencias */}
      <div className={styles.calLeyenda}>
        <span className={styles.leyendaItem}>
          <span className={styles.leyendaDot} style={{ background: '#ef4444' }} />Feriado
        </span>
        <span className={styles.leyendaItem}>
          <span className={styles.leyendaDot} style={{ background: '#22c55e' }} />Clase activa
        </span>
        <span className={styles.leyendaItem}>
          <span className={styles.leyendaDot} style={{ background: '#6b7280' }} />Pendiente de pago
        </span>
        <span className={styles.leyendaItem}>
          <span className={`${styles.leyendaDot} ${styles.leyendaHoy}`} />Hoy
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
                <div className={styles.dayClaseTag}>{selectedClase.pendiente_pago ? 'Pendiente de pago' : selectedClase.lista_espera ? 'Lista de espera' : 'Clase'}</div>
                <p><span>Nombre</span>{selectedClase.clase_nombre}</p>
                <p><span>Hora</span>{selectedClase.horario}</p>
                <p><span>Profesor</span>{selectedClase.profesor_nombre || '—'}</p>
                <p><span>Aula</span>{selectedClase.aula || '—'}</p>
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
  const { user } = useAuth()
  const hoy = new Date()
  const todayStr = getTodayStr()

  const [misClases,        setMisClases]        = useState({})
  const [proximaClase,     setProximaClase]     = useState(null)
  const [modalSusc,        setModalSusc]        = useState(false)
  const [modalReserva,     setModalReserva]     = useState(false)
  const [suscripciones,    setSuscripciones]    = useState([])
  const [reservasUnicas,   setReservasUnicas]   = useState([])
  const [detalleSusc,      setDetalleSusc]      = useState(null)   // suscripción seleccionada para ver más
  const [accionSusc,       setAccionSusc]       = useState(null)   // 'cancelar' | 'turno'
  const [clasesDisp,       setClasesDisp]       = useState([])
  const [claseElegida,     setClaseElegida]     = useState(null)
  const [feedbackSusc,     setFeedbackSusc]     = useState('')

  const cerrarDetalle = () => {
    setDetalleSusc(null)
    setAccionSusc(null)
    setClasesDisp([])
    setClaseElegida(null)
    setFeedbackSusc('')
  }

  const handleCancelar = async (id) => {
    try {
      await cancelarSuscripcionRequest(id)
      setFeedbackSusc('Suscripción cancelada.')
      setTimeout(() => { cerrarDetalle(); cargarReservas() }, 1200)
    } catch (e) {
      setFeedbackSusc(e.response?.data?.detail ?? 'Error al cancelar.')
    }
  }

  const handleAbrirCambioTurno = async (id) => {
    setAccionSusc('turno')
    setFeedbackSusc('')
    try {
      const res = await getClasesDisponiblesParaCambioRequest(id)
      setClasesDisp(res.data)
    } catch {
      setFeedbackSusc('No se pudieron cargar las clases disponibles.')
    }
  }

  const handleCambiarTurno = async (susId) => {
    if (!claseElegida) return
    try {
      await cambiarTurnoRequest(susId, claseElegida)
      setFeedbackSusc('Turno cambiado con éxito.')
      setTimeout(() => { cerrarDetalle(); cargarReservas() }, 1200)
    } catch (e) {
      setFeedbackSusc(e.response?.data?.detail ?? 'Error al cambiar el turno.')
    }
  }

  const cargarReservas = useCallback(async () => {
    try {
      const mes  = hoy.getMonth() + 1
      const anio = hoy.getFullYear()
      const mesSig  = mes === 12 ? 1 : mes + 1
      const anioSig = mes === 12 ? anio + 1 : anio

      const [r1, r2, rSusc] = await Promise.all([
        getMisReservasRequest(mes, anio),
        getMisReservasRequest(mesSig, anioSig),
        getMisSuscripcionesRequest(),
      ])

      const map = {}
      const todas = [...r1.data, ...r2.data]
      todas.forEach(r => {
        if (r.estado !== 'cancelada') map[r.fecha] = r
      })
      setMisClases(map)
      setSuscripciones(rSusc.data)

      // Reservas únicas (tipo='unica') para "Mi plan"
      const hoyStr = getTodayStr()
      const unicas = todas
        .filter(r => r.tipo === 'unica' && r.estado !== 'cancelada' && r.fecha >= hoyStr)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
      setReservasUnicas(unicas)

      const proxima = todas
        .filter(r => r.fecha >= todayStr && r.estado === 'activa' && !r.lista_espera && !r.pendiente_pago)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))[0] || null
      setProximaClase(proxima)
    } catch {
      // silencioso
    }
  }, [])

  useEffect(() => { cargarReservas() }, [cargarReservas])

  const fechaProximaLabel = proximaClase
    ? proximaClase.fecha === todayStr
      ? `Hoy — ${proximaClase.horario}`
      : `${formatFecha(proximaClase.fecha)} — ${proximaClase.horario}`
    : null

  return (
    <div className={styles.container}>

      {/* Saludo */}
      <div className={styles.greeting}>
        <h1>Hola, <span>{user?.first_name}</span> 👋</h1>
        <p>Bienvenido a tu espacio en RehabilitAR</p>
      </div>

      {/* ── Fila superior ── */}
      <div className={styles.topRow}>

        {/* Próxima clase */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Próxima clase</h2>
          {proximaClase ? (
            <div className={styles.proximaBody}>
              <p className={styles.proximaNombre}>{proximaClase.clase_nombre}</p>
              <div className={styles.proximaInfo}>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Fecha</span><span>{fechaProximaLabel}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Profesor</span><span>{proximaClase.profesor_nombre || '—'}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Aula</span><span>{proximaClase.aula || '—'}</span></div>
              </div>
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

          {suscripciones.length === 0 && reservasUnicas.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🏋️</span>
              <p>Comprá una suscripción o reservá una clase para empezar</p>
            </div>
          ) : (
            <div className={styles.planLista}>

              {/* Suscripciones */}
              {suscripciones.map(s => {
                const activa = s.estado === 'activa'
                return (
                  <div key={`s-${s.id}`} className={styles.planItem}>
                    {/* Col 1 — Nombre + tipo */}
                    <div className={styles.planColNombre}>
                      <p className={styles.planNombre}>{s.clase_nombre}</p>
                      <span className={`${styles.planBadge} ${styles.planBadgeSusc}`}>Suscripción</span>
                    </div>
                    {/* Col 2 — Detalles */}
                    <div className={styles.planColDetalle}>
                      <span className={styles.planDetalleItem}>📅 {s.dias}</span>
                      <span className={styles.planDetalleItem}>🕐 {s.horario}</span>
                      <span className={styles.planDetalleItem}>🏠 {s.aula || 'Sin aula'}</span>
                    </div>
                    {/* Col 3 — Estado + botón */}
                    <div className={styles.planColAccion}>
                      <span className={styles.planEstadoBadge} style={{
                        background: activa ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                        color:      activa ? '#22c55e'              : '#f59e0b',
                        border: `1px solid ${activa ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                      }}>{activa ? '✅ Activa' : '⏳ Pendiente'}</span>
                      {s.en_espera && (
                        <span className={styles.planEstadoBadge} style={{
                          background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                          border: '1px solid rgba(245,158,11,0.3)',
                        }}>📋 En espera</span>
                      )}
                      <button className={styles.verMasBtn} onClick={() => setDetalleSusc(s)}>Ver más</button>
                    </div>
                  </div>
                )
              })}

              {/* Reservas únicas */}
              {reservasUnicas.map(r => (
                <div key={`r-${r.id}`} className={styles.planItem}>
                  {/* Col 1 — Nombre + tipo */}
                  <div className={styles.planColNombre}>
                    <p className={styles.planNombre}>{r.clase_nombre}</p>
                    <span className={`${styles.planBadge} ${styles.planBadgeUnica}`}>Reserva única</span>
                  </div>
                  {/* Col 2 — Detalles */}
                  <div className={styles.planColDetalle}>
                    <span className={styles.planDetalleItem}>📅 {formatFecha(r.fecha)}</span>
                    <span className={styles.planDetalleItem}>🕐 {r.horario}</span>
                    <span className={styles.planDetalleItem}>🏠 {r.aula || 'Sin aula'}</span>
                  </div>
                  {/* Col 3 — Estado + botón */}
                  <div className={styles.planColAccion}>
                    <span className={styles.planEstadoBadge} style={{
                      background: r.lista_espera ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
                      color:      r.lista_espera ? '#f59e0b'               : '#22c55e',
                      border: `1px solid ${r.lista_espera ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
                    }}>{r.lista_espera ? '📋 En espera' : '✅ Confirmada'}</span>
                    <button className={styles.verMasBtn} onClick={() => setDetalleSusc({ ...r, _tipo: 'unica' })}>Ver más</button>
                  </div>
                </div>
              ))}

            </div>
          )}

          <div className={styles.planAcciones}>
            <button className={styles.btnOutline} onClick={() => setModalSusc(true)}>
              + Comprar suscripción
            </button>
            <button className={styles.btnOutline} onClick={() => setModalReserva(true)}
              style={{ borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e' }}>
              📅 Reservar clase
            </button>
          </div>
        </div>

      </div>

      {/* ── Calendario ── */}
      <Calendario misClases={misClases} />

      {/* ── Modal comprar suscripción ── */}
      {modalSusc && (
        <ComprarSuscripcionModal
          onClose={() => setModalSusc(false)}
          onSuscripcionOk={() => cargarReservas()}
        />
      )}

      {/* ── Modal reservar clase única ── */}
      {modalReserva && (
        <ReservarClaseModal
          onClose={() => setModalReserva(false)}
          onReservaOk={() => cargarReservas()}
        />
      )}

      {/* ── Modal detalle (suscripción o reserva única) ── */}
      {detalleSusc && (() => {
        const esUnica = detalleSusc._tipo === 'unica'
        const MESES_L = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9000, padding: '1rem'
          }} onClick={() => cerrarDetalle()}>
            <div style={{
              background: '#13172e', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px', width: '100%', maxWidth: '480px',
              maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
            }} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ padding: '1.4rem 1.8rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <h3 style={{ color: 'white', margin: 0, fontSize: '1.1rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {detalleSusc.clase_nombre}
                  </h3>
                  <span style={{
                    background: esUnica ? 'rgba(34,197,94,0.12)' : 'rgba(124,58,237,0.15)',
                    color: esUnica ? '#22c55e' : '#a78bfa',
                    border: `1px solid ${esUnica ? 'rgba(34,197,94,0.3)' : 'rgba(124,58,237,0.3)'}`,
                    borderRadius: '5px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0
                  }}>{esUnica ? 'Reserva única' : 'Suscripción'}</span>
                </div>
                <button onClick={() => cerrarDetalle()} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#868e96', borderRadius: '8px', width: 32, height: 32, minWidth: 32, cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
              </div>

              {/* Body */}
              <div style={{ padding: '1.4rem 1.8rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

                {/* Badges de estado */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {esUnica ? (
                    <span style={{
                      background: detalleSusc.lista_espera ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
                      color: detalleSusc.lista_espera ? '#f59e0b' : '#22c55e',
                      border: `1px solid ${detalleSusc.lista_espera ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
                      borderRadius: '8px', padding: '4px 12px', fontSize: '0.82rem', fontWeight: 700
                    }}>
                      {detalleSusc.lista_espera ? '📋 Lista de espera' : '✅ Confirmada'}
                    </span>
                  ) : (
                    <>
                      <span style={{
                        background: detalleSusc.estado === 'activa' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                        color: detalleSusc.estado === 'activa' ? '#22c55e' : '#f59e0b',
                        border: `1px solid ${detalleSusc.estado === 'activa' ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                        borderRadius: '8px', padding: '4px 12px', fontSize: '0.82rem', fontWeight: 700
                      }}>
                        {detalleSusc.estado === 'activa' ? '✅ Activa' : '⏳ Pendiente de pago'}
                      </span>
                      {detalleSusc.en_espera && (
                        <span style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '4px 12px', fontSize: '0.82rem', fontWeight: 700 }}>
                          📋 Lista de espera
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 1rem', fontSize: '0.88rem' }}>
                  {(esUnica ? [
                    ['Fecha',     formatFecha(detalleSusc.fecha)],
                    ['Horario',   detalleSusc.horario],
                    ['Aula',      detalleSusc.aula || '—'],
                    ['Profesor',  detalleSusc.profesor_nombre || 'Sin asignar'],
                  ] : [
                    ['Especialidad',     detalleSusc.especialidad],
                    ['Día',             detalleSusc.dias],
                    ['Horario',         detalleSusc.horario],
                    ['Aula',            detalleSusc.aula || '—'],
                    ['Profesor',        detalleSusc.profesor || 'Sin asignar'],
                    ['Período',         `${MESES_L[detalleSusc.mes]} ${detalleSusc.anio}`],
                    ['Total pagado',    `$${detalleSusc.monto.toLocaleString('es-AR')}`],
                    ['Clases incluidas',`${detalleSusc.total_clases} clase${detalleSusc.total_clases !== 1 ? 's' : ''}`],
                  ]).map(([k, v]) => (
                    <>
                      <span style={{ color: '#868e96' }} key={`k-${k}`}>{k}</span>
                      <span style={{ color: '#e2e8f0' }} key={`v-${k}`}>{v}</span>
                    </>
                  ))}
                </div>

                {/* Fechas de clases (solo suscripción) */}
                {!esUnica && detalleSusc.reservas && (
                  <div>
                    <p style={{ color: '#868e96', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                      Fechas de clases
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {detalleSusc.reservas.map(r => {
                        const [y, m, d] = r.fecha.split('-')
                        const label = new Date(+y, +m - 1, +d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
                        return (
                          <div key={r.fecha} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '6px 10px'
                          }}>
                            <span style={{ color: '#c8cbdf', fontSize: '0.85rem' }}>{label}</span>
                            {r.estado === 'lista_espera' && (
                              <span style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', borderRadius: '4px', padding: '2px 6px', fontSize: '0.72rem' }}>
                                Lista de espera
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Acciones suscripción: cancelar / cambiar turno */}
                {!esUnica && detalleSusc.estado !== 'cancelada' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {feedbackSusc && (
                      <p style={{ color: feedbackSusc.includes('Error') ? '#f87171' : '#22c55e', fontSize: '0.88rem', margin: 0 }}>
                        {feedbackSusc}
                      </p>
                    )}

                    {accionSusc === null && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleAbrirCambioTurno(detalleSusc.id)}
                          style={{ flex: 1, padding: '8px 12px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                          🔄 Cambiar turno
                        </button>
                        <button
                          onClick={() => setAccionSusc('cancelar')}
                          style={{ flex: 1, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                          ✕ Cancelar suscripción
                        </button>
                      </div>
                    )}

                    {accionSusc === 'cancelar' && (
                      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px' }}>
                        <p style={{ color: '#f87171', fontSize: '0.88rem', marginBottom: '10px' }}>
                          ¿Confirmás la cancelación? La baja se hace efectiva a partir del próximo mes.
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleCancelar(detalleSusc.id)}
                            style={{ flex: 1, padding: '8px', background: '#ef4444', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                            Sí, cancelar
                          </button>
                          <button onClick={() => setAccionSusc(null)}
                            style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#868e96', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            Volver
                          </button>
                        </div>
                      </div>
                    )}

                    {accionSusc === 'turno' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ color: '#868e96', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
                          Seleccioná el nuevo turno
                        </p>
                        {clasesDisp.length === 0 ? (
                          <p style={{ color: '#868e96', fontSize: '0.85rem' }}>No hay clases disponibles con cupo.</p>
                        ) : (
                          clasesDisp.map(c => (
                            <div key={c.id}
                              onClick={() => setClaseElegida(c.id)}
                              style={{
                                background: claseElegida === c.id ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${claseElegida === c.id ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: '10px', padding: '10px 14px', cursor: 'pointer',
                                display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px',
                              }}
                            >
                              <span style={{ color: 'white', fontWeight: 700, fontSize: '0.88rem', gridColumn: '1 / -1' }}>{c.nombre}</span>
                              <span style={{ color: '#868e96', fontSize: '0.8rem' }}>📅 {c.dias}</span>
                              <span style={{ color: '#868e96', fontSize: '0.8rem' }}>🕐 {c.horario}</span>
                              <span style={{ color: '#868e96', fontSize: '0.8rem' }}>🏠 {c.aula || 'Sin aula'}</span>
                            </div>
                          ))
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            disabled={!claseElegida}
                            onClick={() => handleCambiarTurno(detalleSusc.id)}
                            style={{ flex: 1, padding: '8px', background: claseElegida ? '#7c3aed' : 'rgba(124,58,237,0.2)', border: 'none', color: 'white', borderRadius: '8px', cursor: claseElegida ? 'pointer' : 'default', fontWeight: 700, fontSize: '0.85rem', opacity: claseElegida ? 1 : 0.5 }}
                          >
                            Confirmar cambio
                          </button>
                          <button onClick={() => { setAccionSusc(null); setClaseElegida(null) }}
                            style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#868e96', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            Volver
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
