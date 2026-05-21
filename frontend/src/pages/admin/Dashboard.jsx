import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getUsersRequest } from '../../api/auth'
import { getClasesRequest, getClasesEnCursoRequest } from '../../api/clases'
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
                <span className={styles.cursoNombre}>{c.tipo}</span>
                <span className={styles.cursoDato}>{c.aula} · {c.horario}</span>
              </div>
              <button className={styles.verMasBtn} onClick={() => setDetalle(c)}>Ver más</button>
            </div>
          ))}
        </div>
      )}

      {detalle && (
        <Modal title={detalle.tipo} onClose={() => setDetalle(null)}>
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
  const [clases,   setClases]         = useState([])
  const [cargando, setCargando]       = useState(true)
  const [filtro, setFiltro]           = useState('todas')
  const [listaEsperaModal, setLista]  = useState(null)
  const [userModal, setUserModal]     = useState(null)

  useEffect(() => {
    getClasesRequest()
      .then(res => setClases(res.data))
      .catch(() => setClases([]))
      .finally(() => setCargando(false))
  }, [])

  const clasesFiltradas = clases.filter(c =>
    filtro === 'todas' ? true : getHorarioFiltro(c.horario) === filtro
  )

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Clases</h2>
        <button className={styles.btnPrimary}>+ Crear nueva clase</button>
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
                <p className={styles.claseNombre}>{c.tipo}</p>
                <p className={styles.claseMeta}>{c.dias} · {c.horario} · {c.aula}</p>
              </div>
              <div className={styles.claseProfesor}>
                {c.profesor_nombre ? (
                  <span className={styles.profesorNombre}>👤 {c.profesor_nombre}</span>
                ) : (
                  <div className={styles.sinProfesor}>
                    <span className={styles.sinAsignar}>SIN ASIGNAR</span>
                    <button className={styles.asignarBtn}>Asignar profesor</button>
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
          title={`Lista de espera — ${listaEsperaModal.tipo}`}
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

  const handleDelete = async (userId) => {
    try {
      await deleteUserRequest(userId)

      setUsuarios(prev =>
        prev.filter(u => u.id !== userId)
      )

      alert('Usuario eliminado')
    } catch (error) {
      console.error(error)
      alert('Error al eliminar usuario')
    }
  }

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
            <button className={styles.eliminarBtn} onClick={() => handleDelete(u.id)}>Eliminar</button>
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

      {/* Estadísticas */}
      <Estadisticas />

      {/* Usuarios */}
      <Usuarios />

    </div>
  )
}
