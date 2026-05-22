import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getUsersRequest } from '../../api/auth'
import { getClasesRequest, getClasesEnCursoRequest, getSalasRequest, createSalaRequest, getProfesoresPorEspecialidadRequest, asignarProfesorRequest } from '../../api/clases'
import CrearClaseModal from '../../components/admin/CrearClaseModal'
import styles from './Dashboard.module.css'

/* ══════════════════════════════════════════════════════════
   MOCK DATA
   ══════════════════════════════════════════════════════════ */

// [] = "Estás al día con todas tus tareas"
const TAREAS = []


const ROLE_LABEL = {
  admin: 'Administrador', teacher: 'Profesor',
  receptionist: 'Recepcionista', client: 'Cliente',
}

const FILTROS_HORARIO = [
  { label: 'Todas',  value: 'todas' },
  { label: 'Mañana', value: 'manana' },
  { label: 'Tarde',  value: 'tarde' },
  { label: 'Noche',  value: 'noche' },
]

const FILTROS_ROL = [
  { label: 'Todos',           value: 'todos' },
  { label: 'Profesores',      value: 'teacher' },
  { label: 'Recepcionistas',  value: 'receptionist' },
  { label: 'Administrativos', value: 'admin' },
  { label: 'Clientes',        value: 'client' },
]

const STATS_BTNS = [
  'Ingresos', 'Clase más elegida', 'Usuarios suspendidos', 'Horario más elegido', 'Exportar estadísticas',
]

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════ */
function getHorarioFiltro(horario) {
  const hora = parseInt(horario.split(':')[0])
  if (hora < 12) return 'manana'
  if (hora < 18) return 'tarde'
  return 'noche'
}

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
   SECCIÓN: TAREAS IMPORTANTES
   ══════════════════════════════════════════════════════════ */
function TareasImportantes() {
  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Tareas importantes</h2>
      {TAREAS.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>✅</span>
          <p>Estás al día con todas tus tareas</p>
        </div>
      ) : (
        <div className={styles.tareasList}>
          {TAREAS.map((t, i) => (
            <div key={i} className={styles.tareaItem}>
              <span className={styles.tareaTexto}>{t.texto}</span>
              <button className={styles.verMasBtn}>Ver más</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   SECCIÓN: CLASES EN CURSO
   ══════════════════════════════════════════════════════════ */
function ClasesEnCurso() {
  const [clases,   setClases]   = useState([])
  const [cargando, setCargando] = useState(true)
  const [detalle,  setDetalle]  = useState(null)

  useEffect(() => {
    getClasesEnCursoRequest()
      .then(res => setClases(res.data))
      .catch(() => setClases([]))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Clases en curso</h2>
      {cargando ? (
        <p className={styles.noResultados}>Cargando...</p>
      ) : clases.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🏫</span>
          <p>No hay clases en este momento</p>
        </div>
      ) : (
        <div className={styles.cursoList}>
          {clases.map(c => (
            <div key={c.id} className={styles.cursoItem}>
              <div className={styles.cursoInfo}>
                <span className={styles.cursoNombre}>{c.nombre}</span>
                <span className={styles.cursoDato}>{c.aula} · {c.horario}</span>
              </div>
              <button className={styles.verMasBtn} onClick={() => setDetalle(c)}>Ver más</button>
            </div>
          ))}
        </div>
      )}

      {detalle && (
        <Modal title={detalle.nombre} onClose={() => setDetalle(null)}>
          <div className={styles.detalleGrid}>
            <span>Aula</span>       <span>{detalle.aula}</span>
            <span>Horario</span>    <span>{detalle.horario}</span>
            <span>Profesor</span>   <span>{detalle.profesor_nombre || 'Sin asignar'}</span>
            <span>Inscriptos</span> <span>{detalle.cantidad_inscriptos}/{detalle.cupo}</span>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   SECCIÓN: ÁREA DE CLASES
   ══════════════════════════════════════════════════════════ */
function AreaClases() {
  const [clases,          setClases]    = useState([])
  const [cargando,        setCargando]  = useState(true)
  const [filtro,          setFiltro]    = useState('todas')
  const [listaEsperaModal, setLista]   = useState(null)
  const [userModal,       setUserModal] = useState(null)
  const [crearClase,      setCrear]    = useState(false)
  const [asignarModal,    setAsignar]  = useState(null)   // clase a la que se asigna profesor
  const [profesores,      setProfesores] = useState([])
  const [profesorSel,     setProfesorSel] = useState('')
  const [asignando,       setAsignando] = useState(false)
  const [asignarError,    setAsignarError] = useState('')

  const cargarClases = () => {
    getClasesRequest()
      .then(res => setClases(res.data))
      .catch(() => setClases([]))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargarClases() }, [])

  const abrirAsignar = (clase) => {
    setAsignar(clase)
    setProfesorSel('')
    setAsignarError('')
    setProfesores([])
    getProfesoresPorEspecialidadRequest(clase.especialidad)
      .then(r => setProfesores(r.data))
      .catch(() => setProfesores([]))
  }

  const handleAsignarProfesor = async () => {
    if (!profesorSel) { setAsignarError('Seleccioná un profesor.'); return }
    setAsignando(true)
    setAsignarError('')
    try {
      await asignarProfesorRequest(asignarModal.id, parseInt(profesorSel))
      setAsignar(null)
      cargarClases()
    } catch (err) {
      setAsignarError(err.response?.data?.detail ?? 'Error al asignar el profesor.')
    } finally {
      setAsignando(false)
    }
  }

  const clasesFiltradas = clases.filter(c =>
    filtro === 'todas' ? true : getHorarioFiltro(c.horario) === filtro
  )

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Clases</h2>
        <button className={styles.btnPrimary} onClick={() => setCrear(true)}>+ Crear nueva clase</button>
      </div>

      {/* Filtros */}
      <div className={styles.filtros}>
        {FILTROS_HORARIO.map(f => (
          <button
            key={f.value}
            className={`${styles.filtroBtn} ${filtro === f.value ? styles.filtroBtnActive : ''}`}
            onClick={() => setFiltro(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de clases */}
      <div className={styles.clasesList}>
        {cargando ? (
          <p className={styles.noResultados}>Cargando clases...</p>
        ) : clasesFiltradas.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📋</span>
            <p>{clases.length === 0 ? 'No hay clases creadas aún' : 'No hay clases para este filtro'}</p>
          </div>
        ) : clasesFiltradas.map(c => (
          <div key={c.id} className={styles.claseRow}>
            <div className={styles.claseMain}>
              <div>
                <p className={styles.claseNombre}>{c.nombre}</p>
                <p className={styles.claseMeta}>{c.especialidad_display} · {c.dias} · {c.horario} · {c.aula}</p>
              </div>
              <div className={styles.claseProfesor}>
                {c.profesor_nombre ? (
                  <span className={styles.profesorNombre}>👤 {c.profesor_nombre}</span>
                ) : (
                  <div className={styles.sinProfesor}>
                    <span className={styles.sinAsignar}>SIN ASIGNAR</span>
                    <button className={styles.asignarBtn} onClick={() => abrirAsignar(c)}>Asignar profesor</button>
                  </div>
                )}
              </div>
              <div className={styles.claseCupo}>
                <span className={`${styles.cupoTag} ${c.cantidad_inscriptos >= c.cupo ? styles.cupoLleno : ''}`}>
                  {c.cantidad_inscriptos}/{c.cupo} inscriptos
                </span>
              </div>
            </div>
            <div className={styles.claseAcciones}>
              <button
                className={styles.listaEsperaBtn}
                onClick={() => setLista(c)}
              >
                Ver lista de espera
                {c.lista_espera.length > 0 && (
                  <span className={styles.listaCount}>{c.lista_espera.length}</span>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal lista de espera */}
      {listaEsperaModal && (
        <Modal
          title={`Lista de espera — ${listaEsperaModal.nombre}`}
          onClose={() => { setLista(null); setUserModal(null) }}
          wide
        >
          {listaEsperaModal.lista_espera.length === 0 ? (
            <p className={styles.emptyMsg}>No hay usuarios en lista de espera.</p>
          ) : (
            <div className={styles.listaEsperaList}>
              {listaEsperaModal.lista_espera.map(u => (
                <div key={u.id} className={styles.listaEsperaItem}>
                  <div>
                    <p className={styles.listaUserNombre}>{u.nombre}</p>
                    <p className={styles.listaUserEmail}>{u.email}</p>
                  </div>
                  <button className={styles.verMasBtn} onClick={() => setUserModal(u)}>Ver más</button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Modal detalle usuario lista de espera */}
      {userModal && (
        <Modal title={userModal.nombre} onClose={() => setUserModal(null)}>
          <div className={styles.detalleGrid}>
            <span>Email</span>    <span>{userModal.email}</span>
            <span>Teléfono</span> <span>{userModal.telefono || '—'}</span>
          </div>
        </Modal>
      )}

      {/* Modal asignar profesor */}
      {asignarModal && (
        <Modal
          title={`Asignar profesor — ${asignarModal.nombre}`}
          onClose={() => setAsignar(null)}
        >
          <div className={styles.asignarProfesorForm}>
            <p className={styles.asignarHint}>
              Especialidad requerida: <strong>{asignarModal.especialidad_display}</strong>
            </p>
            {profesores.length === 0 ? (
              <p className={styles.emptyMsg}>
                No hay profesores con la especialidad <em>{asignarModal.especialidad_display}</em> registrados.
              </p>
            ) : (
              <select
                className={styles.formInput}
                value={profesorSel}
                onChange={e => setProfesorSel(e.target.value)}
              >
                <option value="">Seleccioná un profesor</option>
                {profesores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            )}
            {asignarError && <p className={styles.formError}>{asignarError}</p>}
            <div className={styles.modalFooter}>
              <button className={styles.btnOutline} onClick={() => setAsignar(null)}>Cancelar</button>
              <button
                className={styles.btnPrimary}
                onClick={handleAsignarProfesor}
                disabled={asignando || profesores.length === 0}
              >
                {asignando ? 'Guardando...' : 'Confirmar asignación'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal crear clase */}
      {crearClase && (
        <CrearClaseModal
          onClose={() => setCrear(false)}
          onCreada={cargarClases}
        />
      )}
    </section>
  )
}

/* ══════════════════════════════════════════════════════════
   SECCIÓN: ESTADÍSTICAS
   ══════════════════════════════════════════════════════════ */
function Estadisticas() {
  const [activeStat, setActiveStat] = useState(null)

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Estadísticas</h2>
      <div className={styles.statsBtns}>
        {STATS_BTNS.map(s => (
          <button
            key={s}
            className={`${styles.statBtn} ${activeStat === s ? styles.statBtnActive : ''}`}
            onClick={() => setActiveStat(s === activeStat ? null : s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className={styles.statsPanel}>
        <p className={styles.emptyMsg}>
          {activeStat
            ? `Estadística "${activeStat}" — próximamente disponible`
            : 'Seleccioná una estadística para visualizar'}
        </p>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════
   SECCIÓN: USUARIOS
   ══════════════════════════════════════════════════════════ */
function Usuarios() {
  const [usuarios, setUsuarios]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [userModal, setUserModal] = useState(null)

  useEffect(() => {
    getUsersRequest()
      .then(res => setUsuarios(res.data))
      .catch(() => setUsuarios([]))
      .finally(() => setCargando(false))
  }, [])

  const usuariosFiltrados = usuarios.filter(u => {
    const matchRol = filtroRol === 'todos' || u.role === filtroRol
    const matchBusq = u.email.toLowerCase().includes(busqueda.toLowerCase())
    return matchRol && matchBusq
  })

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Usuarios</h2>

      {/* Buscador */}
      <input
        className={styles.buscador}
        type="email"
        placeholder="Buscar usuario por mail..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
      />

      {/* Filtros por rol */}
      <div className={styles.filtros}>
        {FILTROS_ROL.map(f => (
          <button
            key={f.value}
            className={`${styles.filtroBtn} ${filtroRol === f.value ? styles.filtroBtnActive : ''}`}
            onClick={() => setFiltroRol(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de usuarios */}
      <div className={styles.usuariosList}>
        {cargando ? (
          <p className={styles.noResultados}>Cargando usuarios...</p>
        ) : usuariosFiltrados.length === 0 ? (
          <p className={styles.noResultados}>No se encontraron usuarios.</p>
        ) : usuariosFiltrados.map(u => (
          <div key={u.id} className={styles.usuarioRow}>
            <div className={styles.usuarioAvatar}>
              {u.first_name[0]}{u.last_name[0]}
            </div>
            <div className={styles.usuarioInfo}>
              <p className={styles.usuarioNombre}>{u.first_name} {u.last_name}</p>
              <p className={styles.usuarioEmail}>{u.email}</p>
            </div>
            <span className={styles.rolBadge}>{ROLE_LABEL[u.role]}</span>
            <span className={`${styles.estadoBadge} ${u.is_active ? styles.estadoActivo : styles.estadoSuspendido}`}>
              {u.is_active ? 'Activo' : 'Suspendido'}
            </span>
            <button className={styles.verMasBtn} onClick={() => setUserModal(u)}>Ver más</button>
          </div>
        ))}
      </div>

      <button className={styles.btnOutline} style={{ marginTop: '1rem' }}>
        + Crear nuevo usuario
      </button>

      {/* Modal detalle usuario */}
      {userModal && (
        <Modal title={`${userModal.first_name} ${userModal.last_name}`} onClose={() => setUserModal(null)}>
          <div className={styles.detalleGrid}>
            <span>Email</span>      <span>{userModal.email}</span>
            <span>Rol</span>        <span>{ROLE_LABEL[userModal.role]}</span>
            <span>Teléfono</span>   <span>{userModal.phone || '—'}</span>
            <span>Nacimiento</span> <span>{userModal.birth_date || '—'}</span>
            <span>Estado</span>
            <span className={userModal.is_active ? styles.estadoActivo : styles.estadoSuspendido}>
              {userModal.is_active ? 'Activo' : 'Suspendido'}
            </span>
          </div>
        </Modal>
      )}
    </section>
  )
}

/* ══════════════════════════════════════════════════════════
   HELPERS CALENDARIO SALAS
   ══════════════════════════════════════════════════════════ */
const MESES_CAL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_CAL   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const DIAS_MAP   = { 'dom':0,'domingo':0,'lun':1,'lunes':1,'mar':2,'martes':2,'mié':3,'mie':3,'miércoles':3,'miercoles':3,'jue':4,'jueves':4,'vie':5,'viernes':5,'sáb':6,'sab':6,'sábado':6,'sabado':6 }

function parseDiasSala(diasStr) {
  const set = new Set()
  ;(diasStr || '').split(/[/,]+/).forEach(p => {
    const key = p.trim().toLowerCase()
    const num = DIAS_MAP[key] ?? DIAS_MAP[key.normalize('NFD').replace(/[̀-ͯ]/g, '')]
    if (num !== undefined) set.add(num)
  })
  return set
}

function toDs(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

/* ── Calendario de una sala ─────────────────────────────── */
function CalendarioSala({ sala }) {
  const hoy      = new Date()
  const [month, setMonth] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
  const [diaSelec, setDia] = useState(null)

  const year = month.getFullYear()
  const mes  = month.getMonth()
  const todayStr = toDs(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

  const clasesConDias = (sala.clases || []).map(c => ({ ...c, diasSet: parseDiasSala(c.dias) }))

  function clasesDelDia(dia) {
    const dow = new Date(year, mes, dia).getDay()
    return clasesConDias.filter(c => c.diasSet.has(dow))
  }

  const primerDia = new Date(year, mes, 1).getDay()
  const diasEnMes = new Date(year, mes + 1, 0).getDate()
  const celdas    = [...Array(primerDia).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)]

  const clasesSelec = diaSelec ? clasesDelDia(parseInt(diaSelec.split('-')[2])) : []

  return (
    <div className={styles.calSala}>
      <div className={styles.calSalaNav}>
        <button className={styles.calNavBtn} onClick={() => setMonth(new Date(year, mes-1, 1))}>‹</button>
        <span className={styles.calSalaMes}>{MESES_CAL[mes]} {year}</span>
        <button className={styles.calNavBtn} onClick={() => setMonth(new Date(year, mes+1, 1))}>›</button>
      </div>

      <div className={styles.calSalaGrid}>
        {DIAS_CAL.map(d => <div key={d} className={styles.calSalaDayName}>{d}</div>)}
        {celdas.map((dia, i) => {
          if (!dia) return <div key={`e-${i}`} />
          const ds         = toDs(year, mes, dia)
          const clasesHoy  = clasesDelDia(dia)
          const tieneClass = clasesHoy.length > 0
          const esHoy      = ds === todayStr
          return (
            <button
              key={ds}
              className={[
                styles.calSalaCell,
                tieneClass ? styles.calCellClase : '',
                esHoy      ? styles.calCellHoy   : '',
                diaSelec === ds ? styles.calCellSelected : '',
              ].join(' ')}
              onClick={() => tieneClass && setDia(diaSelec === ds ? null : ds)}
            >
              {dia}
              {tieneClass && <span className={styles.calDot} />}
            </button>
          )
        })}
      </div>

      {/* Panel clases del día seleccionado */}
      {diaSelec && clasesSelec.length > 0 && (
        <div className={styles.calDiaPanel}>
          <p className={styles.calDiaTitulo}>
            {new Date(year, mes, parseInt(diaSelec.split('-')[2]))
              .toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })}
          </p>
          {clasesSelec.map(c => (
            <div key={c.id} className={styles.calClaseItem}>
              <span className={styles.calClaseNombre}>{c.nombre}</span>
              <span className={styles.calClaseHorario}>{c.horario}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   SECCIÓN: SALAS
   ══════════════════════════════════════════════════════════ */
function AreaSalas() {
  const [salas,    setSalas]    = useState([])
  const [cargando, setCargando] = useState(true)
  const [crearModal, setCrear]  = useState(false)
  const [calModal,   setCal]    = useState(null)   // sala seleccionada para ver calendario
  const [form,     setForm]     = useState({ nombre: '', capacidad: '' })
  const [error,    setError]    = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargarSalas = () => {
    getSalasRequest()
      .then(res => setSalas(res.data))
      .catch(() => setSalas([]))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargarSalas() }, [])

  const handleCrear = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.nombre.trim() || !form.capacidad) { setError('Completá todos los campos.'); return }
    setGuardando(true)
    try {
      await createSalaRequest({ nombre: form.nombre.trim(), capacidad: parseInt(form.capacidad) })
      setCrear(false)
      setForm({ nombre: '', capacidad: '' })
      cargarSalas()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Error al crear la sala.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Salas</h2>
        <button className={styles.btnPrimary} onClick={() => { setCrear(true); setError('') }}>
          + Crear sala
        </button>
      </div>

      {cargando ? (
        <p className={styles.noResultados}>Cargando salas...</p>
      ) : salas.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🏛️</span>
          <p>No hay salas registradas aún</p>
        </div>
      ) : (
        <div className={styles.salasList}>
          {salas.map(s => (
            <div key={s.id} className={styles.salaRow}>
              <div className={styles.salaInfo}>
                <p className={styles.salaNombre}>{s.nombre}</p>
                <p className={styles.salaMeta}>Capacidad: {s.capacidad} personas</p>
              </div>
              <div className={styles.salaStats}>
                <span className={styles.salaClasesBadge}>
                  {s.total_clases} {s.total_clases === 1 ? 'clase' : 'clases'}
                </span>
              </div>
              <button className={styles.verCalBtn} onClick={() => setCal(s)}>
                📅 Ver calendario
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear sala */}
      {crearModal && (
        <Modal title="Nueva sala" onClose={() => setCrear(false)}>
          <form onSubmit={handleCrear} className={styles.crearSalaForm}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Nombre de la sala</label>
              <input
                className={styles.formInput}
                type="text"
                placeholder="Ej: Sala A, Sala Principal..."
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Capacidad máxima</label>
              <input
                className={styles.formInput}
                type="number"
                min="1"
                placeholder="Ej: 15"
                value={form.capacidad}
                onChange={e => setForm(f => ({ ...f, capacidad: e.target.value }))}
              />
            </div>
            {error && <p className={styles.formError}>{error}</p>}
            <button type="submit" className={styles.btnPrimary} disabled={guardando}>
              {guardando ? 'Guardando...' : 'Crear sala'}
            </button>
          </form>
        </Modal>
      )}

      {/* Modal calendario de sala */}
      {calModal && (
        <Modal
          title={`Reservas — ${calModal.nombre}`}
          onClose={() => setCal(null)}
          wide
        >
          {calModal.total_clases === 0 ? (
            <div className={styles.emptyState} style={{ padding: '1.5rem 0' }}>
              <span className={styles.emptyIcon}>📅</span>
              <p>Esta sala no tiene clases asignadas aún</p>
            </div>
          ) : (
            <CalendarioSala sala={calModal} />
          )}
        </Modal>
      )}
    </section>
  )
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD PRINCIPAL
   ══════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const { user } = useAuth()

  return (
    <div className={styles.container}>

      <div className={styles.greeting}>
        <h1>Bienvenido, <span>{user?.first_name}</span> 👋</h1>
        <p>Panel de administración — RehabilitAR</p>
      </div>

      {/* Fila superior: Tareas + Clases en curso */}
      <div className={styles.topRow}>
        <TareasImportantes />
        <ClasesEnCurso />
      </div>

      {/* Clases */}
      <AreaClases />

      {/* Salas */}
      <AreaSalas />

      {/* Estadísticas */}
      <Estadisticas />

      {/* Usuarios */}
      <Usuarios />

    </div>
  )
}
