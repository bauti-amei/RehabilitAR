import { useState, useEffect, useMemo } from 'react'
import { getClasesParaReservarRequest, reservarClaseUnicaRequest } from '../../api/clases'
import styles from './ReservarClaseModal.module.css'

const MESES_ES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_CAL = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function fmt(fecha) {
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}
function fmtLargo(fecha) {
  const [y, m, d] = fecha.split('-')
  return new Date(+y, +m - 1, +d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function ReservarClaseModal({ onClose, onReservaOk }) {
  const hoyDate = new Date()
  const [mes,  setMes]  = useState(hoyDate.getMonth() + 1)
  const [anio, setAnio] = useState(hoyDate.getFullYear())

  // ── Calendario ───────────────────────────────────────
  const primerDia = new Date(anio, mes - 1, 1).getDay()
  const diasEnMes = new Date(anio, mes, 0).getDate()
  const todayStr  = `${anio}-${String(mes).padStart(2,'0')}-${String(hoyDate.getDate()).padStart(2,'0')}`
  const celdas    = [...Array(primerDia).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)]

  // ── Estado ───────────────────────────────────────────
  const [paso,        setPaso]        = useState(1)
  const [cargando,    setCargando]    = useState(true)
  const [opciones,    setOpciones]    = useState([])   // flat list del backend
  const [aptoOk,      setAptoOk]      = useState(true)
  const [seleccion,   setSeleccion]   = useState(null) // { clase_id, clase_nombre, fecha, horario, valor, cupo_disponible, ... }
  const [pago,        setPago]        = useState({ numero: '', nombre: '', apellido: '', dni: '', cvv: '' })
  const [pagando,     setPagando]     = useState(false)
  const [resultado,   setResultado]   = useState(null) // { estado: 'activa'|'lista_espera', detail }
  const [error,       setError]       = useState('')

  // ── Cargar opciones al cambiar mes/año ───────────────
  useEffect(() => {
    setCargando(true)
    setError('')
    getClasesParaReservarRequest(mes, anio)
      .then(r => {
        setOpciones(r.data.opciones)
        setAptoOk(r.data.apto_aprobado)
      })
      .catch(() => setError('No se pudieron cargar las clases.'))
      .finally(() => setCargando(false))
  }, [mes, anio])

  // ── Agrupar opciones por fecha ────────────────────────
  const opcionesPorFecha = useMemo(() => {
    const map = {}
    opciones.forEach(op => {
      if (!map[op.fecha]) map[op.fecha] = []
      map[op.fecha].push(op)
    })
    return map
  }, [opciones])

  // ── Navegar meses ─────────────────────────────────────
  const prevMes = () => {
    if (mes === 1) { setMes(12); setAnio(a => a - 1) }
    else setMes(m => m - 1)
  }
  const nextMes = () => {
    if (mes === 12) { setMes(1); setAnio(a => a + 1) }
    else setMes(m => m + 1)
  }

  // ── Seleccionar clase ─────────────────────────────────
  const seleccionarClase = (op) => {
    setSeleccion(op)
    setError('')
    setPaso(2)
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
      const r = await reservarClaseUnicaRequest({
        clase_id:   seleccion.clase_id,
        fecha:      seleccion.fecha,
        datos_pago: pago,
      })
      setResultado({ estado: r.data.estado, detail: r.data.detail })
      setPaso(4)
      onReservaOk?.()
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
            {paso > 1 && paso < 4 && (
              <button className={styles.backBtn} onClick={() => setPaso(p => p - 1)}>← Volver</button>
            )}
            <h2 className={styles.title}>
              {paso === 1 && 'Elegí una clase'}
              {paso === 2 && 'Detalle de la reserva'}
              {paso === 3 && 'Datos de pago'}
              {paso === 4 && (resultado?.estado === 'lista_espera' ? '📋 Lista de espera' : '¡Reserva confirmada!')}
            </h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Progreso */}
        {paso < 4 && (
          <div className={styles.progress}>
            {[1,2,3].map(n => (
              <div key={n} className={`${styles.progressStep} ${paso >= n ? styles.progressActive : ''}`} />
            ))}
          </div>
        )}

        {/* ── PASO 1: Calendario ───────────────────────── */}
        {paso === 1 && (
          <div className={styles.body} style={{ padding: '1rem 1.4rem 1.4rem' }}>
            {!aptoOk && (
              <div className={styles.alertaRoja}>
                🔒 Necesitás un <strong>apto físico aprobado</strong> para reservar clases. Cargalo desde "Mi Perfil".
              </div>
            )}

            {/* Navegación de mes */}
            <div className={styles.calNav}>
              <button className={styles.calNavBtn} onClick={prevMes}>‹</button>
              <span className={styles.calNavTitle}>{MESES_ES[mes]} {anio}</span>
              <button className={styles.calNavBtn} onClick={nextMes}>›</button>
            </div>

            {cargando ? (
              <p className={styles.loading}>Cargando clases disponibles...</p>
            ) : (
              <>
                <p className={styles.subtitle}>
                  Tocá una clase para reservarla. Solo se muestran clases sin conflicto de horario.
                </p>

                {/* Nombres días */}
                <div className={styles.calHeader}>
                  {DIAS_CAL.map(d => <div key={d} className={styles.calDayName}>{d}</div>)}
                </div>

                {/* Celdas */}
                <div className={styles.calGrid}>
                  {celdas.map((dia, i) => {
                    if (!dia) return <div key={`e-${i}`} className={styles.calCell} />
                    const ds     = `${anio}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
                    const esHoy  = ds === todayStr
                    const pasado = ds < todayStr
                    const clases = opcionesPorFecha[ds] || []

                    return (
                      <div
                        key={ds}
                        className={`${styles.calCell} ${esHoy ? styles.calCellHoy : ''} ${pasado ? styles.calCellPasado : ''}`}
                      >
                        <span className={styles.calNum}>{dia}</span>
                        {clases.map(op => (
                          <button
                            key={`${op.clase_id}-${op.fecha}`}
                            className={`${styles.calClaseBtn} ${op.cupo_disponible === 0 ? styles.calClaseLlena : ''}`}
                            onClick={() => !pasado && aptoOk && seleccionarClase(op)}
                            disabled={pasado || !aptoOk}
                            title={`${op.clase_nombre} · ${op.horario}`}
                          >
                            <span className={styles.calClaseNombre}>{op.clase_nombre}</span>
                            <span className={styles.calClaseHorario}>{op.horario}</span>
                            {op.cupo_disponible === 0 && (
                              <span className={styles.calClaseEspera}>Lista de espera</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>

                {opciones.length === 0 && !cargando && (
                  <p className={styles.empty}>No hay clases disponibles para este mes.</p>
                )}
                {error && <p className={styles.errorMsg}>{error}</p>}

                {/* Leyenda */}
                <div className={styles.leyenda}>
                  <span><span className={styles.dotDisp} />Lugar disponible</span>
                  <span><span className={styles.dotEspera} />Lista de espera</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PASO 2: Detalle ──────────────────────────── */}
        {paso === 2 && seleccion && (
          <div className={styles.body}>
            <div className={styles.infoCard}>
              <h3 className={styles.infoTitle}>{seleccion.clase_nombre}</h3>
              <div className={styles.infoGrid}>
                <span>Fecha</span>      <span>{fmtLargo(seleccion.fecha)}</span>
                <span>Horario</span>    <span>{seleccion.horario}</span>
                <span>Aula</span>       <span>{seleccion.aula || '—'}</span>
                <span>Profesor</span>   <span>{seleccion.profesor_nombre || 'Sin asignar'}</span>
                <span>Especialidad</span><span>{seleccion.especialidad}</span>
                <span>Disponibilidad</span>
                <span className={seleccion.cupo_disponible === 0 ? styles.lleno : styles.libre}>
                  {seleccion.cupo_disponible === 0
                    ? 'Clase llena — quedás en lista de espera'
                    : `${seleccion.cupo_disponible} lugar${seleccion.cupo_disponible !== 1 ? 'es' : ''} disponible${seleccion.cupo_disponible !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>

            {seleccion.cupo_disponible === 0 && (
              <div className={styles.alertaAmarilla}>
                📋 La clase está completa. Si la reservás, quedás en <strong>lista de espera</strong>.
                Los suscriptores de esta clase tienen prioridad sobre las reservas únicas.
              </div>
            )}

            <div className={styles.precioBlock}>
              <div className={`${styles.precioRow} ${styles.precioTotal}`}>
                <span>Total a pagar</span>
                <span>${seleccion.valor.toLocaleString('es-AR')}</span>
              </div>
            </div>

            <button className={styles.btnPrimary} onClick={() => setPaso(3)}>
              Continuar al pago →
            </button>
          </div>
        )}

        {/* ── PASO 3: Pago ─────────────────────────────── */}
        {paso === 3 && seleccion && (
          <div className={styles.body}>
            <div className={styles.totalDestacado}>
              Total: <strong>${seleccion.valor.toLocaleString('es-AR')}</strong>
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

        {/* ── PASO 4: Resultado ────────────────────────── */}
        {paso === 4 && resultado && (
          <div className={styles.body} style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            {resultado.estado === 'activa' ? (
              <>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                <h2 style={{ color: '#22c55e', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                  ¡Reserva confirmada!
                </h2>
                <p style={{ color: '#b0b3c7', marginBottom: '0.5rem' }}>
                  Reservaste <strong style={{ color: 'white' }}>{seleccion.clase_nombre}</strong>
                </p>
                <p style={{ color: '#a78bfa', marginBottom: '2rem' }}>
                  {fmtLargo(seleccion.fecha)} · {seleccion.horario}
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📋</div>
                <h2 style={{ color: '#f59e0b', fontSize: '1.3rem', marginBottom: '0.8rem', lineHeight: 1.3 }}>
                  {resultado.detail}
                </h2>
                <p style={{ color: '#b0b3c7', marginBottom: '0.5rem' }}>
                  Clase: <strong style={{ color: 'white' }}>{seleccion.clase_nombre}</strong>
                </p>
                <p style={{ color: '#a78bfa', marginBottom: '2rem' }}>
                  {fmtLargo(seleccion.fecha)} · {seleccion.horario}
                </p>
              </>
            )}
            <button className={styles.btnPrimary} onClick={onClose}>
              Volver al inicio
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
