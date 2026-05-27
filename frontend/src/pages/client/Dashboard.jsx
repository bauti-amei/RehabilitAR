import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  getMisSuscripcionesRequest,
  cancelarSuscripcionRequest,
  cambiarTurnoRequest,
  getClasesDisponiblesParaCambioRequest,
} from '../../api/clases'
import styles from './Dashboard.module.css'

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

// Día de semana (nombre español) → número JS (0=Dom)
const DIAS_MAP = { Lunes: 1, Martes: 2, 'Miércoles': 3, Jueves: 4, Viernes: 5, Sábado: 6, Domingo: 0 }

function proximaFecha(diaStr) {
  const target = DIAS_MAP[diaStr]
  if (target === undefined) return null
  const hoy = new Date()
  const hoyDia = hoy.getDay()
  let diff = target - hoyDia
  if (diff < 0) diff += 7   // ya pasó esta semana → siguiente semana
  // diff === 0 → es hoy
  const fecha = new Date(hoy)
  fecha.setDate(hoy.getDate() + diff)
  return toDateStr(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
}

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
   SECCIÓN: MIS SUSCRIPCIONES
   ══════════════════════════════════════════════════════════ */
function MisSuscripciones({ onClose }) {
  const [suscripciones,    setSuscripciones]    = useState([])
  const [cargando,         setCargando]         = useState(true)
  const [error,            setError]            = useState('')
  const [accion,           setAccion]           = useState(null) // { tipo: 'cancelar'|'turno', susId }
  const [clasesDisp,       setClasesDisp]       = useState([])
  const [cargandoClases,   setCargandoClases]   = useState(false)
  const [claseElegida,     setClaseElegida]     = useState(null)
  const [procesando,       setProcesando]       = useState(false)
  const [feedback,         setFeedback]         = useState('')

  useEffect(() => {
    getMisSuscripcionesRequest()
      .then(res => setSuscripciones(res.data))
      .catch(() => setError('No se pudieron cargar las suscripciones.'))
      .finally(() => setCargando(false))
  }, [])

  const recargar = () => {
    setCargando(true)
    setError('')
    getMisSuscripcionesRequest()
      .then(res => setSuscripciones(res.data))
      .catch(() => setError('No se pudieron cargar las suscripciones.'))
      .finally(() => setCargando(false))
  }

  const abrirCambioTurno = (susId) => {
    setAccion({ tipo: 'turno', susId })
    setClaseElegida(null)
    setCargandoClases(true)
    getClasesDisponiblesParaCambioRequest(susId)
      .then(res => setClasesDisp(res.data))
      .catch(() => setClasesDisp([]))
      .finally(() => setCargandoClases(false))
  }

  const handleCancelar = async (id) => {
    setProcesando(true)
    try {
      const res = await cancelarSuscripcionRequest(id)
      setFeedback(res.data.detail)
      setAccion(null)
      recargar()
    } catch {
      setFeedback('Error al cancelar la suscripción.')
    } finally {
      setProcesando(false)
    }
  }

  const handleCambiarTurno = async (susId) => {
    if (!claseElegida) return
    setProcesando(true)
    try {
      await cambiarTurnoRequest(susId, claseElegida)
      setFeedback('Turno actualizado correctamente.')
      setAccion(null)
      setClaseElegida(null)
      recargar()
    } catch (e) {
      setFeedback(e.response?.data?.detail ?? 'Error al cambiar el turno.')
    } finally {
      setProcesando(false)
    }
  }

  const estadoClass = (estado) => {
    if (estado === 'pagada')  return styles.estadoPagada
    if (estado === 'vencida') return styles.estadoVencida
    return styles.estadoPendiente
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.susModal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Mis suscripciones</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Feedback */}
        {feedback && (
          <p className={styles.feedbackMsg} onClick={() => setFeedback('')}>{feedback} <span style={{fontSize:'0.75rem', opacity:0.7}}>(clic para cerrar)</span></p>
        )}

        {/* Contenido */}
        {cargando ? (
          <p className={styles.susMsg}>Cargando...</p>
        ) : error ? (
          <p className={styles.susMsgError}>{error}</p>
        ) : suscripciones.length === 0 ? (
          <div className={styles.susEmpty}>
            <span className={styles.susEmptyIcon}>🏋️</span>
            <p>No posee una suscripción activa</p>
          </div>
        ) : (
          <div className={styles.susLista}>
            {suscripciones.map(s => (
              <div key={s.id} className={styles.susCard}>

                {/* Info principal */}
                <div className={styles.susCardTop}>
                  <div>
                    <p className={styles.susEspecialidad}>{s.especialidad_display}</p>
                    <p className={styles.susTurno}>🕐 {s.nombre_clase ? `${s.nombre_clase} — ` : ''}{s.turno}</p>
                  </div>
                  <div className={styles.susRight}>
                    <p className={styles.susMonto}>${Number(s.monto).toLocaleString('es-AR')}</p>
                    <span className={`${styles.susEstado} ${estadoClass(s.estado_pago)}`}>
                      {s.estado_pago_display}
                    </span>
                  </div>
                </div>

                {/* Botones de acción — siempre ambos */}
                <div className={styles.susAcciones}>
                  <button
                    className={styles.btnCambiarTurno}
                    onClick={() => abrirCambioTurno(s.id)}
                  >
                    Cambiar turno
                  </button>
                  <button
                    className={styles.btnCancelar}
                    onClick={() => setAccion({ tipo: 'cancelar', susId: s.id })}
                  >
                    Cancelar suscripción
                  </button>
                </div>

                {/* Sub-panel: Selector de clases disponibles */}
                {accion?.tipo === 'turno' && accion?.susId === s.id && (
                  <div className={styles.subPanel}>
                    <p className={styles.subPanelLabel}>Seleccioná el nuevo turno disponible:</p>
                    {cargandoClases ? (
                      <p className={styles.susMsg}>Cargando clases...</p>
                    ) : clasesDisp.length === 0 ? (
                      <p className={styles.susMsgError}>No hay clases disponibles del mismo tipo con cupo.</p>
                    ) : (
                      <div className={styles.clasesList}>
                        {clasesDisp.map(c => (
                          <button
                            key={c.id}
                            className={`${styles.claseOpcion} ${claseElegida === c.id ? styles.claseOpcionActiva : ''}`}
                            onClick={() => setClaseElegida(c.id)}
                          >
                            <span className={styles.claseOpcionNombre}>{c.nombre}</span>
                            <span className={styles.claseOpcionDia}>{c.dias}</span>
                            <span className={styles.claseOpcionHorario}>{c.horario}</span>
                            <span className={styles.claseOpcionCupo}>
                              {c.cupo - c.cantidad_inscriptos} lugar{c.cupo - c.cantidad_inscriptos !== 1 ? 'es' : ''} disponible{c.cupo - c.cantidad_inscriptos !== 1 ? 's' : ''}
                            </span>
                            {c.aula && <span className={styles.claseOpcionSala}>{c.aula}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className={styles.subPanelRow} style={{ marginTop: '0.75rem' }}>
                      <button
                        className={styles.btnConfirmar}
                        disabled={procesando || !claseElegida}
                        onClick={() => handleCambiarTurno(s.id)}
                      >
                        {procesando ? '...' : 'Confirmar'}
                      </button>
                      <button className={styles.btnSubCancelar} onClick={() => setAccion(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-panel: Confirmar cancelación */}
                {accion?.tipo === 'cancelar' && accion?.susId === s.id && (
                  <div className={styles.subPanel}>
                    <p className={styles.subPanelLabel}>¿Confirmás la cancelación de esta suscripción?</p>
                    <div className={styles.subPanelRow}>
                      <button
                        className={styles.btnConfirmarCancelar}
                        disabled={procesando}
                        onClick={() => handleCancelar(s.id)}
                      >
                        {procesando ? '...' : 'Confirmar'}
                      </button>
                      <button className={styles.btnSubCancelar} onClick={() => setAccion(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD PRINCIPAL
   ══════════════════════════════════════════════════════════ */
export default function ClientDashboard() {
  const { user } = useAuth()
  const [verSuscripciones, setVerSuscripciones] = useState(false)
  const [proximaClase,     setProximaClase]     = useState(null)

  const todayStr = getTodayStr()

  // Cargar próxima clase desde la primera suscripción activa
  useEffect(() => {
    getMisSuscripcionesRequest()
      .then(res => {
        const sus = res.data[0]
        if (!sus || !sus.dias) return
        const fecha = proximaFecha(sus.dias)
        setProximaClase({
          nombre:   sus.nombre_clase ?? sus.especialidad_display,
          hora:     sus.horario_inicio ?? '',
          profesor: sus.profesor_nombre ?? 'Sin asignar',
          aula:     sus.aula ?? 'Sin sala',
          fecha,
        })
      })
      .catch(() => {})
  }, [])

  const fechaProxima = proximaClase
    ? proximaClase.fecha === todayStr
      ? `Hoy — ${proximaClase.hora} hs`
      : `${formatFecha(proximaClase.fecha)} — ${proximaClase.hora} hs`
    : null

  return (
    <div className={styles.container}>

      {/* Saludo */}
      <div className={styles.greeting}>
        <h1>Hola, <span>{user?.first_name}</span> 👋</h1>
        <p>Bienvenido a tu espacio en RehabilitAR</p>
      </div>

      {/* ── Fila superior: Próxima clase + Accesos rápidos ── */}
      <div className={styles.topRow}>

        {/* Próxima clase */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Próxima clase</h2>
          {proximaClase ? (
            <div className={styles.proximaBody}>
              <p className={styles.proximaNombre}>{proximaClase.nombre}</p>
              <div className={styles.proximaInfo}>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Fecha</span><span>{fechaProxima}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Profesor</span><span>{proximaClase.profesor}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Aula</span><span>{proximaClase.aula}</span></div>
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📅</span>
              <p>No tenés clases pendientes aún</p>
            </div>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Accesos rápidos</h2>
          <div className={styles.planAcciones}>
            <button
              className={styles.btnPrimary}
              onClick={() => setVerSuscripciones(true)}
            >
              🏋️ Mis suscripciones
            </button>
            <button className={styles.btnOutline}>
              📅 Reservar clase
            </button>
            <button className={styles.btnOutline}>
              💳 Comprar suscripción
            </button>
          </div>
        </div>

      </div>

      {/* ── Calendario ── */}
      <Calendario />

      {/* ── Modal Mis Suscripciones ── */}
      {verSuscripciones && (
        <MisSuscripciones onClose={() => setVerSuscripciones(false)} />
      )}

    </div>
  )
}
