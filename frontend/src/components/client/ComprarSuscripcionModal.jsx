import { useState, useEffect } from 'react'
import {
  getClasesFijasRequest,
  calcularSuscripcionRequest,
  pagarSuscripcionRequest,
  getClasesParaReprogramarRequest,
} from '../../api/clases'
import styles from './ComprarSuscripcionModal.module.css'

const MESES_ES   = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_CAL   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

// Día de semana en JS (0=Dom) → nombre en español del modelo
const JS_DAY_A_DIA = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves',  5: 'Viernes', 6: 'Sábado',
}

function clasesDelDia(clasesFijas, jsDay) {
  const dia = JS_DAY_A_DIA[jsDay]
  return clasesFijas.filter(c => c.dias === dia)
}

function fmt(fecha) {
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}
function fmtLargo(fecha) {
  const [y, m, d] = fecha.split('-')
  const date = new Date(+y, +m - 1, +d)
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function ComprarSuscripcionModal({ onClose, onSuscripcionOk }) {
  const hoy  = new Date()
  const mes  = hoy.getMonth() + 1
  const anio = hoy.getFullYear()

  // ── Cálculo de calendario (paso 1) ───────────────────
  const primerDia = new Date(anio, mes - 1, 1).getDay()  // 0=Dom
  const diasEnMes = new Date(anio, mes, 0).getDate()
  const todayStr  = `${anio}-${String(mes).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`
  const celdas    = [...Array(primerDia).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)]

  // ── Estado general ────────────────────────────────────
  const [paso,         setPaso]         = useState(1)
  const [clasesFijas,  setClasesFijas]  = useState([])
  const [cargando,     setCargando]     = useState(true)
  const [claseSelec,   setClaseSelec]   = useState(null)
  const [calculo,      setCalculo]      = useState(null)
  const [calcCargando, setCalcCargando] = useState(false)

  // Manejo feriados: { "fecha": "descuento" | { clase_alt_id, fecha_alt, clase_alt_nombre } }
  const [opcionesFeriado, setOpcionesFeriado] = useState({})
  // Alternativas para reprogramar por fecha
  const [alternativas, setAlternativas] = useState({})  // { fecha: [opciones] }
  const [altCargando,  setAltCargando]  = useState({})  // { fecha: bool }
  const [feriadoActual, setFeriadoActual] = useState(0) // índice del feriado que estamos resolviendo

  // Pago
  const [pago, setPago] = useState({ numero: '', nombre: '', apellido: '', dni: '', cvv: '' })
  const [pagando, setPagando] = useState(false)
  const [error,   setError]   = useState('')

  // ── Carga clases fijas ────────────────────────────────
  useEffect(() => {
    getClasesFijasRequest()
      .then(r => setClasesFijas(r.data.filter(c => c.estado !== 'cancelada')))
      .catch(() => setError('No se pudieron cargar las clases.'))
      .finally(() => setCargando(false))
  }, [])

  // ── Seleccionar clase → calcular ──────────────────────
  const seleccionarClase = async (clase) => {
    setClaseSelec(clase)
    setCalcCargando(true)
    setError('')
    try {
      const r = await calcularSuscripcionRequest(clase.id, mes, anio)
      setCalculo(r.data)
      setPaso(2)
    } catch {
      setError('No se pudo calcular la suscripción.')
    } finally {
      setCalcCargando(false)
    }
  }

  // ── Continuar desde detalles ──────────────────────────
  const handleSuscribirse = () => {
    if (calculo.feriados_en_ocurrencias.length > 0) {
      setFeriadoActual(0)
      setPaso(3)
    } else {
      setPaso(4)
    }
  }

  // ── Feriados: elegir opción ───────────────────────────
  const elegirDescuento = (fecha) => {
    setOpcionesFeriado(prev => ({ ...prev, [fecha]: 'descuento' }))
  }

  const elegirReprogramar = async (fecha) => {
    setAltCargando(prev => ({ ...prev, [fecha]: true }))
    try {
      const r = await getClasesParaReprogramarRequest(claseSelec.especialidad, fecha)
      setAlternativas(prev => ({ ...prev, [fecha]: r.data }))
    } catch {
      setAlternativas(prev => ({ ...prev, [fecha]: [] }))
    } finally {
      setAltCargando(prev => ({ ...prev, [fecha]: false }))
    }
    setOpcionesFeriado(prev => ({ ...prev, [fecha]: 'reprogramar_pendiente' }))
  }

  const elegirAlternativa = (fecha, alt) => {
    setOpcionesFeriado(prev => ({
      ...prev,
      [fecha]: { clase_alt_id: alt.clase_id, fecha_alt: alt.fecha, clase_alt_nombre: alt.clase_nombre },
    }))
  }

  const todosFeriadosResueltos = () => {
    return calculo.feriados_en_ocurrencias.every(f => {
      const op = opcionesFeriado[f]
      if (!op) return false
      if (op === 'descuento') return true
      if (op === 'reprogramar_pendiente') return false
      if (typeof op === 'object') return true
      return false
    })
  }

  // ── Calcular total con opciones ───────────────────────
  const calcularTotal = () => {
    if (!calculo) return 0
    const descuentosFeriado = calculo.feriados_en_ocurrencias.filter(
      f => opcionesFeriado[f] === 'descuento'
    ).length
    const base = calculo.precio_base
    const midDiscount = calculo.descuento_mid_month
    const feriadoDiscount = calculo.precio_por_clase * descuentosFeriado
    return Math.max(base - midDiscount - feriadoDiscount, 0)
  }

  // ── Pagar ─────────────────────────────────────────────
  const handlePagar = async () => {
    const { numero, nombre, apellido, dni, cvv } = pago
    if (!numero || !nombre || !apellido || !dni || !cvv) {
      setError('Completá todos los campos.')
      return
    }
    setPagando(true)
    setError('')
    try {
      // Construir opciones de feriado para el backend
      const opBackend = {}
      for (const [fecha, op] of Object.entries(opcionesFeriado)) {
        if (op === 'descuento') {
          opBackend[fecha] = 'descuento'
        } else if (typeof op === 'object') {
          opBackend[fecha] = { clase_alt_id: op.clase_alt_id, fecha_alt: op.fecha_alt }
        }
      }
      await pagarSuscripcionRequest({
        clase_id: claseSelec.id,
        mes, anio,
        opciones_feriado: opBackend,
        datos_pago: pago,
      })
      setPaso(6)
      onSuscripcionOk?.()
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al procesar el pago.')
    } finally {
      setPagando(false)
    }
  }

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {paso > 1 && paso < 6 && (
              <button className={styles.backBtn} onClick={() => setPaso(p => p - 1)}>← Volver</button>
            )}
            <h2 className={styles.title}>
              {paso === 1 && 'Elegí tu clase'}
              {paso === 2 && 'Resumen de suscripción'}
              {paso === 3 && 'Clases en feriado'}
              {paso === 4 && 'Resumen final'}
              {paso === 5 && 'Datos de pago'}
              {paso === 6 && '¡Pago aprobado!'}
            </h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Barra de progreso */}
        {paso < 6 && (
          <div className={styles.progress}>
            {[1,2,3,4,5].map(n => (
              <div key={n} className={`${styles.progressStep} ${paso >= n ? styles.progressActive : ''}`} />
            ))}
          </div>
        )}

        {/* ── PASO 1: Calendario ───────────────────────── */}
        {paso === 1 && (
          <div className={styles.body} style={{ padding: '1rem 1.4rem 1.4rem' }}>
            {cargando ? (
              <p className={styles.loading}>Cargando clases...</p>
            ) : (
              <>
                <p className={styles.subtitle} style={{ marginBottom: '0.75rem' }}>
                  Tocá una clase del calendario para suscribirte · {MESES_ES[mes]} {anio}
                </p>

                {/* Nombres días */}
                <div className={styles.calHeader}>
                  {DIAS_CAL.map(d => <div key={d} className={styles.calDayName}>{d}</div>)}
                </div>

                {/* Celdas */}
                <div className={styles.calGrid}>
                  {celdas.map((dia, i) => {
                    if (!dia) return <div key={`e-${i}`} className={styles.calCell} />
                    const jsDay  = new Date(anio, mes - 1, dia).getDay()
                    const ds     = `${anio}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
                    const esHoy  = ds === todayStr
                    const pasado = ds < todayStr
                    const clases = clasesDelDia(clasesFijas, jsDay)

                    return (
                      <div
                        key={ds}
                        className={`${styles.calCell} ${esHoy ? styles.calCellHoy : ''} ${pasado ? styles.calCellPasado : ''}`}
                      >
                        <span className={styles.calNum}>{dia}</span>
                        {clases.map(c => (
                          <button
                            key={c.id}
                            className={styles.calClaseBtn}
                            onClick={() => !pasado && !calcCargando && seleccionarClase(c)}
                            disabled={pasado || calcCargando}
                            title={`${c.nombre} · ${c.horario}`}
                          >
                            <span className={styles.calClaseNombre}>{c.nombre}</span>
                            <span className={styles.calClaseHorario}>{c.horario}</span>
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>

                {clasesFijas.length === 0 && (
                  <p className={styles.empty}>No hay clases fijas disponibles aún.</p>
                )}
                {calcCargando && <p className={styles.loading} style={{ textAlign:'center' }}>Cargando...</p>}
                {error && <p className={styles.errorMsg}>{error}</p>}
              </>
            )}
          </div>
        )}

        {/* ── PASO 2: Detalles ─────────────────────────── */}
        {paso === 2 && calculo && (
          <div className={styles.body}>
            {/* Info clase */}
            <div className={styles.infoCard}>
              <h3 className={styles.infoTitle}>{calculo.clase.nombre}</h3>
              <div className={styles.infoGrid}>
                <span>Día</span>        <span>{calculo.clase.dias}</span>
                <span>Horario</span>    <span>{calculo.clase.horario}</span>
                <span>Aula</span>       <span>{calculo.clase.aula || '—'}</span>
                <span>Profesor</span>   <span>{calculo.clase.profesor_nombre || 'Sin asignar'}</span>
                <span>Especialidad</span><span>{calculo.clase.especialidad_display}</span>
                <span>Disponibilidad</span>
                <span className={calculo.clase.cantidad_inscriptos >= calculo.clase.cupo ? styles.lleno : styles.libre}>
                  {calculo.clase.cantidad_inscriptos >= calculo.clase.cupo
                    ? 'Clase llena — quedás en lista de espera'
                    : `${calculo.clase.cupo - calculo.clase.cantidad_inscriptos} lugares disponibles`}
                </span>
              </div>
            </div>

            {/* Apto */}
            {!calculo.apto_aprobado && (
              <div className={styles.alertaRoja}>
                🔒 Debés tener un <strong>apto físico aprobado</strong> para suscribirte a clases.
                Cargalo desde "Mi Perfil".
              </div>
            )}

            {/* Ya suscripto */}
            {calculo.ya_suscripto && (
              <div className={styles.alertaRoja}>
                Ya estás suscripto a esta clase este mes.
              </div>
            )}

            {/* Conflictos */}
            {calculo.conflictos.length > 0 && (
              <div className={styles.alertaAmarilla}>
                ⚠️ Tenés conflictos de horario en estas fechas:
                {calculo.conflictos.map(c => (
                  <div key={c.fecha}>• {fmt(c.fecha)} — superpone con "{c.clase_conflicto}"</div>
                ))}
              </div>
            )}

            {/* Feriados */}
            {calculo.feriados_en_ocurrencias.length > 0 && (
              <div className={styles.alertaAmarilla}>
                📅 {calculo.feriados_en_ocurrencias.length} de tus clases caen en feriado. Podrás elegir descuento o reprogramar en el siguiente paso.
              </div>
            )}

            {/* Ocurrencias */}
            <div className={styles.ocurrenciasBlock}>
              <h4>Clases incluidas ({MESES_ES[mes]} {anio})</h4>
              {calculo.ocurrencias.length === 0 ? (
                <p className={styles.empty}>No quedan clases este mes.</p>
              ) : (
                calculo.ocurrencias.map(f => (
                  <div key={f} className={`${styles.ocurrenciaRow} ${calculo.feriados_en_ocurrencias.includes(f) ? styles.ocurrenciaFeriado : ''}`}>
                    <span>{fmtLargo(f)}</span>
                    {calculo.feriados_en_ocurrencias.includes(f) && <span className={styles.feriadoTag}>Feriado</span>}
                  </div>
                ))
              )}
            </div>

            {/* Precio */}
            <div className={styles.precioBlock}>
              <div className={styles.precioRow}><span>{calculo.num_clases} clase{calculo.num_clases !== 1 ? 's' : ''}</span><span>${calculo.precio_base.toLocaleString('es-AR')}</span></div>
              {calculo.descuento_mid_month > 0 && (
                <div className={styles.precioRow}><span>Descuento (inscripción a mitad de mes)</span><span className={styles.descuento}>-${calculo.descuento_mid_month.toLocaleString('es-AR')}</span></div>
              )}
              <div className={`${styles.precioRow} ${styles.precioTotal}`}><span>Total estimado</span><span>${calculo.total.toLocaleString('es-AR')}</span></div>
            </div>

            {calculo.apto_aprobado && !calculo.ya_suscripto && calculo.ocurrencias.length > 0 && calculo.conflictos.length === 0 && (
              <button className={styles.btnPrimary} onClick={handleSuscribirse}>
                Suscribirse →
              </button>
            )}
          </div>
        )}

        {/* ── PASO 3: Feriados ─────────────────────────── */}
        {paso === 3 && calculo && (
          <div className={styles.body}>
            <p className={styles.subtitle}>
              Las siguientes clases caen en feriado. Elegí qué hacer con cada una:
            </p>
            {calculo.feriados_en_ocurrencias.map(fecha => (
              <div key={fecha} className={styles.feriadoBlock}>
                <div className={styles.feriadoFecha}>{fmtLargo(fecha)}</div>
                <div className={styles.feriadoOpciones}>
                  <button
                    className={`${styles.opcionBtn} ${opcionesFeriado[fecha] === 'descuento' ? styles.opcionActiva : ''}`}
                    onClick={() => elegirDescuento(fecha)}
                  >
                    💰 Descuento
                    <span className={styles.opcionDesc}>-${calculo.precio_por_clase.toLocaleString('es-AR')} del total</span>
                  </button>
                  <button
                    className={`${styles.opcionBtn} ${opcionesFeriado[fecha] === 'reprogramar_pendiente' || typeof opcionesFeriado[fecha] === 'object' ? styles.opcionActiva : ''}`}
                    onClick={() => elegirReprogramar(fecha)}
                  >
                    📅 Reprogramar
                    <span className={styles.opcionDesc}>Elegí otra clase esa semana</span>
                  </button>
                </div>

                {/* Alternativas de reprogramación */}
                {altCargando[fecha] && <p className={styles.loading}>Buscando clases...</p>}
                {alternativas[fecha] && !altCargando[fecha] && (
                  <div className={styles.alternativasGrid}>
                    {alternativas[fecha].length === 0 ? (
                      <p className={styles.empty}>No hay clases disponibles esa semana.</p>
                    ) : alternativas[fecha].map(alt => {
                      const seleccionada = typeof opcionesFeriado[fecha] === 'object' &&
                        opcionesFeriado[fecha].fecha_alt === alt.fecha
                      return (
                        <button
                          key={`${alt.clase_id}-${alt.fecha}`}
                          className={`${styles.altCard} ${seleccionada ? styles.altSeleccionada : ''}`}
                          onClick={() => elegirAlternativa(fecha, alt)}
                        >
                          <span className={styles.altNombre}>{alt.clase_nombre}</span>
                          <span className={styles.altFecha}>{fmtLargo(alt.fecha)}</span>
                          <span className={styles.altHorario}>{alt.horario}</span>
                          {!alt.disponible && <span className={styles.altEspera}>Lista de espera</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}

            <button
              className={styles.btnPrimary}
              disabled={!todosFeriadosResueltos()}
              onClick={() => setPaso(4)}
            >
              Continuar →
            </button>
          </div>
        )}

        {/* ── PASO 4: Resumen final ─────────────────────── */}
        {paso === 4 && calculo && (
          <div className={styles.body}>
            <div className={styles.resumenClase}>
              <h3>{claseSelec?.nombre}</h3>
              <p>{claseSelec?.dias} · {claseSelec?.horario}</p>
            </div>

            <h4 className={styles.resumenSubtitle}>Detalle de clases</h4>
            {calculo.ocurrencias.map(fecha => {
              const op = opcionesFeriado[fecha]
              const esFeriado = calculo.feriados_en_ocurrencias.includes(fecha)
              return (
                <div key={fecha} className={styles.resumenRow}>
                  <span>{fmtLargo(fecha)}</span>
                  {esFeriado && op === 'descuento' && <span className={styles.tagDescuento}>Descuento</span>}
                  {esFeriado && typeof op === 'object' && (
                    <span className={styles.tagReprog}>→ {op.clase_alt_nombre} {fmt(op.fecha_alt)}</span>
                  )}
                </div>
              )
            })}

            <div className={styles.precioBlock} style={{ marginTop: '1.5rem' }}>
              <div className={styles.precioRow}><span>{calculo.num_clases} clase{calculo.num_clases !== 1 ? 's' : ''}</span><span>${calculo.precio_base.toLocaleString('es-AR')}</span></div>
              {calculo.descuento_mid_month > 0 && (
                <div className={styles.precioRow}><span>Descuento mitad de mes (20%)</span><span className={styles.descuento}>-${calculo.descuento_mid_month.toLocaleString('es-AR')}</span></div>
              )}
              {calculo.feriados_en_ocurrencias.filter(f => opcionesFeriado[f] === 'descuento').length > 0 && (
                <div className={styles.precioRow}>
                  <span>Descuento feriados ({calculo.feriados_en_ocurrencias.filter(f => opcionesFeriado[f] === 'descuento').length} clase{calculo.feriados_en_ocurrencias.filter(f => opcionesFeriado[f] === 'descuento').length > 1 ? 's' : ''})</span>
                  <span className={styles.descuento}>-${(calculo.precio_por_clase * calculo.feriados_en_ocurrencias.filter(f => opcionesFeriado[f] === 'descuento').length).toLocaleString('es-AR')}</span>
                </div>
              )}
              <div className={`${styles.precioRow} ${styles.precioTotal}`}>
                <span>Total a pagar</span>
                <span>${calcularTotal().toLocaleString('es-AR')}</span>
              </div>
            </div>

            <button className={styles.btnPrimary} onClick={() => setPaso(5)}>
              Ir a pagar →
            </button>
          </div>
        )}

        {/* ── PASO 5: Pago ──────────────────────────────── */}
        {paso === 5 && (
          <div className={styles.body}>
            <div className={styles.totalDestacado}>
              Total: <strong>${calcularTotal().toLocaleString('es-AR')}</strong>
            </div>

            <div className={styles.formPago}>
              <div className={styles.formGroup}>
                <label>Número de tarjeta</label>
                <input
                  type="text" maxLength={19} placeholder="1234 5678 9012 3456"
                  value={pago.numero}
                  onChange={e => setPago(p => ({ ...p, numero: e.target.value }))}
                  className={styles.input}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Nombre</label>
                  <input type="text" placeholder="Juan" value={pago.nombre}
                    onChange={e => setPago(p => ({ ...p, nombre: e.target.value }))}
                    className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Apellido</label>
                  <input type="text" placeholder="Pérez" value={pago.apellido}
                    onChange={e => setPago(p => ({ ...p, apellido: e.target.value }))}
                    className={styles.input} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>DNI</label>
                  <input type="text" placeholder="12345678" value={pago.dni}
                    onChange={e => setPago(p => ({ ...p, dni: e.target.value }))}
                    className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label>Código de seguridad</label>
                  <input type="text" maxLength={4} placeholder="123" value={pago.cvv}
                    onChange={e => setPago(p => ({ ...p, cvv: e.target.value }))}
                    className={styles.input} />
                </div>
              </div>
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <button className={styles.btnPrimary} onClick={handlePagar} disabled={pagando}>
              {pagando ? 'Procesando...' : '💳 Pagar'}
            </button>
          </div>
        )}

        {/* ── PASO 6: Éxito ─────────────────────────────── */}
        {paso === 6 && (
          <div className={styles.body} style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ color: '#22c55e', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              ¡Pago aprobado!
            </h2>
            <p style={{ color: '#b0b3c7', marginBottom: '2rem' }}>
              Tu suscripción a <strong style={{ color: 'white' }}>{claseSelec?.nombre}</strong> fue registrada correctamente.
              Tus clases ya aparecen en tu calendario.
            </p>
            <button className={styles.btnPrimary} onClick={onClose}>
              Volver al inicio
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
