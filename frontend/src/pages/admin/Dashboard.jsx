import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
<<<<<<< HEAD
import { getUsersRequest, adminRegisterRequest, suspenderUserRequest, hardDeleteUserRequest, getAptosPendientesRequest, validarAptoFisicoRequest } from '../../api/auth'
=======
import { getUsersRequest, suspenderUserRequest, adminRegisterRequest, hardDeleteUserRequest, getAptosPendientesRequest, validarAptoFisicoRequest } from '../../api/auth'
>>>>>>> origin/main
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

const FILTROS_TIPO = [
  { label: '🔁 Fija',       value: 'fija' },
  { label: '📅 Individual', value: 'individual' },
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
  const [aptos, setAptos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarModalRechazo, setMostrarModalRechazo] = useState(false);
  const [aptoIdARechazar, setAptoIdARechazar] = useState(null);
  const [motivoTexto, setMotivoTexto] = useState('');
  const [alerta, setAlerta] = useState({ mostrar: false, texto: '', tipo: 'exito' });

  useEffect(() => {
    cargarAptos()
  }, [])

  const mostrarNotificacion = (texto, tipo = 'exito') => {
    setAlerta({ mostrar: true, texto, tipo });
    
    // A los 3 segundos exactos se oculta solo
    setTimeout(() => {
      setAlerta({ mostrar: false, texto: '', tipo: 'exito' });
    }, 3000);
  };

  const cargarAptos = async () => {
    try {
      const res = await getAptosPendientesRequest()
      setAptos(res.data)
    } catch (error) {
      console.error("Error al cargar aptos pendientes:", error)
    } finally {
      setCargando(false)
    }
  }

  // 2. Función para mandar la Aprobación
  const handleAprobar = async (id) => {
    try {
      await validarAptoFisicoRequest(id, 'APROBAR')
      mostrarNotificacion('Apto físico aprobado con éxito.', 'exito');
      setAptos(prev => prev.filter(a => a.id !== id)) // Lo saca de la lista visual
    } catch (error) {
      console.error(error)
      mostrarNotificacion('Error al intentar aprobar el apto.', 'error');
    }
  }

   const handleRechazar = (id) => {
    setAptoIdARechazar(id);
    setMotivoTexto('');             // Limpiamos el texto que haya quedado de antes
    setMostrarModalRechazo(true);   // Prende el cartel flotante en pantalla
  };

  const confirmarRechazoModerno = async (e) => {
    e.preventDefault();
    
    if (!motivoTexto.trim()) return;

    try {
      // Le mandamos a Django el ID recordado y el texto de la caja de texto
      await validarAptoFisicoRequest(aptoIdARechazar, 'RECHAZAR', motivoTexto);
      mostrarNotificacion('Apto físico rechazado con éxito.', 'exito');
      
      // Lo sacamos de la lista de tareas pendientes
      setAptos(prev => prev.filter(a => a.id !== aptoIdARechazar));
      setMostrarModalRechazo(false); // Cerramos el modal
    } catch (error) {
      console.error(error);
      mostrarNotificacion('Error al intentar rechazar el apto.', 'error');
    }
  };

  return (
    <div className={styles.card} style={{ position: 'relative' }}>
       {alerta.mostrar && (
        <div style={{
          position: 'fixed',                  
          top: '25px',                        
          left: '50%',                        
          transform: 'translateX(-50%)',      
          backgroundColor: alerta.tipo === 'exito' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          color: alerta.tipo === 'exito' ? '#22c55e' : '#ef4444',
          border: alerta.tipo === 'exito' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
          padding: '0.85rem 1.75rem', 
          borderRadius: '8px', 
          fontSize: '0.95rem',
          fontWeight: '500', 
          zIndex: 100000,                     // 👈 Pasa por encima de headers, modales y cualquier cosa
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          backdropFilter: 'blur(6px)'
        }}>
          <span>{alerta.tipo === 'exito' ? '✅' : '❌'}</span>
          {alerta.texto}
        </div>
      )}
      <h2 className={styles.cardTitle}>Tareas importantes</h2>
      {cargando ? (
        <div className={styles.emptyState}>
          <p>Cargando aptos pendientes...</p>
        </div>
      ) : aptos.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>✅</span>
          <p>Estás al día con todas tus tareas. No hay aptos pendientes.</p>
        </div>
      ) : (
        <div className={styles.tareasList}>
          {aptos.map((apto) => (
            <div key={apto.id} className={styles.tareaItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={styles.tareaTexto}>
                  📄 Apto pendiente: <strong>{apto.usuario_email}</strong>
                </span>
                {/* Botón para abrir el PDF o la imagen del apto en una pestaña nueva */}
                <a 
                  href={`http://localhost:8000/media/aptos_medicos/${apto.documento_url.split('/').pop()}`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.verMasBtn}
                >
                  Ver PDF
                </a>
              </div>
              
              {/* Botones de acción rápida para el Admin */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button 
                  onClick={() => handleAprobar(apto.id)}
                  style={{ background: '#22c55e', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Aprobar
                </button>
                <button 
                  onClick={() => handleRechazar(apto.id)}
                  style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarModalRechazo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={() => setMostrarModalRechazo(false)}>
          
          <div style={{
            backgroundColor: '#1e1e2f', border: '1px solid rgba(239, 68, 68, 0.25)',
            padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '450px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()}>
            
            <h3 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.25rem' }}>
              Rechazar Apto Físico
            </h3>
            
            <form onSubmit={confirmarRechazoModerno}>
              <label style={{ color: '#868e96', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Escribí el motivo detallado para el paciente:
              </label>
              
              <textarea
                value={motivoTexto}
                onChange={(e) => setMotivoTexto(e.target.value)}
                placeholder="Ej: El documento está borroso o la fecha de emisión expiró..."
                required
                style={{
                  width: '100%', height: '100px', backgroundColor: '#151521',
                  color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px', padding: '0.5rem', fontSize: '0.95rem',
                  resize: 'none', marginBottom: '1.5rem', outline: 'none'
                }}
              />
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={() => setMostrarModalRechazo(false)}
                  style={{
                    background: 'transparent', color: '#868e96', border: 'none',
                    padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600'
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  style={{
                    background: '#ef4444', color: 'white', border: 'none',
                    padding: '0.5rem 1.2rem', borderRadius: '6px', cursor: 'pointer',
                    fontWeight: '600', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                  }}
                >
                  Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
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
  const [filtroTipo,      setFiltroTipo] = useState('todos')
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

  const clasesFiltradas = clases.filter(c => {
    const matchHorario = filtro === 'todas' || getHorarioFiltro(c.horario) === filtro
    const matchTipo    = filtroTipo === 'todos' || c.tipo_clase === filtroTipo
    return matchHorario && matchTipo
  })

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
            className={`${styles.filtroBtn} ${filtro === f.value && (f.value !== 'todas' || filtroTipo === 'todos') ? styles.filtroBtnActive : ''}`}
            onClick={() => {
              setFiltro(f.value)
              if (f.value === 'todas') setFiltroTipo('todos')
            }}
          >
            {f.label}
          </button>
        ))}
        <div className={styles.filtroSeparador} />
        {FILTROS_TIPO.map(f => (
          <button
            key={f.value}
            className={`${styles.filtroBtn} ${filtroTipo === f.value ? styles.filtroBtnActive : ''}`}
            onClick={() => setFiltroTipo(f.value)}
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
const ESPECIALIDADES_OPTS = [
  { value: 'tren_superior', label: 'Tren Superior' },
  { value: 'tren_inferior', label: 'Tren Inferior' },
  { value: 'tren_medio',    label: 'Tren Medio'    },
]

const ROL_OPCIONES = [
  { value: 'admin',        label: 'Administrativo', emoji: '🛡️' },
  { value: 'teacher',      label: 'Profesor',        emoji: '👨‍🏫' },
  { value: 'receptionist', label: 'Recepcionista',   emoji: '🗂️' },
  { value: 'client',       label: 'Cliente',          emoji: '👤' },
]

const FORM_VACIO = {
  first_name: '', last_name: '', email: '', password: '',
  birth_date: '', address: '', address_number: '',
  address_floor: '', address_apt: '', phone: '',
}

function Usuarios() {
  const [usuarios, setUsuarios]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [userModal, setUserModal] = useState(null)
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null)
  const [suspenderModal, setSuspenderModal]     = useState(null)  // user a suspender
  const [motivoSuspension, setMotivoSuspension] = useState('')
  const [feedbackModal, setFeedbackModal]       = useState(null)  // { texto, tipo: 'exito'|'error' }

  // ── Modal registro ────────────────────────────────────────
  const [regModal,    setRegModal]   = useState(false)
  const [regPaso,     setRegPaso]    = useState(1)
  const [regRol,      setRegRol]     = useState(null)
  const [regForm,     setRegForm]    = useState(FORM_VACIO)
  const [regEsp,      setRegEsp]     = useState([])
  const [regError,    setRegError]   = useState('')
  const [regOk,       setRegOk]      = useState(false)
  const [regCargando, setRegCarg]    = useState(false)

  const cargarUsuarios = () => {
    setCargando(true)
    getUsersRequest()
      .then(res => setUsuarios(res.data))
      .catch(() => setUsuarios([]))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargarUsuarios() }, [])

  const abrirRegModal = () => {
    setRegModal(true); setRegPaso(1); setRegRol(null)
    setRegForm(FORM_VACIO); setRegEsp([])
    setRegError(''); setRegOk(false)
  }

  const cambiarForm  = e => setRegForm(p => ({ ...p, [e.target.name]: e.target.value }))
  const toggleEsp    = val => setRegEsp(p => p.includes(val) ? p.filter(v => v !== val) : [...p, val])
  const conEsp       = regRol === 'admin' || regRol === 'teacher'

  const handleRegistrar = async () => {
    const { first_name, last_name, email, password, birth_date, address, address_number, phone } = regForm
    if (!first_name || !last_name || !email || !password || !birth_date || !address || !address_number || !phone) {
      setRegError('Completá todos los campos obligatorios.')
      return
    }
    if (birth_date) {
      const hoy  = new Date()
      const nac  = new Date(birth_date)
      let edad   = hoy.getFullYear() - nac.getFullYear()
      const m    = hoy.getMonth() - nac.getMonth()
      if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
      if (edad < 18) {
        setRegError('El usuario debe ser mayor de edad.')
        return
      }
    }
    setRegCarg(true); setRegError('')
    try {
      await adminRegisterRequest({ ...regForm, role: regRol, especialidades: regEsp.join(',') })
      setRegOk(true)
      cargarUsuarios()
    } catch (e) {
      setRegError(e.response?.data?.detail || 'Error, intente nuevamente')
    } finally {
      setRegCarg(false)
    }
  }

  const rolLabel = ROL_OPCIONES.find(r => r.value === regRol)?.label ?? ''

  const handleSuspender = (user) => {
    setMotivoSuspension('')
    setSuspenderModal(user)
  }

  const confirmarSuspension = async () => {
    if (!motivoSuspension.trim()) return
    try {
      await deleteUserRequest(suspenderModal.id, motivoSuspension)
      setUsuarios(prev => prev.map(u => u.id === suspenderModal.id ? { ...u, is_active: false } : u))
      setFeedbackModal({ texto: 'Usuario suspendido con éxito.', tipo: 'exito' })
    } catch {
      setFeedbackModal({ texto: 'Error al cambiar el estado del usuario.', tipo: 'error' })
    } finally {
      setSuspenderModal(null)
    }
  }

  const handleReactivar = async (user) => {
    try {
      await deleteUserRequest(user.id, null)
      setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, is_active: true } : u))
      setFeedbackModal({ texto: 'Usuario reactivado con éxito.', tipo: 'exito' })
    } catch {
      setFeedbackModal({ texto: 'Error al cambiar el estado del usuario.', tipo: 'error' })
    }
  }

  const handleEliminarDefinitivo = (user) => {
    setUsuarioAEliminar(user)
  }

  const ejecutarBorradoFisicoReal = async () => {
    if (!usuarioAEliminar) return
    try {
      await hardDeleteUserRequest(usuarioAEliminar.id)
      setUsuarios(prev => prev.filter(u => u.id !== usuarioAEliminar.id))
      setFeedbackModal({ texto: 'Usuario eliminado por completo de la base de datos.', tipo: 'exito' })
    } catch {
      setFeedbackModal({ texto: 'Error al intentar eliminar definitivamente al usuario.', tipo: 'error' })
    } finally {
      setUsuarioAEliminar(null)
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
             {u.role !== "admin" && (
              <>
                {/* 1️⃣ BOTÓN DE ESTADO LÓGICO */}
                <button 
                  className={u.is_active ? styles.eliminarBtn : styles.activarBtn} 
                  onClick={() => u.is_active ? handleSuspender(u) : handleReactivar(u)}
                  style={{ marginRight: '8px' }}
                >
                  {u.is_active ? 'Suspender' : 'Activar'}
                </button>

                {/* 2️⃣ BOTÓN DE ELIMINACIÓN FÍSICA */}
                <button 
                  className={styles.eliminarBtn} 
                  onClick={() => handleEliminarDefinitivo(u)}
                  style={{ 
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    margin: 0
                  }}
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <button className={styles.btnOutline} style={{ marginTop: '1rem' }} onClick={abrirRegModal}>
        + Registrar nuevo usuario como administrativo
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

      {/* ── MODAL SUSPENSIÓN ── */}
      {suspenderModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}
          onClick={() => setSuspenderModal(null)}>
          <div style={{ background:'#13172e', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', padding:'2rem 2.2rem', width:'100%', maxWidth:'420px', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ color:'white', fontSize:'1.2rem', fontWeight:700, marginBottom:'0.5rem' }}>Suspender usuario</h3>
            <p style={{ color:'#b0b3c7', fontSize:'0.9rem', marginBottom:'1.2rem' }}>
              Ingresá el motivo de la suspensión de <strong style={{ color:'#a78bfa' }}>{suspenderModal.first_name} {suspenderModal.last_name}</strong>.
            </p>
            <textarea
              value={motivoSuspension}
              onChange={e => setMotivoSuspension(e.target.value)}
              placeholder="Motivo de suspensión..."
              rows={3}
              style={{ width:'100%', padding:'12px 14px', borderRadius:'12px', border:'1px solid #2c3157', background:'#111527', color:'white', fontSize:'0.95rem', resize:'vertical', boxSizing:'border-box', outline:'none', fontFamily:'inherit' }}
            />
            {motivoSuspension.trim() === '' && (
              <p style={{ color:'#f87171', fontSize:'0.85rem', marginTop:'0.4rem' }}>El motivo es obligatorio.</p>
            )}
            <div style={{ display:'flex', gap:'1rem', marginTop:'1.4rem' }}>
              <button onClick={() => setSuspenderModal(null)}
                style={{ flex:1, padding:'0.65rem', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'#c8cbdf', fontWeight:600, cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmarSuspension} disabled={!motivoSuspension.trim()}
                style={{ flex:1, padding:'0.65rem', borderRadius:'10px', border:'none', background: motivoSuspension.trim() ? '#f59e0b' : '#4b4b4b', color:'white', fontWeight:600, cursor: motivoSuspension.trim() ? 'pointer' : 'not-allowed' }}>
                Suspender
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FEEDBACK (éxito / error) ── */}
      {feedbackModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}
          onClick={() => setFeedbackModal(null)}>
          <div style={{ background:'#13172e', border:`1px solid ${feedbackModal.tipo === 'exito' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius:'20px', padding:'2rem 2.4rem', width:'100%', maxWidth:'380px', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <p style={{ fontSize:'2rem', marginBottom:'0.8rem' }}>{feedbackModal.tipo === 'exito' ? '✅' : '❌'}</p>
            <p style={{ color:'white', fontSize:'1rem', fontWeight:600, marginBottom:'1.5rem', lineHeight:1.5 }}>{feedbackModal.texto}</p>
            <button onClick={() => setFeedbackModal(null)}
              style={{ padding:'0.65rem 2rem', borderRadius:'12px', border:'none', background: feedbackModal.tipo === 'exito' ? '#22c55e' : '#ef4444', color:'white', fontWeight:600, fontSize:'0.95rem', cursor:'pointer' }}>
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* ⚠️ MODAL DE ADVERTENCIA CRÍTICA FLOTANTE DE ELIMINACIÓN */}
      {usuarioAEliminar && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={() => setUsuarioAEliminar(null)}>
          <div style={{
            backgroundColor: '#1e1e2f', border: '1px solid rgba(239, 68, 68, 0.25)',
            padding: '2.5rem 2rem', borderRadius: '12px', textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)', maxWidth: '430px', width: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h4 style={{ color: 'white', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: '400', lineHeight: '1.4' }}>
              ¿Deseas eliminar definitivamente a <strong style={{ color: '#a78bfa' }}>{usuarioAEliminar.first_name} {usuarioAEliminar.last_name}</strong>?
            </h4>
            <p style={{ color: '#868e96', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Esta acción es irreversible. Se borrará toda su información personal, turnos e historial de la base de datos de RehabilitAR.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => setUsuarioAEliminar(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)', color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.1)', padding: '0.65rem 1.5rem',
                  borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarBorradoFisicoReal}
                style={{
                  background: '#ef4444', color: 'white', border: 'none',
                  padding: '0.65rem 1.5rem', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: '600', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}
              >
                Eliminar para siempre
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Modal registro ── */}
      {regModal && (
        <Modal
          title={regPaso === 1 ? 'Seleccioná el tipo de usuario' : `Nuevo ${rolLabel}`}
          onClose={() => setRegModal(false)}
          wide
        >
          {regOk ? (
            <div className={styles.regExito}>
              <span className={styles.regExitoIcon}>✅</span>
              <p>Usuario registrado correctamente.</p>
              <p className={styles.regExitoEmail}>Se envió un correo a <strong>{regForm.email}</strong></p>
              <button className={styles.btnPrimary} onClick={() => setRegModal(false)}>Cerrar</button>
            </div>

          ) : regPaso === 1 ? (
            <div className={styles.rolGrid}>
              {ROL_OPCIONES.map(r => (
                <button
                  key={r.value}
                  className={styles.rolCard}
                  onClick={() => { setRegRol(r.value); setRegPaso(2) }}
                >
                  <span className={styles.rolEmoji}>{r.emoji}</span>
                  <span className={styles.rolNombre}>{r.label}</span>
                </button>
              ))}
            </div>

          ) : (
            <div className={styles.formReg}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.labelReg}>Nombre <span className={styles.req}>*</span></label>
                  <input className={styles.inputReg} name="first_name" placeholder="Juan"
                    value={regForm.first_name} onChange={cambiarForm} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.labelReg}>Apellido <span className={styles.req}>*</span></label>
                  <input className={styles.inputReg} name="last_name" placeholder="Pérez"
                    value={regForm.last_name} onChange={cambiarForm} />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.labelReg}>Correo electrónico <span className={styles.req}>*</span></label>
                <input className={styles.inputReg} type="email" name="email" placeholder="juan@email.com"
                  value={regForm.email} onChange={cambiarForm} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.labelReg}>Contraseña <span className={styles.req}>*</span></label>
                <input className={styles.inputReg} type="password" name="password"
                  placeholder="Mín. 8 caracteres, 1 letra y 1 número"
                  value={regForm.password} onChange={cambiarForm} />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.labelReg}>Fecha de nacimiento <span className={styles.req}>*</span></label>
                  <input className={styles.inputReg} type="date" name="birth_date"
                    value={regForm.birth_date} onChange={cambiarForm} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.labelReg}>Celular <span className={styles.req}>*</span></label>
                  <input className={styles.inputReg} name="phone" placeholder="1123456789"
                    value={regForm.phone} onChange={cambiarForm} />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.labelReg}>Calle <span className={styles.req}>*</span></label>
                  <input className={styles.inputReg} name="address" placeholder="Av. Corrientes"
                    value={regForm.address} onChange={cambiarForm} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.labelReg}>Número <span className={styles.req}>*</span></label>
                  <input className={styles.inputReg} name="address_number" placeholder="1234"
                    value={regForm.address_number} onChange={cambiarForm} />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.labelReg}>Piso</label>
                  <input className={styles.inputReg} name="address_floor" placeholder="3"
                    value={regForm.address_floor} onChange={cambiarForm} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.labelReg}>Depto</label>
                  <input className={styles.inputReg} name="address_apt" placeholder="A"
                    value={regForm.address_apt} onChange={cambiarForm} />
                </div>
              </div>

              {conEsp && (
                <div className={styles.formGroup}>
                  <label className={styles.labelReg}>Especialidades</label>
                  <div className={styles.checkGrid}>
                    {ESPECIALIDADES_OPTS.map(e => {
                      const activo = regEsp.includes(e.value)
                      return (
                        <button key={e.value} type="button"
                          className={`${styles.checkItem} ${activo ? styles.checkItemActive : ''}`}
                          onClick={() => toggleEsp(e.value)}
                        >
                          <span className={`${styles.checkBox} ${activo ? styles.checkBoxActive : ''}`}>
                            {activo && '✓'}
                          </span>
                          {e.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {regError && <p className={styles.msgError}>{regError}</p>}

              <div className={styles.formFooter}>
                <button className={styles.btnVolver}
                  onClick={() => { setRegPaso(1); setRegError('') }}>
                  ← Volver
                </button>
                <button className={styles.btnPrimary}
                  onClick={handleRegistrar} disabled={regCargando}>
                  {regCargando ? 'Registrando...' : 'Crear usuario'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </section>
  );
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

export default function AdminDashboard() {
  const { user } = useAuth()
  const [userModal, setUserModal] = useState(null);

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