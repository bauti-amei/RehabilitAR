import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  getMisReservasRequest, getMisSuscripcionesRequest,
  getMisCreditosRequest,
  cancelarReservaUnicaRequest, cancelarClaseSuscripcionRequest,
  cancelarSuscripcionRequest,
  pagarSaldoReservaRequest,
  getClasesDisponiblesParaCambioRequest, cambiarTurnoRequest,
} from '../../api/clases'
import ComprarSuscripcionModal from '../../components/client/ComprarSuscripcionModal'
import ReservarClaseModal from '../../components/client/ReservarClaseModal'
// import CanjearCreditoModal from '../../components/client/CanjearCreditoModal'
import QRScannerModal from '../../components/client/QRScannerModal'
import AsistenciasModal from '../../components/client/AsistenciasModal'
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

          const ds            = toDateStr(year, mes, dia)
          const esFeriado      = !!FERIADOS[ds]
          const tieneClase     = !!misClases[ds]
          const pendientePago  = misClases[ds]?.pendiente_pago
          const listaEspera    = misClases[ds]?.lista_espera
          const esHoy          = ds === todayStr
          const clickable      = esFeriado || tieneClase

          return (
            <div
              key={ds}
              onClick={() => clickable && setDayModal(ds)}
              className={[
                styles.calDay,
                esFeriado                                    ? styles.feriado            : '',
                tieneClase && !pendientePago && !listaEspera ? styles.conClase           : '',
                tieneClase && pendientePago                  ? styles.conClasePendiente  : '',
                tieneClase && listaEspera && !pendientePago  ? styles.conClaseEspera     : '',
                esHoy        ? styles.hoy       : '',
                clickable    ? styles.clickable : '',
              ].filter(Boolean).join(' ')}
            >
              <span className={styles.calDayNum}>{dia}</span>
              {tieneClase && !esFeriado && (
                <span className={[
                  styles.claseDot,
                  pendientePago ? styles.claseDotPendiente : '',
                  listaEspera && !pendientePago ? styles.claseDotEspera : '',
                ].filter(Boolean).join(' ')} />
              )}
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
          <span className={styles.leyendaDot} style={{ background: '#f59e0b' }} />Lista de espera
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
  const [detalleSusc,      setDetalleSusc]      = useState(null)
  const [creditos,         setCreditos]         = useState([])
  const [canjearCredito,   setCanjearCredito]   = useState(null)  // credito object

  // Cancelación — reserva única
  const [cancelUnica,      setCancelUnica]      = useState(null)   // reserva object
  const [cancelUnicaLoading, setCancelUnicaLoading] = useState(false)
  const [cancelUnicaResult,  setCancelUnicaResult]  = useState(null)

  // Cancelación — clase de suscripción
  const [cancelSusc,       setCancelSusc]       = useState(null)   // suscripción object
  const [cancelSuscFecha,  setCancelSuscFecha]  = useState(null)   // reserva object (fecha seleccionada)
  const [cancelSuscLoading,setCancelSuscLoading]= useState(false)
  const [cancelSuscResult, setCancelSuscResult] = useState(null)

  // Cancelación — suscripción completa
  const [cancelSuscTotal,        setCancelSuscTotal]        = useState(null)
  const [cancelSuscTotalLoading, setCancelSuscTotalLoading] = useState(false)
  const [cancelSuscTotalOk,      setCancelSuscTotalOk]      = useState(false)

  // Pago de saldo pendiente
  const [pagarSaldo,       setPagarSaldo]       = useState(null)   // reserva object
  const [pagarSaldoPago,   setPagarSaldoPago]   = useState({ numero: '', nombre: '', apellido: '', dni: '', cvv: '' })
  const [pagarSaldoLoading,setPagarSaldoLoading]= useState(false)
  const [pagarSaldoOk,     setPagarSaldoOk]     = useState(false)
  const [pagarSaldoError,  setPagarSaldoError]  = useState('')

  // QR asistencia
  const [qrScannerClase,      setQrScannerClase]      = useState(null)   // reserva/suscripcion being scanned
  const [asistenciasClase,    setAsistenciasClase]    = useState(null)   // {clase_id, clase_nombre}

  // Cambiar turno
  const [cambiarTurnoSusc,    setCambiarTurnoSusc]    = useState(null)   // suscripción object
  const [clasesDisponibles,   setClasesDisponibles]   = useState([])
  const [clasesDispLoading,   setClasesDispLoading]   = useState(false)
  const [nuevaClaseSel,       setNuevaClaseSel]       = useState(null)
  const [cambiarTurnoLoading, setCambiarTurnoLoading] = useState(false)
  const [cambiarTurnoOk,      setCambiarTurnoOk]      = useState(false)
  const [cambiarTurnoError,   setCambiarTurnoError]   = useState('')

  const cargarReservas = useCallback(async () => {
    try {
      const mes  = hoy.getMonth() + 1
      const anio = hoy.getFullYear()
      const mesSig  = mes === 12 ? 1 : mes + 1
      const anioSig = mes === 12 ? anio + 1 : anio

      const [r1, r2, rSusc, rCred] = await Promise.all([
        getMisReservasRequest(mes, anio),
        getMisReservasRequest(mesSig, anioSig),
        getMisSuscripcionesRequest(),
        getMisCreditosRequest(),
      ])
      setCreditos(rCred.data)

      const map = {}
      const todas = [...r1.data, ...r2.data]
      todas.forEach(r => {
        if (r.estado !== 'cancelada') map[r.fecha] = r
      })
      setMisClases(map)
      setSuscripciones(rSusc.data)

      // Reservas únicas (tipo='unica') para "Mi plan"
      // Incluye las canceladas por falta de pago para mostrar la leyenda
      const hoyStr = getTodayStr()
      const unicas = todas
        .filter(r => r.tipo === 'unica' && r.fecha >= hoyStr &&
          (r.estado !== 'cancelada' || r.motivo_cancelacion === 'falta_de_pago'))
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

  /* ── Cancelar reserva única ─────────────────────────────── */
  const handleCancelarUnica = async () => {
    if (!cancelUnica) return
    setCancelUnicaLoading(true)
    try {
      const res = await cancelarReservaUnicaRequest(cancelUnica.id)
      setCancelUnicaResult(res.data)
      cargarReservas()
    } catch (e) {
      setCancelUnicaResult({ error: e?.response?.data?.detail || 'Error al cancelar.' })
    } finally {
      setCancelUnicaLoading(false)
    }
  }

  const cerrarCancelUnica = () => {
    setCancelUnica(null)
    setCancelUnicaResult(null)
  }

  /* ── Pagar saldo pendiente ───────────────────────────────── */
  const handlePagarSaldo = async () => {
    const { numero, nombre, apellido, dni, cvv } = pagarSaldoPago
    if (!numero || !nombre || !apellido || !dni || !cvv) {
      setPagarSaldoError('Completá todos los campos.')
      return
    }
    setPagarSaldoLoading(true)
    setPagarSaldoError('')
    try {
      await pagarSaldoReservaRequest(pagarSaldo.id, pagarSaldoPago)
      setPagarSaldoOk(true)
      cargarReservas()
    } catch (e) {
      setPagarSaldoError(e?.response?.data?.detail || 'Error al procesar el pago.')
    } finally {
      setPagarSaldoLoading(false)
    }
  }

  const cerrarPagarSaldo = () => {
    setPagarSaldo(null)
    setPagarSaldoOk(false)
    setPagarSaldoError('')
    setPagarSaldoPago({ numero: '', nombre: '', apellido: '', dni: '', cvv: '' })
  }

  /* ── Cancelar clase de suscripción ──────────────────────── */
  const handleCancelarClaseSusc = async () => {
    if (!cancelSuscFecha) return
    setCancelSuscLoading(true)
    try {
      const res = await cancelarClaseSuscripcionRequest(cancelSuscFecha.id)
      setCancelSuscResult(res.data)
      cargarReservas()
    } catch (e) {
      setCancelSuscResult({ error: e?.response?.data?.detail || 'Error al cancelar.' })
    } finally {
      setCancelSuscLoading(false)
    }
  }

  const cerrarCancelSusc = () => {
    setCancelSusc(null)
    setCancelSuscFecha(null)
    setCancelSuscResult(null)
  }

  /* ── Cancelar suscripción completa ──────────────────────── */
  const handleCancelarSuscripcionTotal = async () => {
    if (!cancelSuscTotal) return
    setCancelSuscTotalLoading(true)
    try {
      await cancelarSuscripcionRequest(cancelSuscTotal.id)
      setCancelSuscTotalOk(true)
      cargarReservas()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Error al cancelar la suscripción.')
    } finally {
      setCancelSuscTotalLoading(false)
    }
  }

  const cerrarCancelSuscTotal = () => {
    setCancelSuscTotal(null)
    setCancelSuscTotalOk(false)
  }

  /* ── Cambiar turno ───────────────────────────────────────── */
  const abrirCambiarTurno = async (susc) => {
    setCambiarTurnoSusc(susc)
    setNuevaClaseSel(null)
    setCambiarTurnoOk(false)
    setCambiarTurnoError('')
    setClasesDispLoading(true)
    try {
      const res = await getClasesDisponiblesParaCambioRequest(susc.id)
      setClasesDisponibles(res.data)
    } catch {
      setClasesDisponibles([])
    } finally {
      setClasesDispLoading(false)
    }
  }

  const handleCambiarTurno = async () => {
    if (!nuevaClaseSel) return
    setCambiarTurnoLoading(true)
    setCambiarTurnoError('')
    try {
      await cambiarTurnoRequest(cambiarTurnoSusc.id, nuevaClaseSel.id)
      setCambiarTurnoOk(true)
      cargarReservas()
    } catch (e) {
      setCambiarTurnoError(e?.response?.data?.detail || 'Error al cambiar el turno.')
    } finally {
      setCambiarTurnoLoading(false)
    }
  }

  const cerrarCambiarTurno = () => {
    setCambiarTurnoSusc(null)
    setClasesDisponibles([])
    setNuevaClaseSel(null)
    setCambiarTurnoOk(false)
    setCambiarTurnoError('')
  }

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
                const activa          = s.estado === 'activa'
                const cancelada       = s.estado === 'cancelada'
                const pendientePagoS  = s.estado === 'pendiente_pago'
                return (
                  <div key={`s-${s.id}`} className={styles.planItem}>
                    {/* Col 1 — Nombre + tipo */}
                    <div className={styles.planColNombre}>
                      <p className={styles.planNombre}>{s.clase_nombre}</p>
                      <span className={`${styles.planBadge} ${styles.planBadgeSusc}`}>Suscripción</span>
                      {cancelada && s.vigente_hasta && (
                        <span className={styles.vigenteHasta}>
                          Vigente hasta {formatFecha(s.vigente_hasta)}
                        </span>
                      )}
                      {cancelada && !s.vigente_hasta && (
                        <span className={styles.vigenteHasta}>
                          Cancelaste esta suscripción
                        </span>
                      )}
                    </div>
                    {/* Col 2 — Detalles */}
                    <div className={styles.planColDetalle}>
                      <span className={styles.planDetalleItem}>📅 {s.dias}</span>
                      <span className={styles.planDetalleItem}>🕐 {s.horario}</span>
                      <span className={styles.planDetalleItem}>🏠 {s.aula || 'Sin aula'}</span>
                    </div>
                    {/* Col 3 — Estado + botones */}
                    <div className={styles.planColAccion}>
                      <span className={styles.planEstadoBadge} style={{
                        background: cancelada ? 'rgba(245,158,11,0.12)' : activa ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                        color:      cancelada ? '#d97706'               : activa ? '#22c55e'              : '#f59e0b',
                        border: `1px solid ${cancelada ? 'rgba(217,119,6,0.3)' : activa ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                      }}>
                        {cancelada ? '🚫 Cancelada' : activa ? '✅ Activa' : '⏳ Pendiente'}
                      </span>
                      {pendientePagoS && (
                        <span className={styles.planEstadoBadge} style={{
                          background: 'rgba(245,158,11,0.12)', color: '#d97706',
                          border: '1px solid rgba(217,119,6,0.3)', fontSize: '0.75rem'
                        }}>
                          💳 Pendiente de pago
                          {s.monto_pagado != null && s.monto != null && (
                            <> · ${s.monto_pagado.toLocaleString('es-AR')} / ${s.monto.toLocaleString('es-AR')}</>
                          )}
                        </span>
                      )}
                      {s.en_espera && (
                        <span className={styles.planEstadoBadge} style={{
                          background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                          border: '1px solid rgba(245,158,11,0.3)',
                        }}>📋 En espera</span>
                      )}
                      <button className={styles.verMasBtn} onClick={() => setDetalleSusc(s)}>Ver más</button>
                      {s.en_curso && !s.ya_presente && (
                        <button
                          className={styles.verMasBtn}
                          style={{ background: 'linear-gradient(135deg,#1a9d85,#147a68)', color: '#fff', borderColor: '#147a68' }}
                          onClick={() => setQrScannerClase({ clase_id: s.clase_id, clase_nombre: s.clase_nombre })}
                        >
                          📷 Registrar asistencia
                        </button>
                      )}
                      {s.en_curso && s.ya_presente && (
                        <span className={styles.planEstadoBadge} style={{
                          background: 'rgba(34,197,94,0.12)', color: '#16a34a',
                          border: '1px solid rgba(34,197,94,0.3)', fontWeight: 700,
                        }}>✅ Presente hoy</span>
                      )}
                      <button className={styles.verMasBtn} onClick={() => setAsistenciasClase({ clase_id: s.clase_id, clase_nombre: s.clase_nombre })}>
                        📊 Ver asistencias
                      </button>
                      {!cancelada && (
                        <>
                          <button className={styles.cancelarBtn} onClick={() => { setCancelSusc(s); setCancelSuscFecha(null); setCancelSuscResult(null) }}>Cancelar clase</button>
                          <button className={styles.cancelarSuscBtn} onClick={() => { setCancelSuscTotal(s); setCancelSuscTotalOk(false) }}>Cancelar suscripción</button>
                          {s.tipo_clase !== 'individual' && (
                            <button className={styles.verMasBtn} onClick={() => abrirCambiarTurno(s)}>Cambiar turno</button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Reservas únicas */}
              {reservasUnicas.map(r => {
                const canceladaPorPago = r.estado === 'cancelada' && r.motivo_cancelacion === 'falta_de_pago'
                return (
                <div key={`r-${r.id}`} className={styles.planItem} style={canceladaPorPago ? { opacity: 0.9, border: '1.5px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.03)' } : {}}>
                  {/* Col 1 — Nombre + tipo */}
                  <div className={styles.planColNombre}>
                    <p className={styles.planNombre} style={canceladaPorPago ? { textDecoration: 'line-through', color: '#9ca3af' } : {}}>{r.clase_nombre}</p>
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
                    {canceladaPorPago ? (
                      <>
                        <span className={styles.planEstadoBadge} style={{
                          background: 'rgba(239,68,68,0.10)', color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.3)', fontWeight: 700,
                        }}>🚫 Cancelada</span>
                        <span style={{
                          fontSize: '0.78rem', color: '#dc2626', fontWeight: 600,
                          background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: '8px', padding: '0.35rem 0.6rem', lineHeight: 1.4,
                        }}>
                          Esta clase fue cancelada por falta de pago.
                          {r.monto_pagado != null && <> Se reintegrará la seña de ${r.monto_pagado.toLocaleString('es-AR')}.</>}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={styles.planEstadoBadge} style={{
                          background: r.lista_espera ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
                          color:      r.lista_espera ? '#f59e0b'               : '#22c55e',
                          border: `1px solid ${r.lista_espera ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
                        }}>{r.lista_espera ? '📋 En espera' : '✅ Confirmada'}</span>
                        {r.pendiente_pago && (
                          <span className={styles.planEstadoBadge} style={{
                            background: 'rgba(245,158,11,0.12)', color: '#d97706',
                            border: '1px solid rgba(217,119,6,0.3)', fontSize: '0.75rem'
                          }}>
                            💳 Pendiente de pago
                            {r.monto_pagado != null && r.monto_total != null && (
                              <> · ${r.monto_pagado.toLocaleString('es-AR')} / ${r.monto_total.toLocaleString('es-AR')}</>
                            )}
                          </span>
                        )}
                        {r.en_curso && !r.ya_presente && (
                          <button
                            className={styles.verMasBtn}
                            style={{ background: 'linear-gradient(135deg,#1a9d85,#147a68)', color: '#fff', borderColor: '#147a68' }}
                            onClick={() => setQrScannerClase({ clase_id: r.clase_id, clase_nombre: r.clase_nombre })}
                          >
                            📷 Registrar asistencia
                          </button>
                        )}
                        {r.ya_presente && (
                          <span className={styles.planEstadoBadge} style={{
                            background: 'rgba(34,197,94,0.12)', color: '#16a34a',
                            border: '1px solid rgba(34,197,94,0.3)', fontWeight: 700,
                          }}>✅ Presente</span>
                        )}
                        {!r.en_curso && !r.ya_presente && r.fecha === todayStr && new Date().toTimeString().slice(0,8) > r.horario_fin && (
                          <span className={styles.planEstadoBadge} style={{
                            background: 'rgba(239,68,68,0.10)', color: '#dc2626',
                            border: '1px solid rgba(239,68,68,0.25)', fontWeight: 700,
                          }}>❌ Ausente</span>
                        )}
                        {r.pendiente_pago && (
                          <button
                            className={styles.verMasBtn}
                            style={{ background: '#2d6a4f', color: '#fff', borderColor: '#2d6a4f' }}
                            onClick={() => { setPagarSaldo(r); setPagarSaldoOk(false); setPagarSaldoError(''); setPagarSaldoPago({ numero: '', nombre: '', apellido: '', dni: '', cvv: '' }) }}
                          >
                            💳 Pagar saldo
                          </button>
                        )}
                        <button className={styles.verMasBtn} onClick={() => setDetalleSusc({ ...r, _tipo: 'unica' })}>Ver más</button>
                        <button className={styles.cancelarBtn} onClick={() => { setCancelUnica(r); setCancelUnicaResult(null) }}>Cancelar</button>
                      </>
                    )}
                  </div>
                </div>
                )
              })}

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

      {/* ── Mis Créditos ── */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Mis créditos del mes</h2>
        {creditos.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🎟️</span>
            <p>No tenés créditos activos este mes</p>
          </div>
        ) : (
          <div className={styles.creditosWrap}>
            <p className={styles.creditosTotal}>
              Total: <strong>{creditos.length}/3</strong>
            </p>
            <div className={styles.creditosList}>
              {creditos.map(c => (
                <div key={c.id} className={styles.creditoItem}>
                  <span className={styles.creditoIcon}>
                    {c.tipo_clase === 'tren_superior' ? '💪' : c.tipo_clase === 'tren_inferior' ? '🦵' : '🧘'}
                  </span>
                  <span className={styles.creditoLabel}>{c.tipo_clase_display}</span>
                  <span className={styles.creditoBadge}>Crédito</span>
                  <button className={styles.canjearBtn} onClick={() => setCanjearCredito(c)}>Canjear</button>
                </div>
              ))}
            </div>
            <p className={styles.creditosNote}>Los créditos vencen el 1° del mes siguiente.</p>
          </div>
        )}
      </div>

      {/* ── QR Scanner ── */}
      {qrScannerClase && (
        <QRScannerModal
          onClose={() => setQrScannerClase(null)}
          onSuccess={() => { setQrScannerClase(null); cargarReservas() }}
        />
      )}

      {/* ── Asistencias modal ── */}
      {asistenciasClase && (
        <AsistenciasModal
          claseId={asistenciasClase.clase_id}
          claseNombre={asistenciasClase.clase_nombre}
          onClose={() => setAsistenciasClase(null)}
        />
      )}

      {/* ── Modal canjear crédito ── */}
      {canjearCredito && (
        <CanjearCreditoModal
          credito={canjearCredito}
          onClose={() => setCanjearCredito(null)}
          onCanjeOk={() => { cargarReservas(); setCanjearCredito(null) }}
        />
      )}

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

      {/* ── Modal cancelar reserva única ── */}
      {cancelUnica && (
        <div className={styles.overlay} onClick={cerrarCancelUnica}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Cancelar reserva</h3>
              <button className={styles.closeBtn} onClick={cerrarCancelUnica}>✕</button>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              {!cancelUnicaResult ? (
                <>
                  <p style={{ color: '#3d6b55', marginBottom: '0.5rem' }}>
                    ¿Confirmás la cancelación de:
                  </p>
                  <div style={{ background: 'linear-gradient(145deg,#eaf5ef,#f4faf7)', border: '1px solid #c8e6d4', borderRadius: '10px', padding: '0.9rem 1.1rem', marginBottom: '1.2rem' }}>
                    <p style={{ color: '#1a2e25', fontWeight: 700, margin: '0 0 4px' }}>{cancelUnica.clase_nombre}</p>
                    <p style={{ color: '#3d6b55', fontSize: '0.88rem', margin: 0 }}>📅 {formatFecha(cancelUnica.fecha)} · 🕐 {cancelUnica.horario}</p>
                  </div>
                  <p style={{ color: '#92400e', fontSize: '0.83rem', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: '8px', padding: '0.6rem 0.9rem', marginBottom: '1.2rem' }}>
                    ⚠️ Si cancelás con menos de 24 h de anticipación, perdés la seña.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={cerrarCancelUnica} disabled={cancelUnicaLoading} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #b8dece', background: 'transparent', color: '#3d6b55', fontWeight: 600, cursor: 'pointer' }}>
                      No, volver
                    </button>
                    <button onClick={handleCancelarUnica} disabled={cancelUnicaLoading} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                      {cancelUnicaLoading ? 'Cancelando…' : 'Sí, cancelar'}
                    </button>
                  </div>
                </>
              ) : cancelUnicaResult.error ? (
                <>
                  <p style={{ color: '#b91c1c', fontWeight: 600, marginBottom: '1rem' }}>❌ {cancelUnicaResult.error}</p>
                  <button onClick={cerrarCancelUnica} style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #b8dece', background: 'transparent', color: '#3d6b55', fontWeight: 600, cursor: 'pointer' }}>Cerrar</button>
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
                    <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{cancelUnicaResult.devolver_sena ? '✅' : 'ℹ️'}</p>
                    <p style={{ color: '#1a2e25', fontWeight: 700, marginBottom: '0.4rem' }}>Reserva cancelada</p>
                    <p style={{ color: '#3d6b55', fontSize: '0.88rem' }}>
                      {cancelUnicaResult.devolver_sena
                        ? 'Cancelaste con más de 24 h de anticipación. Recibirás un mail con la acreditación de la seña.'
                        : 'Cancelaste con menos de 24 h de anticipación. La seña no puede ser reintegrada.'}
                    </p>
                  </div>
                  <button onClick={cerrarCancelUnica} style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#1a9d85,#147a68)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Aceptar</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal cancelar clase de suscripción ── */}
      {cancelSusc && (
        <div className={styles.overlay} onClick={cerrarCancelSusc}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {cancelSuscResult ? 'Resultado' : cancelSuscFecha ? 'Confirmar cancelación' : 'Seleccioná la clase a cancelar'}
              </h3>
              <button className={styles.closeBtn} onClick={cerrarCancelSusc}>✕</button>
            </div>
            <div style={{ padding: '0.5rem 0' }}>

              {/* Paso 1 — lista de fechas */}
              {!cancelSuscFecha && !cancelSuscResult && (
                <>
                  <p style={{ color: '#3d6b55', fontSize: '0.88rem', marginBottom: '1rem' }}>
                    Suscripción: <strong style={{ color: '#1a2e25' }}>{cancelSusc.clase_nombre}</strong>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                    {(cancelSusc.reservas || []).filter(r => r.estado !== 'cancelada').map(r => {
                      const [y, m, d] = r.fecha.split('-')
                      const label = new Date(+y, +m - 1, +d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
                      return (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(145deg,#eaf5ef,#f4faf7)', border: '1px solid #c8e6d4', borderRadius: '10px', padding: '0.7rem 1rem' }}>
                          <div>
                            <p style={{ color: '#1a2e25', fontWeight: 600, margin: '0 0 2px', fontSize: '0.88rem' }}>{label}</p>
                            <p style={{ color: '#3d6b55', fontSize: '0.78rem', margin: 0 }}>
                              {r.estado === 'lista_espera' ? '📋 Lista de espera' : '✅ Activa'}
                            </p>
                          </div>
                          <button
                            onClick={() => setCancelSuscFecha(r)}
                            style={{ padding: '0.4rem 0.9rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            Cancelar esta
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={cerrarCancelSusc} style={{ marginTop: '1.2rem', width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #b8dece', background: 'transparent', color: '#3d6b55', fontWeight: 600, cursor: 'pointer' }}>
                    Cerrar
                  </button>
                </>
              )}

              {/* Paso 2 — confirmar fecha seleccionada */}
              {cancelSuscFecha && !cancelSuscResult && (() => {
                const [y, m, d] = cancelSuscFecha.fecha.split('-')
                const label = new Date(+y, +m - 1, +d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                return (
                  <>
                    <p style={{ color: '#3d6b55', marginBottom: '0.5rem' }}>¿Confirmás la cancelación de la clase del:</p>
                    <div style={{ background: 'linear-gradient(145deg,#eaf5ef,#f4faf7)', border: '1px solid #c8e6d4', borderRadius: '10px', padding: '0.9rem 1.1rem', marginBottom: '1rem' }}>
                      <p style={{ color: '#1a2e25', fontWeight: 700, margin: '0 0 4px' }}>{cancelSusc.clase_nombre}</p>
                      <p style={{ color: '#3d6b55', fontSize: '0.88rem', margin: 0 }}>📅 {label} · 🕐 {cancelSusc.horario}</p>
                    </div>
                    <div style={{ background: 'rgba(26,157,133,0.06)', border: '1px solid rgba(26,157,133,0.2)', borderRadius: '8px', padding: '0.7rem 1rem', marginBottom: '1.2rem', fontSize: '0.82rem', color: '#1a6b55' }}>
                      <p style={{ margin: '0 0 4px', fontWeight: 600 }}>ℹ️ Reglas de cancelación:</p>
                      <p style={{ margin: 0 }}>+48 h → crédito del mismo tipo de clase<br/>24-48 h → descuento en próxima cuota<br/>-24 h → sin beneficio</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={() => setCancelSuscFecha(null)} disabled={cancelSuscLoading} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #b8dece', background: 'transparent', color: '#3d6b55', fontWeight: 600, cursor: 'pointer' }}>
                        ← Volver
                      </button>
                      <button onClick={handleCancelarClaseSusc} disabled={cancelSuscLoading} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                        {cancelSuscLoading ? 'Cancelando…' : 'Sí, cancelar'}
                      </button>
                    </div>
                  </>
                )
              })()}

              {/* Paso 3 — resultado */}
              {cancelSuscResult && (() => {
                const MSGS = {
                  credito_generado: { icon: '🎟️', title: 'Crédito generado', desc: `Se generó un crédito de ${cancelSusc.clase_nombre?.split(' ')[0] || 'clase'} válido para el mes en curso.` },
                  limite_creditos:  { icon: 'ℹ️', title: 'Límite de créditos', desc: 'Ya tenés 3 créditos activos este mes. No se generó un nuevo crédito.' },
                  descuento_20:     { icon: '🏷️', title: '20% de descuento', desc: 'Tendrás un 20% de descuento en tu próxima mensualidad.' },
                  descuento_30:     { icon: '🏷️', title: '30% de descuento', desc: 'Tendrás un 30% de descuento en tu próxima mensualidad.' },
                  sin_beneficio:    { icon: 'ℹ️', title: 'Sin beneficio', desc: 'La cancelación no genera crédito ni descuento.' },
                }
                const info = cancelSuscResult.error
                  ? { icon: '❌', title: 'Error', desc: cancelSuscResult.error }
                  : (MSGS[cancelSuscResult.resultado] || { icon: 'ℹ️', title: 'Clase cancelada', desc: '' })
                return (
                  <>
                    <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
                      <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{info.icon}</p>
                      <p style={{ color: '#1a2e25', fontWeight: 700, marginBottom: '0.4rem' }}>{info.title}</p>
                      <p style={{ color: '#3d6b55', fontSize: '0.88rem' }}>{info.desc}</p>
                    </div>
                    <button onClick={cerrarCancelSusc} style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#1a9d85,#147a68)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Aceptar</button>
                  </>
                )
              })()}

            </div>
          </div>
        </div>
      )}

      {/* ── Modal cancelar suscripción completa ── */}
      {cancelSuscTotal && (
        <div className={styles.overlay} onClick={cerrarCancelSuscTotal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Cancelar suscripción</h3>
              <button className={styles.closeBtn} onClick={cerrarCancelSuscTotal}>✕</button>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              {!cancelSuscTotalOk ? (
                <>
                  <div style={{ background: 'linear-gradient(145deg,#eaf5ef,#f4faf7)', border: '1px solid #c8e6d4', borderRadius: '10px', padding: '0.9rem 1.1rem', marginBottom: '1rem' }}>
                    <p style={{ color: '#1a2e25', fontWeight: 700, margin: '0 0 4px' }}>{cancelSuscTotal.clase_nombre}</p>
                    <p style={{ color: '#3d6b55', fontSize: '0.85rem', margin: 0 }}>📅 {cancelSuscTotal.dias} · 🕐 {cancelSuscTotal.horario}</p>
                  </div>
                  <p style={{ color: '#3d6b55', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                    ¿Estás seguro que deseás cancelar esta suscripción?
                  </p>
                  <div style={{ background: 'rgba(26,157,133,0.06)', border: '1px solid rgba(26,157,133,0.2)', borderRadius: '8px', padding: '0.7rem 1rem', marginBottom: '1.2rem', fontSize: '0.82rem', color: '#1a6b55' }}>
                    <p style={{ margin: 0 }}>
                      ℹ️ Tus clases ya abonadas de este mes se mantienen activas.
                      A partir del próximo mes la suscripción no se renovará.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={cerrarCancelSuscTotal} disabled={cancelSuscTotalLoading} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #b8dece', background: 'transparent', color: '#3d6b55', fontWeight: 600, cursor: 'pointer' }}>
                      No, volver
                    </button>
                    <button onClick={handleCancelarSuscripcionTotal} disabled={cancelSuscTotalLoading} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                      {cancelSuscTotalLoading ? 'Cancelando…' : 'Sí, cancelar'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
                    <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</p>
                    <p style={{ color: '#1a2e25', fontWeight: 700, marginBottom: '0.4rem' }}>Suscripción cancelada</p>
                    <p style={{ color: '#3d6b55', fontSize: '0.88rem' }}>
                      Tus clases ya abonadas siguen activas hasta la última fecha del período.
                      No se generarán cargos el próximo mes.
                    </p>
                  </div>
                  <button onClick={cerrarCancelSuscTotal} style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#1a9d85,#147a68)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Aceptar</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal pagar saldo pendiente ── */}
      {pagarSaldo && (
        <div className={styles.overlay} onClick={cerrarPagarSaldo}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Pagar saldo pendiente</h3>
              <button className={styles.closeBtn} onClick={cerrarPagarSaldo}>✕</button>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              {!pagarSaldoOk ? (
                <>
                  {/* Detalle de clase y monto */}
                  <div style={{ background: 'linear-gradient(145deg,#eaf5ef,#f4faf7)', border: '1px solid #c8e6d4', borderRadius: '10px', padding: '0.9rem 1.1rem', marginBottom: '1.2rem' }}>
                    <p style={{ color: '#1a2e25', fontWeight: 700, margin: '0 0 4px' }}>{pagarSaldo.clase_nombre}</p>
                    <p style={{ color: '#3d6b55', fontSize: '0.88rem', margin: '0 0 8px' }}>📅 {formatFecha(pagarSaldo.fecha)} · 🕐 {pagarSaldo.horario}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #c8e6d4', paddingTop: '8px', marginTop: '4px' }}>
                      <span style={{ color: '#3d6b55', fontSize: '0.85rem' }}>Ya abonado</span>
                      <span style={{ color: '#1a2e25', fontWeight: 600 }}>${(pagarSaldo.monto_pagado ?? 0).toLocaleString('es-AR')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ color: '#1a6b55', fontWeight: 700, fontSize: '0.9rem' }}>Monto a pagar</span>
                      <span style={{ color: '#1a2e25', fontWeight: 800, fontSize: '1.05rem' }}>
                        ${(((pagarSaldo.monto_total ?? 0) - (pagarSaldo.monto_pagado ?? 0))).toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>

                  {/* Formulario de tarjeta */}
                  <p style={{ color: '#3d6b55', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.75rem' }}>Ingresá los datos de tu tarjeta</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                    <input
                      type="text"
                      placeholder="Número de tarjeta"
                      maxLength={19}
                      value={pagarSaldoPago.numero}
                      onChange={e => setPagarSaldoPago(p => ({ ...p, numero: e.target.value }))}
                      style={{ padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1.5px solid #b8dece', background: '#f4faf7', color: '#1a2e25', fontSize: '0.9rem', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={pagarSaldoPago.nombre}
                        onChange={e => setPagarSaldoPago(p => ({ ...p, nombre: e.target.value }))}
                        style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1.5px solid #b8dece', background: '#f4faf7', color: '#1a2e25', fontSize: '0.9rem', outline: 'none' }}
                      />
                      <input
                        type="text"
                        placeholder="Apellido"
                        value={pagarSaldoPago.apellido}
                        onChange={e => setPagarSaldoPago(p => ({ ...p, apellido: e.target.value }))}
                        style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1.5px solid #b8dece', background: '#f4faf7', color: '#1a2e25', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="DNI"
                        maxLength={8}
                        value={pagarSaldoPago.dni}
                        onChange={e => setPagarSaldoPago(p => ({ ...p, dni: e.target.value }))}
                        style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1.5px solid #b8dece', background: '#f4faf7', color: '#1a2e25', fontSize: '0.9rem', outline: 'none' }}
                      />
                      <input
                        type="text"
                        placeholder="CVV"
                        maxLength={4}
                        value={pagarSaldoPago.cvv}
                        onChange={e => setPagarSaldoPago(p => ({ ...p, cvv: e.target.value }))}
                        style={{ width: '90px', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1.5px solid #b8dece', background: '#f4faf7', color: '#1a2e25', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {pagarSaldoError && (
                    <p style={{ color: '#b91c1c', fontSize: '0.85rem', marginBottom: '0.75rem', background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.2)', borderRadius: '8px', padding: '0.5rem 0.8rem' }}>
                      ❌ {pagarSaldoError}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={cerrarPagarSaldo} disabled={pagarSaldoLoading} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #b8dece', background: 'transparent', color: '#3d6b55', fontWeight: 600, cursor: 'pointer' }}>
                      Cancelar
                    </button>
                    <button onClick={handlePagarSaldo} disabled={pagarSaldoLoading} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#1a9d85,#147a68)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                      {pagarSaldoLoading ? 'Procesando…' : '💳 Pagar'}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
                  <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</p>
                  <p style={{ color: '#1a2e25', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>¡Pago realizado con éxito!</p>
                  <p style={{ color: '#3d6b55', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                    Tu reserva de <strong>{pagarSaldo.clase_nombre}</strong> está completamente abonada.
                  </p>
                  <button onClick={cerrarPagarSaldo} style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#1a9d85,#147a68)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                    Aceptar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
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
          }} onClick={() => setDetalleSusc(null)}>
            <div style={{
              background: 'linear-gradient(160deg, #e8f5ee 0%, #daeee3 100%)',
              border: '1px solid #b8dece',
              borderRadius: '20px', width: '100%', maxWidth: '480px',
              maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(10,35,25,0.30)'
            }} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ padding: '1.4rem 1.8rem 1rem', borderBottom: '1px solid #b8dece', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <h3 style={{ color: '#1a2e25', margin: 0, fontSize: '1.1rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {detalleSusc.clase_nombre}
                  </h3>
                  <span style={{
                    background: esUnica ? 'rgba(5,150,105,0.10)' : 'rgba(26,157,133,0.12)',
                    color: esUnica ? '#065f46' : '#147a68',
                    border: `1px solid ${esUnica ? 'rgba(5,150,105,0.30)' : 'rgba(26,157,133,0.35)'}`,
                    borderRadius: '5px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0
                  }}>{esUnica ? 'Reserva única' : 'Suscripción'}</span>
                </div>
                <button onClick={() => setDetalleSusc(null)} style={{ background: '#f0f7f3', border: '1px solid #b8dece', color: '#3d6b55', borderRadius: '8px', width: 32, height: 32, minWidth: 32, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              {/* Body */}
              <div style={{ padding: '1.4rem 1.8rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

                {/* Badges de estado */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {esUnica ? (
                    <span style={{
                      background: detalleSusc.lista_espera ? 'rgba(217,119,6,0.10)' : 'rgba(5,150,105,0.10)',
                      color: detalleSusc.lista_espera ? '#92400e' : '#065f46',
                      border: `1px solid ${detalleSusc.lista_espera ? 'rgba(217,119,6,0.30)' : 'rgba(5,150,105,0.30)'}`,
                      borderRadius: '8px', padding: '4px 12px', fontSize: '0.82rem', fontWeight: 700
                    }}>
                      {detalleSusc.lista_espera ? '📋 Lista de espera' : '✅ Confirmada'}
                    </span>
                  ) : (
                    <>
                      <span style={{
                        background: detalleSusc.estado === 'activa' ? 'rgba(5,150,105,0.10)' : detalleSusc.estado === 'cancelada' ? 'rgba(239,68,68,0.10)' : 'rgba(217,119,6,0.10)',
                        color: detalleSusc.estado === 'activa' ? '#065f46' : detalleSusc.estado === 'cancelada' ? '#b91c1c' : '#92400e',
                        border: `1px solid ${detalleSusc.estado === 'activa' ? 'rgba(5,150,105,0.30)' : detalleSusc.estado === 'cancelada' ? 'rgba(185,28,28,0.30)' : 'rgba(217,119,6,0.30)'}`,
                        borderRadius: '8px', padding: '4px 12px', fontSize: '0.82rem', fontWeight: 700
                      }}>
                        {detalleSusc.estado === 'activa' ? '✅ Activa' : detalleSusc.estado === 'cancelada' ? '🚫 Cancelada' : '⏳ Pendiente de pago'}
                      </span>
                      {detalleSusc.en_espera && (
                        <span style={{ background: 'rgba(217,119,6,0.10)', color: '#92400e', border: '1px solid rgba(217,119,6,0.30)', borderRadius: '8px', padding: '4px 12px', fontSize: '0.82rem', fontWeight: 700 }}>
                          📋 Lista de espera
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 1.2rem', fontSize: '0.88rem' }}>
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
                      <span style={{ color: '#3d6b55', fontWeight: 500 }} key={`k-${k}`}>{k}</span>
                      <span style={{ color: '#1a2e25', fontWeight: 600 }} key={`v-${k}`}>{v}</span>
                    </>
                  ))}
                </div>

                {/* Fechas de clases (solo suscripción) */}
                {!esUnica && detalleSusc.reservas && (
                  <div>
                    <p style={{ color: '#1a9d85', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                      Fechas de clases
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {detalleSusc.reservas.map(r => {
                        const [y, m, d] = r.fecha.split('-')
                        const label = new Date(+y, +m - 1, +d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
                        return (
                          <div key={r.fecha} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'linear-gradient(145deg, #eaf5ef, #f4faf7)',
                            border: '1px solid #c8e6d4',
                            borderRadius: '8px', padding: '6px 10px'
                          }}>
                            <span style={{ color: '#1a2e25', fontSize: '0.85rem', fontWeight: 500 }}>{label}</span>
                            {r.estado === 'lista_espera' && (
                              <span style={{ background: 'rgba(217,119,6,0.10)', color: '#92400e', border: '1px solid rgba(217,119,6,0.25)', borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700 }}>
                                Lista de espera
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Modal cambiar turno ── */}
      {cambiarTurnoSusc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,31,23,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={cerrarCambiarTurno}>
          <div style={{ background: 'linear-gradient(160deg,#e8f5ee,#daeee3)', border: '1px solid #b8dece', borderRadius: '20px', padding: '2rem 2.2rem', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}>

            {cambiarTurnoOk ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</p>
                <p style={{ color: '#0f1f17', fontWeight: 700, marginBottom: '1.5rem' }}>¡Turno cambiado con éxito!</p>
                <button onClick={cerrarCambiarTurno} style={{ padding: '0.65rem 2rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#1a9d85,#147a68)', color: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(26,157,133,0.3)' }}>Cerrar</button>
              </div>
            ) : (
              <>
                <h3 style={{ color: '#0f1f17', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.4rem' }}>Cambiar turno</h3>
                <p style={{ color: '#3d6b55', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
                  Clase actual: <strong style={{ color: '#1a9d85' }}>{cambiarTurnoSusc.clase_nombre}</strong>
                </p>

                {clasesDispLoading ? (
                  <p style={{ color: '#3d6b55', textAlign: 'center' }}>Cargando clases disponibles...</p>
                ) : clasesDisponibles.length === 0 ? (
                  <p style={{ color: '#3d6b55', textAlign: 'center' }}>No hay clases disponibles para cambiar el turno este mes.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.2rem' }}>
                    {clasesDisponibles.map(c => (
                      <button key={c.id}
                        onClick={() => setNuevaClaseSel(c)}
                        style={{
                          padding: '0.75rem 1rem', borderRadius: '10px', textAlign: 'left',
                          border: `1.5px solid ${nuevaClaseSel?.id === c.id ? '#1a9d85' : '#b8dece'}`,
                          background: nuevaClaseSel?.id === c.id ? 'rgba(26,157,133,0.12)' : 'rgba(255,255,255,0.5)',
                          color: '#0f1f17', cursor: 'pointer',
                        }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.2rem', color: '#0f1f17' }}>{c.nombre}</p>
                        <p style={{ fontSize: '0.82rem', color: '#3d6b55' }}>{c.dias} · {c.horario} · {c.aula || 'Sin aula'}</p>
                        <p style={{ fontSize: '0.82rem', color: '#1a9d85', fontWeight: 600 }}>${parseFloat(c.valor).toLocaleString('es-AR')}</p>
                      </button>
                    ))}
                  </div>
                )}

                {cambiarTurnoError && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{cambiarTurnoError}</p>}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button onClick={cerrarCambiarTurno}
                    style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: '1.5px solid #b8dece', background: 'transparent', color: '#1a2e25', fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={handleCambiarTurno}
                    disabled={!nuevaClaseSel || cambiarTurnoLoading}
                    style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: 'none', background: nuevaClaseSel && !cambiarTurnoLoading ? 'linear-gradient(135deg,#1a9d85,#147a68)' : '#c8d8d0', color: 'white', fontWeight: 600, cursor: nuevaClaseSel && !cambiarTurnoLoading ? 'pointer' : 'not-allowed', boxShadow: nuevaClaseSel ? '0 4px 14px rgba(26,157,133,0.3)' : 'none' }}>
                    {cambiarTurnoLoading ? 'Cambiando...' : 'Confirmar cambio'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
