import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClasesPublicasRequest } from '../../api/clases'
import styles from './CalendarioPublico.module.css'

/* ══════════════════════════════════════════════════════════
   FERIADOS NACIONALES 2026
   ══════════════════════════════════════════════════════════ */
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
const MESES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
                 'Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_S = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

// Mapeo de abreviaturas/nombres en español → getDay() (0=Dom, 1=Lun, …)
const DIAS_MAP = {
  'dom': 0, 'domingo': 0,
  'lun': 1, 'lunes': 1,
  'mar': 2, 'martes': 2,
  'mié': 3, 'mie': 3, 'miércoles': 3, 'miercoles': 3,
  'jue': 4, 'jueves': 4,
  'vie': 5, 'viernes': 5,
  'sáb': 6, 'sab': 6, 'sábado': 6, 'sabado': 6,
}

/** Convierte el campo `dias` de una clase ("Lun / Mié / Vie") en un Set de números */
function parseDias(diasStr) {
  const set = new Set()
  diasStr.split(/[/,]+/).forEach(p => {
    const key = p.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    // normalizar: quita acentos para buscar en el mapa sin tildes también
    const keyOrig = p.trim().toLowerCase()
    const num = DIAS_MAP[keyOrig] ?? DIAS_MAP[key]
    if (num !== undefined) set.add(num)
  })
  return set
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function getTodayStr() {
  const t = new Date()
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate())
}

/* ══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════ */
export default function CalendarioPublico({ onClose }) {
  const navigate = useNavigate()

  const [clases,   setClases]   = useState([])
  const [cargando, setCargando] = useState(true)

  const today = new Date()
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  // Modal al clickear un día con clases
  const [diaModal,   setDiaModal]   = useState(null)   // 'YYYY-MM-DD'
  // Modal CTA (registrate / iniciá sesión)
  const [ctaModal,   setCtaModal]   = useState(null)   // clase clickeada

  useEffect(() => {
    getClasesPublicasRequest()
      .then(res => setClases(res.data))
      .catch(() => setClases([]))
      .finally(() => setCargando(false))
  }, [])

  const year = month.getFullYear()
  const mes  = month.getMonth()

  const prevMes = () => setMonth(new Date(year, mes - 1, 1))
  const nextMes = () => setMonth(new Date(year, mes + 1, 1))

  const primerDia = new Date(year, mes, 1).getDay()
  const diasEnMes = new Date(year, mes + 1, 0).getDate()
  const todayStr  = getTodayStr()

  // Para cada clase, precomputar el Set de días de la semana solo para clases fijas.
  // Las clases individuales se muestran únicamente en su fecha exacta.
  const clasesConDias = clases.map(c => ({
    ...c,
    diasSet: c.tipo_clase === 'fija' ? parseDias(c.dias || '') : new Set(),
  }))

  // Dado un día del mes, retorna las clases que se dictan ese día.
  function clasesDelDia(dia) {
    const fechaDia = toDateStr(year, mes, dia)
    const dowDia = new Date(year, mes, dia).getDay()

    return clasesConDias.filter(c => {
      if (c.tipo_clase === 'individual') {
        return c.fecha === fechaDia
      }
      return c.diasSet.has(dowDia)
    })
  }

  const celdas = [
    ...Array(primerDia).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ]

  const clasesSeleccionadas = diaModal ? clasesDelDia(parseInt(diaModal.split('-')[2])) : []
  const feriadoSeleccionado = diaModal ? FERIADOS[diaModal] : null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>

        {/* ── Encabezado ── */}
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Clases disponibles</h2>
            <p className={styles.panelSubtitle}>Explorá nuestra oferta de clases</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── Leyenda ── */}
        <div className={styles.leyenda}>
          <span className={styles.leyendaItem}><span className={styles.dotFeriado} /> Feriado</span>
          <span className={styles.leyendaItem}><span className={styles.dotClase}   /> Hay clases</span>
          <span className={styles.leyendaItem}><span className={styles.dotHoy}     /> Hoy</span>
        </div>

        {cargando ? (
          <p className={styles.cargando}>Cargando clases...</p>
        ) : (
          <>
            {/* ── Calendario ── */}
            <div className={styles.calHeader}>
              <button className={styles.calNav} onClick={prevMes}>‹</button>
              <span className={styles.calTitle}>{MESES[mes]} {year}</span>
              <button className={styles.calNav} onClick={nextMes}>›</button>
            </div>

            <div className={styles.calGrid}>
              {DIAS_S.map(d => (
                <div key={d} className={styles.calDayName}>{d}</div>
              ))}

              {celdas.map((dia, i) => {
                if (!dia) return <div key={`e-${i}`} />

                const ds          = toDateStr(year, mes, dia)
                const esFeriado   = !!FERIADOS[ds]
                const clasesHoy   = clasesDelDia(dia)
                const tieneClases = clasesHoy.length > 0
                const esHoy       = ds === todayStr

                return (
                  <button
                    key={ds}
                    className={[
                      styles.calCell,
                      esFeriado   ? styles.cellFeriado   : '',
                      tieneClases ? styles.cellClase     : '',
                      esHoy       ? styles.cellHoy       : '',
                    ].join(' ')}
                    onClick={() => (esFeriado || tieneClases) && setDiaModal(ds)}
                  >
                    {dia}
                    {tieneClases && !esFeriado && (
                      <span className={styles.claseCount}>{clasesHoy.length}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* ── Panel detalle día ── */}
            {diaModal && (
              <div className={styles.diaPanel}>
                <div className={styles.diaPanelHeader}>
                  <h3 className={styles.diaPanelTitle}>
                    {new Date(year, mes, parseInt(diaModal.split('-')[2]))
                      .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <button className={styles.closeDiaBtn} onClick={() => setDiaModal(null)}>✕</button>
                </div>

                {feriadoSeleccionado && (
                  <p className={styles.feriadoTag}>🇦🇷 Feriado nacional — {feriadoSeleccionado}</p>
                )}

                {clasesSeleccionadas.length === 0 ? (
                  <p className={styles.sinClases}>No hay clases este día.</p>
                ) : (
                  <div className={styles.clasesDelDia}>
                    {clasesSeleccionadas.map(c => (
                      <button
                        key={c.id}
                        className={styles.claseCard}
                        onClick={() => setCtaModal(c)}
                      >
                        <div className={styles.claseCardLeft}>
                          <p className={styles.claseCardNombre}>{c.tipo}</p>
                          <p className={styles.claseCardMeta}>
                            {c.horario} · {c.aula}
                          </p>
                          {c.profesor_nombre && (
                            <p className={styles.claseCardProf}>👤 {c.profesor_nombre}</p>
                          )}
                        </div>
                        <div className={styles.claseCardRight}>
                          <span className={`${styles.cupoTag} ${c.cantidad_inscriptos >= c.cupo ? styles.cupoLleno : ''}`}>
                            {c.cantidad_inscriptos}/{c.cupo}
                          </span>
                          <span className={styles.verBtn}>Ver →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal CTA: Registrate o iniciá sesión ── */}
      {ctaModal && (
        <div className={styles.ctaOverlay} onClick={() => setCtaModal(null)}>
          <div className={styles.ctaModal} onClick={e => e.stopPropagation()}>
            <button className={styles.ctaClose} onClick={() => setCtaModal(null)}>✕</button>

            <div className={styles.ctaIcon}>🏋️</div>

            <h3 className={styles.ctaTitle}>
              ¡Registrate ya o iniciá sesión para poder asistir a esta clase!
            </h3>

            <div className={styles.ctaClaseInfo}>
              <p className={styles.ctaClaseNombre}>{ctaModal.tipo}</p>
              <p className={styles.ctaClaseMeta}>{ctaModal.dias} · {ctaModal.horario} · {ctaModal.aula}</p>
            </div>

            <div className={styles.ctaBtns}>
              <button
                className={styles.ctaBtnPrimary}
                onClick={() => navigate('/register')}
              >
                Registrarme
              </button>
              <button
                className={styles.ctaBtnSecondary}
                onClick={() => {
                  window.location.href = '/login';
                  navigate('/login')}
                }
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
