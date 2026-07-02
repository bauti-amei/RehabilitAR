import { useState, useEffect, useMemo } from 'react'
import { getClasesParaCanjearRequest, canjearCreditoRequest } from '../../api/clases'
import styles from './ReservarClaseModal.module.css'

const MESES_ES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_CAL = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function fmtLargo(fecha) {
  const [y, m, d] = fecha.split('-')
  return new Date(+y, +m - 1, +d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CanjearCreditoModal({ credito, onClose, onCanjeOk }) {
  const hoyDate = new Date()
  const [mes,  setMes]  = useState(hoyDate.getMonth() + 1)
  const [anio, setAnio] = useState(hoyDate.getFullYear())

  const primerDia = new Date(anio, mes - 1, 1).getDay()
  const diasEnMes = new Date(anio, mes, 0).getDate()
  const todayStr  = `${hoyDate.getFullYear()}-${String(hoyDate.getMonth() + 1).padStart(2,'0')}-${String(hoyDate.getDate()).padStart(2,'0')}`
  const celdas    = [...Array(primerDia).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)]

  const [paso,       setPaso]       = useState(1)   // 1=calendario, 2=confirmar, 3=resultado
  const [cargando,   setCargando]   = useState(true)
  const [opciones,   setOpciones]   = useState([])
  const [seleccion,  setSeleccion]  = useState(null)
  const [canjeando,  setCanjeando]  = useState(false)
  const [resultado,  setResultado]  = useState(null)
  const [error,      setError]      = useState('')

  const esMesActual = anio === hoyDate.getFullYear() && mes === hoyDate.getMonth() + 1

  const prevMes = () => {
    if (esMesActual) return
    if (mes === 1) { setMes(12); setAnio(a => a - 1) }
    else setMes(m => m - 1)
  }
  const nextMes = () => {
    if (mes === 12) { setMes(1); setAnio(a => a + 1) }
    else setMes(m => m + 1)
  }

  useEffect(() => {
    setCargando(true)
    setError('')
    getClasesParaCanjearRequest(credito.tipo_clase, mes, anio)
      .then(r => setOpciones(r.data.opciones))
      .catch(() => setError('No se pudieron cargar las clases.'))
      .finally(() => setCargando(false))
  }, [mes, anio, credito.tipo_clase])

  const opcionesPorFecha = useMemo(() => {
    const map = {}
    opciones.forEach(op => {
      if (!map[op.fecha]) map[op.fecha] = []
      map[op.fecha].push(op)
    })
    return map
  }, [opciones])

  const seleccionarClase = (op) => {
    setSeleccion(op)
    setError('')
    setPaso(2)
  }

  const handleCanjear = async () => {
    setCanjeando(true)
    setError('')
    try {
      const r = await canjearCreditoRequest({
        credito_id: credito.id,
        clase_id:   seleccion.clase_id,
        fecha:      seleccion.fecha,
      })
      setResultado(r.data)
      setPaso(3)
      onCanjeOk?.()
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al canjear el crédito.')
    } finally {
      setCanjeando(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {paso === 2 && (
              <button className={styles.backBtn} onClick={() => { setPaso(1); setError('') }}>← Volver</button>
            )}
            <h2 className={styles.title}>
              {paso === 1 && `Canjear crédito — ${credito.tipo_clase_display}`}
              {paso === 2 && 'Confirmar canje'}
              {paso === 3 && (resultado?.estado === 'lista_espera' ? '📋 Lista de espera' : '✅ ¡Canje exitoso!')}
            </h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Progreso */}
        {paso < 3 && (
          <div className={styles.progress}>
            {[1, 2].map(n => (
              <div key={n} className={`${styles.progressStep} ${paso >= n ? styles.progressActive : ''}`} />
            ))}
          </div>
        )}

        {/* ── PASO 1: Calendario ───────────────────────── */}
        {paso === 1 && (
          <div className={styles.body} style={{ padding: '1rem 1.4rem 1.4rem' }}>
            <p className={styles.subtitle}>
              Tocá una clase de <strong>{credito.tipo_clase_display}</strong> para canjear tu crédito.
            </p>

            {/* Nav mes — bloqueado, solo mes actual */}
            <div className={styles.calNav}>
              <span className={styles.calNavTitle}>{MESES_ES[mes]} {anio}</span>
            </div>

            {cargando ? (
              <p className={styles.loading}>Cargando clases disponibles...</p>
            ) : (
              <>
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
                      <div key={ds} className={`${styles.calCell} ${esHoy ? styles.calCellHoy : ''} ${pasado ? styles.calCellPasado : ''}`}>
                        <span className={styles.calNum}>{dia}</span>
                        {clases.map(op => (
                          <button
                            key={`${op.clase_id}-${op.fecha}`}
                            className={`${styles.calClaseBtn} ${op.cupo_disponible === 0 ? styles.calClaseLlena : ''}`}
                            onClick={() => !pasado && seleccionarClase(op)}
                            disabled={pasado}
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
                  <p className={styles.empty}>No hay clases de {credito.tipo_clase_display} disponibles este mes.</p>
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

        {/* ── PASO 2: Confirmar ────────────────────────── */}
        {paso === 2 && seleccion && (
          <div className={styles.body}>
            <div className={styles.infoCard}>
              <h3 className={styles.infoTitle}>{seleccion.clase_nombre}</h3>
              <div className={styles.infoGrid}>
                <span>Fecha</span>       <span>{fmtLargo(seleccion.fecha)}</span>
                <span>Horario</span>     <span>{seleccion.horario}</span>
                <span>Aula</span>        <span>{seleccion.aula || '—'}</span>
                <span>Profesor</span>    <span>{seleccion.profesor_nombre || 'Sin asignar'}</span>
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
                📋 La clase está completa. Si canjeás el crédito, quedás en <strong>lista de espera</strong>.
              </div>
            )}

            {/* Info crédito */}
            <div style={{
              background: 'rgba(26,157,133,0.08)', border: '1px solid rgba(26,157,133,0.2)',
              borderRadius: '10px', padding: '0.85rem 1rem', margin: '0.75rem 0'
            }}>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#1a6b55', fontWeight: 600 }}>
                🎟️ Se utilizará tu crédito de <strong>{credito.tipo_clase_display}</strong>.
                Esta acción no tiene costo adicional.
              </p>
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className={styles.btnPrimary}
                style={{ flex: 1, background: 'rgba(30,153,136,0.12)', color: '#1a9d85', border: '1.5px solid rgba(30,153,136,0.3)' }}
                onClick={() => { setPaso(1); setError('') }}
                disabled={canjeando}
              >
                Elegir otra
              </button>
              <button
                className={styles.btnPrimary}
                style={{ flex: 2 }}
                onClick={handleCanjear}
                disabled={canjeando}
              >
                {canjeando ? 'Canjeando...' : '🎟️ Confirmar canje'}
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 3: Resultado ────────────────────────── */}
        {paso === 3 && resultado && (
          <div className={styles.body} style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
            {resultado.estado === 'activa' ? (
              <>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
                <h2 style={{ color: '#22c55e', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                  ¡Crédito canjeado!
                </h2>
                <p style={{ color: '#3d6b55', marginBottom: '0.5rem' }}>
                  Reservaste <strong style={{ color: '#0f1f17' }}>{resultado.clase_nombre}</strong>
                </p>
                <p style={{ color: '#52b788', marginBottom: '1.5rem' }}>
                  {fmtLargo(resultado.fecha)}
                </p>
                <p style={{ color: '#1a9d85', fontSize: '0.85rem', background: 'rgba(26,157,133,0.08)', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '1.5rem' }}>
                  🎟️ Tu crédito de <strong>{credito.tipo_clase_display}</strong> fue utilizado. Tu lugar está confirmado.
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📋</div>
                <h2 style={{ color: '#f59e0b', fontSize: '1.3rem', marginBottom: '0.5rem' }}>
                  En lista de espera
                </h2>
                <p style={{ color: '#3d6b55', marginBottom: '0.5rem' }}>
                  Clase: <strong style={{ color: '#0f1f17' }}>{resultado.clase_nombre}</strong>
                </p>
                <p style={{ color: '#52b788', marginBottom: '1rem' }}>
                  {fmtLargo(resultado.fecha)}
                </p>
                <p style={{ color: '#b45309', fontSize: '0.85rem', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '1.5rem' }}>
                  🎟️ Tu crédito fue utilizado. Te notificaremos si se libera un lugar.
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
