import { useState, useEffect } from 'react'
import { getSalasRequest, createClaseRequest, getProfesoresPorEspecialidadRequest } from '../../api/clases'
import styles from './CrearClaseModal.module.css'

/* ══════════════════════════════════════════════════════════
   CONSTANTES
   ══════════════════════════════════════════════════════════ */
const ESPECIALIDADES = [
  { value: 'tren_superior', label: 'Tren Superior' },
  { value: 'tren_inferior', label: 'Tren Inferior' },
  { value: 'tren_medio',    label: 'Tren Medio' },
]

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const DIAS_MAP = {
  'dom':0,'domingo':0,'lun':1,'lunes':1,'mar':2,'martes':2,
  'mié':3,'mie':3,'miércoles':3,'miercoles':3,
  'jue':4,'jueves':4,'vie':5,'viernes':5,'sáb':6,'sab':6,'sábado':6,'sabado':6,
}

const FORM_INICIAL = {
  nombre: '', especialidad: '', tipo_clase: '',
  dia: '', fecha: '', horario_inicio: '', horario_fin: '',
  sala_id: '', cupo: '', valor: '',
  asignacion: '',   // 'manual' | 'ofertar' | ''
  profesor_id: '',
  descripcion: '',
}

/* ══════════════════════════════════════════════════════════
   HELPERS — disponibilidad de sala
   ══════════════════════════════════════════════════════════ */
function timesOverlap(ini1, fin1, ini2, fin2) {
  return ini1 < fin2 && ini2 < fin1
}

function parseDiaNombre(diasStr) {
  const key = (diasStr || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return DIAS_MAP[key] ?? DIAS_MAP[diasStr.trim().toLowerCase()] ?? -1
}

function salaOcupada(sala, tipo, dia, fecha, horIni, horFin) {
  if (!horIni || !horFin || (!dia && !fecha)) return false
  const diaNumNuevo = tipo === 'fija'
    ? parseDiaNombre(dia)
    : new Date(fecha + 'T00:00:00').getDay()   // 0=Dom

  // Convertir índice JS (0=Dom) a índice DIAS_SEMANA (0=Lun)
  const jsToIdx = (js) => (js === 0 ? 6 : js - 1)
  const idxNuevo = jsToIdx(diaNumNuevo)

  for (const c of sala.clases || []) {
    if (!timesOverlap(horIni, horFin, c.horario_inicio, c.horario_fin)) continue

    let idxExistente = -1
    if (c.tipo_clase === 'fija') {
      idxExistente = DIAS_SEMANA.indexOf(c.dias)
    } else if (c.fecha) {
      idxExistente = jsToIdx(new Date(c.fecha + 'T00:00:00').getDay())
    }

    if (tipo === 'fija' && idxExistente === idxNuevo) return true
    if (tipo === 'individual') {
      if (c.tipo_clase === 'fija' && idxExistente === idxNuevo) return true
      if (c.tipo_clase === 'individual' && c.fecha === fecha) return true
    }
  }
  return false
}

/* ══════════════════════════════════════════════════════════
   COMPONENTE
   ══════════════════════════════════════════════════════════ */
export default function CrearClaseModal({ onClose, onCreada }) {
  const [form,       setForm]       = useState(FORM_INICIAL)
  const [salas,      setSalas]      = useState([])
  const [profesores, setProfesores] = useState([])
  const [error,      setError]      = useState('')
  const [guardando,  setGuardando]  = useState(false)

  // Cargar salas al montar
  useEffect(() => {
    getSalasRequest().then(r => setSalas(r.data)).catch(() => setSalas([]))
  }, [])

  // Cargar profesores cuando cambia especialidad
  useEffect(() => {
    if (!form.especialidad) { setProfesores([]); return }
    getProfesoresPorEspecialidadRequest(form.especialidad)
      .then(r => setProfesores(r.data))
      .catch(() => setProfesores([]))
  }, [form.especialidad])

  // Cuando se selecciona sala → auto-completar cupo con capacidad
  useEffect(() => {
    const sala = salas.find(s => String(s.id) === String(form.sala_id))
    if (sala) setForm(f => ({ ...f, cupo: String(sala.capacidad) }))
  }, [form.sala_id, salas])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const salaSeleccionada = salas.find(s => String(s.id) === String(form.sala_id))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validaciones del lado del cliente
    const requeridos = [
      form.nombre, form.especialidad, form.tipo_clase,
      form.horario_inicio, form.horario_fin, form.sala_id,
      form.cupo, form.valor, form.asignacion,
    ]
    const tipoOk = form.tipo_clase === 'fija' ? !!form.dia : !!form.fecha

    if (requeridos.some(v => !v) || !tipoOk) {
      setError('Por favor, ingrese todos los campos obligatorios.')
      return
    }
    if (form.asignacion === 'manual' && !form.profesor_id) {
      setError('Por favor, ingrese todos los campos obligatorios.')
      return
    }
    if (salaSeleccionada && parseInt(form.cupo) > salaSeleccionada.capacidad) {
      setError(`El cupo no puede superar la capacidad de la sala (${salaSeleccionada.capacidad}).`)
      return
    }

    setGuardando(true)
    try {
      const payload = {
        nombre:         form.nombre,
        especialidad:   form.especialidad,
        tipo_clase:     form.tipo_clase,
        horario_inicio: form.horario_inicio,
        horario_fin:    form.horario_fin,
        sala:           parseInt(form.sala_id),
        cupo:           parseInt(form.cupo),
        valor:          parseFloat(form.valor),
        ofertada:       form.asignacion === 'ofertar',
        descripcion:    form.descripcion,
      }
      if (form.tipo_clase === 'fija')       payload.dias  = form.dia
      if (form.tipo_clase === 'individual') payload.fecha = form.fecha
      if (form.asignacion === 'manual' && form.profesor_id) payload.profesor = parseInt(form.profesor_id)

      await createClaseRequest(payload)
      onCreada()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Error al crear la clase.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Nueva clase</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>

          {/* ── Nombre ── */}
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Nombre de la clase *</label>
              <input className={styles.input} placeholder="Ej: Yoga Avanzado"
                value={form.nombre} onChange={e => set('nombre', e.target.value)} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Especialidad *</label>
              <select className={styles.select} value={form.especialidad}
                onChange={e => set('especialidad', e.target.value)}>
                <option value="">Seleccioná una especialidad</option>
                {ESPECIALIDADES.map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Tipo de clase ── */}
          <div className={styles.field}>
            <label className={styles.label}>Tipo de clase *</label>
            <div className={styles.tipoRow}>
              {['fija', 'individual'].map(t => (
                <button key={t} type="button"
                  className={`${styles.tipoBtn} ${form.tipo_clase === t ? styles.tipoBtnActive : ''}`}
                  onClick={() => set('tipo_clase', t)}>
                  {t === 'fija' ? '🔁 Clase fija (semanal)' : '📅 Clase individual (fecha única)'}
                </button>
              ))}
            </div>
            {form.tipo_clase === 'fija' && (
              <p className={styles.tipoHint}>Se repetirá todos los {form.dia || '...'} de cada semana indefinidamente.</p>
            )}
            {form.tipo_clase === 'individual' && (
              <p className={styles.tipoHint}>Se dictará una sola vez en la fecha indicada.</p>
            )}
          </div>

          {/* ── Día / Fecha ── */}
          {form.tipo_clase === 'fija' && (
            <div className={styles.field}>
              <label className={styles.label}>Día de la semana *</label>
              <div className={styles.diasRow}>
                {DIAS_SEMANA.map(d => (
                  <button key={d} type="button"
                    className={`${styles.diaBtn} ${form.dia === d ? styles.diaBtnActive : ''}`}
                    onClick={() => set('dia', d)}>
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {form.tipo_clase === 'individual' && (
            <div className={styles.field}>
              <label className={styles.label}>Fecha *</label>
              <input className={styles.input} type="date"
                value={form.fecha} onChange={e => set('fecha', e.target.value)} />
            </div>
          )}

          {/* ── Horario ── */}
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Horario inicio *</label>
              <input className={styles.input} type="time"
                value={form.horario_inicio} onChange={e => set('horario_inicio', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Horario fin *</label>
              <input className={styles.input} type="time"
                value={form.horario_fin} onChange={e => set('horario_fin', e.target.value)} />
            </div>
          </div>

          {/* ── Sala ── */}
          <div className={styles.field}>
            <label className={styles.label}>Sala *</label>
            {salas.length === 0 ? (
              <p className={styles.sinSalas}>No hay salas creadas. Primero creá una sala en la sección de Salas.</p>
            ) : (
              <div className={styles.salasGrid}>
                {salas.map(s => {
                  const ocupada = salaOcupada(s, form.tipo_clase, form.dia, form.fecha, form.horario_inicio, form.horario_fin)
                  const selec   = String(form.sala_id) === String(s.id)
                  return (
                    <button key={s.id} type="button"
                      className={[
                        styles.salaOpcion,
                        selec   ? styles.salaSelec   : '',
                        ocupada ? styles.salaOcupada : '',
                      ].join(' ')}
                      onClick={() => !ocupada && set('sala_id', String(s.id))}
                      disabled={ocupada}>
                      <span className={styles.salaNombreOpc}>{s.nombre}</span>
                      <span className={styles.salaCapOpc}>Cap. {s.capacidad}</span>
                      {ocupada && <span className={styles.ocupadaTag}>Sala ocupada</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Cupo y Valor ── */}
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>
                Cupo máximo *
                {salaSeleccionada && <span className={styles.labelHint}> (máx. {salaSeleccionada.capacidad})</span>}
              </label>
              <input className={styles.input} type="number" min="1"
                max={salaSeleccionada?.capacidad || undefined}
                placeholder={salaSeleccionada ? String(salaSeleccionada.capacidad) : 'Seleccioná una sala primero'}
                value={form.cupo} onChange={e => set('cupo', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Valor de la clase ($) *</label>
              <input className={styles.input} type="number" min="0" step="0.01" placeholder="0.00"
                value={form.valor} onChange={e => set('valor', e.target.value)} />
            </div>
          </div>

          {/* ── Asignación de profesor ── */}
          <div className={styles.field}>
            <label className={styles.label}>Asignación de profesor *</label>
            <div className={styles.tipoRow}>
              {[
                { v: 'manual',  l: '👤 Designar manualmente' },
                { v: 'ofertar', l: '📢 Ofertar a profesores' },
              ].map(({ v, l }) => (
                <button key={v} type="button"
                  className={`${styles.tipoBtn} ${form.asignacion === v ? styles.tipoBtnActive : ''}`}
                  onClick={() => set('asignacion', v)}>
                  {l}
                </button>
              ))}
            </div>
            {form.asignacion === 'ofertar' && (
              <p className={styles.tipoHint}>La clase aparecerá en la sección "Asignarse a una clase" del panel del profesor.</p>
            )}
            {form.asignacion === 'manual' && (
              <div className={styles.field} style={{ marginTop: '0.75rem' }}>
                <label className={styles.label}>Seleccioná el profesor</label>
                {!form.especialidad ? (
                  <p className={styles.sinSalas}>Primero seleccioná la especialidad para ver los profesores disponibles.</p>
                ) : profesores.length === 0 ? (
                  <p className={styles.sinSalas}>No hay profesores con la especialidad "{ESPECIALIDADES.find(e => e.value === form.especialidad)?.label}" registrados.</p>
                ) : (
                  <select className={styles.select} value={form.profesor_id}
                    onChange={e => set('profesor_id', e.target.value)}>
                    <option value="">Seleccioná un profesor</option>
                    {profesores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* ── Descripción (opcional) ── */}
          <div className={styles.field}>
            <label className={styles.label}>Descripción <span className={styles.opcional}>(opcional)</span></label>
            <textarea className={styles.textarea} rows={3}
              placeholder="Actividades, objetivos, materiales necesarios..."
              value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </div>

          {/* ── Error ── */}
          {error && <p className={styles.error}>{error}</p>}

          {/* ── Submit ── */}
          <div className={styles.footer}>
            <button type="button" className={styles.btnCancelar} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.btnCrear} disabled={guardando}>
              {guardando ? 'Creando...' : 'Crear clase'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
