import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getUsersRequest, suspenderUserRequest, adminRegisterRequest, hardDeleteUserRequest, getAptosPendientesRequest, validarAptoFisicoRequest } from '../../api/auth'
import { getClasesRequest, getClasesEnCursoRequest, getSalasRequest, createSalaRequest, getProfesoresPorEspecialidadRequest, asignarProfesorRequest, desasignarProfesorRequest, getListaEsperaFechasRequest, getListaEsperaUsuariosRequest, cambiarCapacidadRequest } from '../../api/clases'
import CrearClaseModal from '../../components/admin/CrearClaseModal'
import LoadingOverlay from '../../components/common/LoadingOverlay'
import styles from './Dashboard.module.css'
import toast from 'react-hot-toast';

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
                  style={{ background: '#22c55e', color: '#0f1f17', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Aprobar
                </button>
                <button 
                  onClick={() => handleRechazar(apto.id)}
                  style={{ background: '#ef4444', color: '#0f1f17', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
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
          backgroundColor: 'rgba(15, 31, 23, 0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={() => setMostrarModalRechazo(false)}>

          <div style={{
            backgroundColor: '#ffffff', border: '1px solid #b8dece',
            padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '450px',
            boxShadow: '0 10px 30px rgba(30, 100, 60, 0.15)'
          }} onClick={e => e.stopPropagation()}>

            <h3 style={{ color: '#1a2e25', marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 700 }}>
              Rechazar Apto Físico
            </h3>

            <form onSubmit={confirmarRechazoModerno}>
              <label style={{ color: '#3d6b55', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                Escribí el motivo detallado para el paciente:
              </label>

              <textarea
                value={motivoTexto}
                onChange={(e) => setMotivoTexto(e.target.value)}
                placeholder="Ej: El documento está borroso o la fecha de emisión expiró..."
                required
                style={{
                  width: '100%', height: '100px', backgroundColor: '#f4faf7',
                  color: '#1a2e25', border: '1px solid #b8dece',
                  borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.95rem',
                  resize: 'none', marginBottom: '1.5rem', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setMostrarModalRechazo(false)}
                  style={{
                    background: 'transparent', color: '#3d6b55', border: '1px solid #b8dece',
                    padding: '0.5rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
                    fontSize: '0.9rem'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#dc2626', color: '#ffffff', border: 'none',
                    padding: '0.5rem 1.2rem', borderRadius: '8px', cursor: 'pointer',
                    fontWeight: '600', fontSize: '0.9rem',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)'
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
                <span className={styles.cursoDato}>{c.horario}{c.aula && c.aula !== c.nombre ? ` · ${c.aula}` : ''}</span>
              </div>
              <div className={styles.cursoAcciones}>
                <button className={styles.registrarAsistenciaBtn}>Registrar asistencia</button>
                <button className={styles.verMasBtn} onClick={() => setDetalle(c)}>Ver más</button>
              </div>
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
  const [listaEsperaModal, setLista]       = useState(null)   // clase seleccionada
  const [listaFechas,      setListaFechas] = useState([])     // fechas con espera
  const [listaFechasCarg,  setListaFCarg]  = useState(false)
  const [fechaSelec,       setFechaSelec]  = useState(null)   // fecha seleccionada
  const [listaUsuarios,    setListaUsers]  = useState([])     // usuarios de esa fecha
  const [listaUsersCarg,   setListaUCarg]  = useState(false)
  const [userModal,        setUserModal]   = useState(null)
  const [crearClase,      setCrear]    = useState(false)
  const [asignarModal,    setAsignar]  = useState(null)   // clase a la que se asigna profesor
  const [desasignarModal, setDesasignar] = useState(null) // clase de la que se quita profesor
  const [desasignando,    setDesasignando] = useState(false)
  const [infoProfesorSel, setInfoProfesorSel] = useState(null)
  const [confirmarPaso,   setConfirmarPaso] = useState(false)
  const [profesores,      setProfesores] = useState([])
  const [profesorSel,     setProfesorSel] = useState('')
  const [asignando,       setAsignando] = useState(false)
  const [asignarError,    setAsignarError] = useState('')
  const [alerta,          setAlerta]       = useState({ mostrar: false, texto: '', tipo: 'exito' })
  const [capacidadModal,  setCapacidadModal]  = useState(null)  // { id, nombre }
  const [nuevaCap,        setNuevaCap]        = useState('')
  const [capError,        setCapError]        = useState('')
  const [capCargando,     setCapCargando]     = useState(false)
  const [capResultModal,  setCapResultModal]  = useState(null)  // { texto, cancelada: bool }
  const [loadingMsg,      setLoadingMsg]   = useState(null)


  const mostrarNotificacion = (texto, tipo = 'exito') => {
    setAlerta({ mostrar: true, texto, tipo });
    
    // A los 3 segundos exactos se oculta solo
    setTimeout(() => {
      setAlerta({ mostrar: false, texto: '', tipo: 'exito' });
    }, 3000);
  };
  const cargarClases = () => {
    getClasesRequest()
      .then(res => setClases(res.data))
      .catch(() => setClases([]))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargarClases() }, [])

  const abrirCambiarCapacidad = (clase) => {
    setCapacidadModal({ id: clase.id, nombre: clase.nombre, cupo: clase.cupo })
    setNuevaCap(String(clase.cupo))
    setCapError('')
  }

  const handleCambiarCapacidad = async () => {
    const cupo = parseInt(nuevaCap)
    if (!cupo || cupo <= 0) { setCapError('Ingresá un número válido.'); return }
    setCapCargando(true)
    try {
      const res = await cambiarCapacidadRequest(capacidadModal.id, cupo)
      setCapacidadModal(null)
      cargarClases()
      if (res.data.cancelada) setCapResultModal({ texto: res.data.detail, cancelada: true })
    } catch (err) {
      setCapError(err.response?.data?.detail ?? 'Error al cambiar la capacidad.')
    } finally {
      setCapCargando(false)
    }
  }

  const abrirListaEspera = (clase) => {
    setLista(clase)
    setFechaSelec(null)
    setListaUsers([])
    setListaFechas([])
    setListaFCarg(true)
    getListaEsperaFechasRequest(clase.id)
      .then(r => setListaFechas(r.data))
      .catch(() => setListaFechas([]))
      .finally(() => setListaFCarg(false))
  }

  const abrirFechaEspera = (claseId, fecha) => {
    setFechaSelec(fecha)
    setListaUCarg(true)
    getListaEsperaUsuariosRequest(claseId, fecha)
      .then(r => setListaUsers(r.data))
      .catch(() => setListaUsers([]))
      .finally(() => setListaUCarg(false))
  }

  const cerrarListaEspera = () => {
    setLista(null)
    setFechaSelec(null)
    setListaFechas([])
    setListaUsers([])
    setUserModal(null)
  }

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

  const handleDesasignarProfesor = async () => {
    if (!desasignarModal) return
    setDesasignando(true)
    try {
      // Reutiliza la misma petición pasándole un valor vacío o llamando a tu endpoint desasignar
      await desasignarProfesorRequest(desasignarModal.id) 
      setDesasignar(null)
      cargarClases() // Refresca la lista automáticamente en pantalla
      mostrarNotificacion("Profesor desasignado con éxito", "exito")

    } catch (err) {
      const mensajeError = err.response?.data?.detail ?? 'Error al desasignar el profesor.'
      mostrarNotificacion(mensajeError, "error")
    } finally {
      setDesasignando(false)
    }
  }

  const clasesFiltradas = clases.filter(c => {
    if (c.estado === 'cancelada') return false
    const matchHorario = filtro === 'todas' || getHorarioFiltro(c.horario) === filtro
    const matchTipo    = filtroTipo === 'todos' || c.tipo_clase === filtroTipo
    return matchHorario && matchTipo
  })

  const handleCancelarClase = async (clase) => {
    const token = localStorage.getItem("access_token")
    if (!token) return

    setLoadingMsg('Cancelando clase')
    try {
      const [res] = await Promise.all([
        fetch("/api/clases/cancelar-clase/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ clase_id: clase.id }),
        }),
        new Promise(r => setTimeout(r, 800)),
      ])
      if (!res.ok) throw new Error()
      mostrarNotificacion('Clase cancelada correctamente.', 'exito')
      cargarClases()
    } catch {
      mostrarNotificacion('Hubo un error al cancelar la clase.', 'error')
    } finally {
      setLoadingMsg(null)
    }
  }

  return (
    <>
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
                <div style={{display:"flex", flexDirection:"row", gap:"8px", alignItems:"center", flexWrap:"wrap"}}>
                  <p className={styles.claseNombre}>{c.nombre}</p>
                  <span className={c.tipo_clase === 'fija' ? styles.tipoBadgeFija : styles.tipoBadgeIndividual}>
                    {c.tipo_clase === 'fija' ? '🔁 Fija' : '📅 Individual'}
                  </span>
                  <span className={`${styles.estadoBadge} ${styles[c.estado]}`}>{c.estado.toUpperCase()}</span>
                </div>
                <p className={styles.claseMeta}>{c.especialidad_display} · {c.dias} · {c.horario} · {c.aula}</p>
              </div>
            {c.estado !== 'cancelada' &&
              <>
                <div className={styles.claseProfesor}>
                  {c.profesor_nombre ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className={styles.verMasBtn}
                      onClick={() => {
                        setDesasignar(c);
                        setInfoProfesorSel(null);
                        setConfirmarPaso(false);

                        getProfesoresPorEspecialidadRequest(c.especialidad)
                          .then(res => {
                            const profeDetalle = res.data.find(p => p.nombre === c.profesor_nombre);
                            if (profeDetalle) setInfoProfesorSel(profeDetalle);
                          })
                          .catch(() => setInfoProfesorSel(null));
                      }}
                      title="Ver información del profesor"
                      style={{
                        padding: '0.3rem 0.75rem',
                        fontSize: '0.82rem',
                        borderRadius: '20px',
                        letterSpacing: '0.3px',
                        boxShadow: '0 2px 8px rgba(30, 153, 136, 0.05)'
                      }}
                    >
                      Ver profesor de clase
                    </button>
                  </div>
                    ) : (
                      <div className={styles.sinProfesor}>
                        <span className={styles.sinAsignar}>SIN ASIGNAR</span>
                        <button className={styles.asignarBtn} onClick={() => abrirAsignar(c)}>Asignar profesor</button>
                      </div>
                    )}
                  <button
                    className={styles.cancelarClaseBtn}
                    onClick={() => handleCancelarClase(c)}
                  >
                    Cancelar clase
                  </button>
                  </div>
                  <div className={styles.claseCupo}>
                    <span className={`${styles.cupoTag} ${c.cantidad_inscriptos >= c.cupo ? styles.cupoLleno : ''}`}>
                      {c.cantidad_inscriptos}/{c.cupo} inscriptos
                    </span>
                  </div>
                </>
              }
            </div>
            {c.estado !== 'cancelada' &&
              <div className={styles.claseAcciones}>
                <button
                  className={styles.listaEsperaBtn}
                  onClick={() => abrirListaEspera(c)}
                >
                  Ver listas de espera
                  {c.lista_espera.length > 0 && (
                    <span className={styles.listaCount}>{c.lista_espera.length}</span>
                  )}
                </button>
                <button
                  className={styles.listaEsperaBtn}
                  onClick={() => abrirCambiarCapacidad(c)}
                >
                  Cambiar capacidad
                </button>
              </div>
            }
          </div>
          ))}
      </div>
     

      {/* ── Modal lista de espera — Paso 1: fechas ── */}
      {listaEsperaModal && !fechaSelec && (
        <Modal
          title={`Listas de espera — ${listaEsperaModal.nombre}`}
          onClose={cerrarListaEspera}
          wide
        >
          {listaFechasCarg ? (
            <p className={styles.emptyMsg}>Cargando...</p>
          ) : listaFechas.length === 0 ? (
            <p className={styles.emptyMsg}>No hay clases con lista de espera para esta clase.</p>
          ) : (
            <div className={styles.listaEsperaList}>
              {listaFechas.map(f => {
                const [y, m, d] = f.fecha.split('-')
                const label = new Date(+y, +m - 1, +d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                return (
                  <div key={f.fecha} className={styles.listaEsperaItem}>
                    <div>
                      <p className={styles.listaUserNombre}>{f.nombre}</p>
                      <p className={styles.listaUserEmail}>{label} · {f.horario}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={styles.listaCount}>{f.cantidad}</span>
                      <button
                        className={styles.verMasBtn}
                        onClick={() => abrirFechaEspera(listaEsperaModal.id, f.fecha)}
                      >
                        Ver lista de espera
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Modal>
      )}

      {/* ── Modal lista de espera — Paso 2: usuarios de esa fecha ── */}
      {listaEsperaModal && fechaSelec && (
        <Modal
          title={`Lista de espera — ${new Date(fechaSelec + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
          onClose={() => setFechaSelec(null)}
          wide
        >
          <button
            onClick={() => setFechaSelec(null)}
            style={{ background: 'none', border: 'none', color: '#1a9d85', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem', padding: 0 }}
          >
            ← Volver a fechas
          </button>

          {listaUsersCarg ? (
            <p className={styles.emptyMsg}>Cargando...</p>
          ) : listaUsuarios.length === 0 ? (
            <p className={styles.emptyMsg}>No hay usuarios en lista de espera para esta fecha.</p>
          ) : (
            <div className={styles.listaEsperaList}>
              {listaUsuarios.map((u, i) => (
                <div key={u.id} className={styles.listaEsperaItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ background: '#1a9d85', color: '#fff', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <div>
                      <p className={styles.listaUserNombre}>{u.nombre}</p>
                      <p className={styles.listaUserEmail}>{u.email}</p>
                    </div>
                  </div>
                  <button className={styles.verMasBtn} onClick={() => setUserModal(u)}>Ver más</button>
                </div>
              ))}
            </div>
          )}

          {userModal && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'linear-gradient(145deg,#eaf5ef,#f4faf7)', border: '1px solid #b8dece', borderRadius: '12px' }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#1a2e25' }}>{userModal.nombre}</p>
              <div className={styles.detalleGrid}>
                <span>Email</span>    <span>{userModal.email}</span>
                <span>Teléfono</span> <span>{userModal.telefono || '—'}</span>
              </div>
              <button onClick={() => setUserModal(null)} style={{ marginTop: '8px', background: 'none', border: 'none', color: '#1a9d85', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>Cerrar detalle</button>
            </div>
          )}
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
        {/* Modal Detalle — Información y Remoción del Profesor */}
      {desasignarModal && (
        <Modal 
          title={confirmarPaso ? "Confirmar acción" : (infoProfesorSel ? infoProfesorSel.nombre : desasignarModal.profesor_nombre)} 
          onClose={() => { setDesasignar(null); setInfoProfesorSel(null); }}
        >
          {!confirmarPaso ? (
           <>

          <div className={styles.detalleGrid}>
            <span>Email</span>      <span>{infoProfesorSel?.email || 'Cargando...'}</span>
            <span>Rol</span>        <span>Profesor</span>
            <span>Teléfono</span>   <span>{infoProfesorSel?.telefono || infoProfesorSel?.phone || '—'}</span>
            {/* Si el backend de profesores no devuelve fecha de nacimiento, podemos poner la Especialidad */}
            <span>Especialidad</span> <span>{desasignarModal.especialidad_display}</span>
            <span>Estado</span>
            {infoProfesorSel ? (
              <span className={infoProfesorSel.is_active !== false ? styles.estadoActivo : styles.estadoSuspendido}>
                {infoProfesorSel.is_active !== false ? 'Activo' : 'Suspendido'}
              </span>
            ) : (
              <span>—</span>
            )}
          </div>

          <div style={{ borderTop: '1px solid #e9ecef', marginTop: '20px', paddingTop: '15px' }}>
                <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button className={styles.btnOutline} onClick={() => { setDesasignar(null); setInfoProfesorSel(null); }}>
                    Cerrar
                  </button>
                  {/* Este botón avanza al paso de confirmación */}
                  <button className={styles.btnPrimary} onClick={() => setConfirmarPaso(true)}>
                    Quitar de la clase
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* ══════════════════════════════════════════════════════════
               PANTALLA 2: ADVERTENCIA DE SEGURIDAD ESTILIZADA
               ══════════════════════════════════════════════════════════ */
            <div style={{ padding: '5px', textAlign: 'center' }}>
              <h4 style={{ color: '#ffffff', marginBottom: '10px', fontSize: '1.1rem', fontWeight: '600' }}>
                ¿Estás seguro?
              </h4>
              <p style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '25px', lineHeight: '1.4' }}>
                Vas a desasignar a <strong>{desasignarModal.profesor_nombre}</strong> de la clase de <strong>{desasignarModal.nombre}</strong>. 
              </p>

              <div style={{ paddingTop: '18px' }}>
                <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  {/* Botón para arrepentirse y volver a la ficha */}
                  <button className={styles.btnOutline} onClick={() => setConfirmarPaso(false)}>
                    No, volver
                  </button>
                  
                  <button
                    onClick={handleDesasignarProfesor}
                    disabled={desasignando}
                    style={{ 
                      padding: '0.55rem 1.3rem',
                      border: '1px solid rgba(220, 53, 69, 0.4)', /* Borde rojo suave */
                      borderRadius: '10px',
                      background: 'rgba(220, 53, 69, 0.05)',       /* Fondo blanco con un toque rojo traslúcido */
                      color: '#dc3545',                            /* Letras rojas claras */
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => { 
                      e.target.style.backgroundColor = 'rgba(220, 53, 69, 0.15)'; /* Se oscurece el fondo al pasar el mouse */
                      e.target.style.borderColor = '#dc3545';
                    }}
                    onMouseLeave={(e) => { 
                      e.target.style.backgroundColor = 'rgba(220, 53, 69, 0.05)'; 
                      e.target.style.borderColor = 'rgba(220, 53, 69, 0.4)';
                    }}
                  >
                    {desasignando ? 'Quitando...' : 'Sí, desasignar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}


      {/* Modal crear clase */}
      {crearClase && (
        <CrearClaseModal
          onClose={() => setCrear(false)}
          onCreada={cargarClases}
        />
      )}

      {/* Modal cambiar capacidad */}
      {capacidadModal && (
        <Modal
          title={`Cambiar capacidad — ${capacidadModal.nombre}`}
          onClose={() => setCapacidadModal(null)}
        >
          <p style={{ color: '#b0b3c7', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Ingresá el nuevo cupo. Si es menor a los inscriptos actuales, la clase se cancelará automáticamente.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="number"
              min="1"
              value={nuevaCap}
              onChange={e => setNuevaCap(e.target.value)}
              style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#111527', color: 'white', fontSize: '1rem', outline: 'none' }}
            />
            <button
              onClick={handleCambiarCapacidad}
              disabled={capCargando}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', background: '#7c3aed', color: 'white', fontWeight: 600, cursor: capCargando ? 'not-allowed' : 'pointer' }}
            >
              {capCargando ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
          {capError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>{capError}</p>}
        </Modal>
      )}

      {/* Modal resultado cancelación de clase por capacidad */}
      {capResultModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={() => setCapResultModal(null)}>
          <div style={{
            background: '#13172e', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '20px', padding: '2rem 2.4rem', width: '100%', maxWidth: '440px',
            textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>🚫</p>
            <h3 style={{ color: 'white', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Clase cancelada</h3>
            <p style={{ color: '#b0b3c7', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>{capResultModal.texto}</p>
            <p style={{ color: '#868e96', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Se notificó a los inscriptos por mail. Los créditos y señas se gestionarán a la brevedad.
            </p>
            <button onClick={() => setCapResultModal(null)}
              style={{ padding: '0.65rem 2rem', borderRadius: '12px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}>
              Aceptar
            </button>
          </div>
        </div>
      )}

      {loadingMsg && <LoadingOverlay mensaje={loadingMsg} />}
    </section>
    </>
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
  const [loadingMsg, setLoadingMsg]             = useState(null)  // texto del overlay de carga

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
    setRegCarg(true); setRegError(''); setLoadingMsg('Registrando usuario')
    try {
      await adminRegisterRequest({ ...regForm, role: regRol, especialidades: regEsp.join(',') })
      setRegOk(true)
      cargarUsuarios()
    } catch (e) {
      setRegError(e.response?.data?.detail || 'Error, intente nuevamente')
    } finally {
      setRegCarg(false); setLoadingMsg(null)
    }
  }

  const rolLabel = ROL_OPCIONES.find(r => r.value === regRol)?.label ?? ''

  const handleSuspender = (user) => {
    setMotivoSuspension('')
    setSuspenderModal(user)
  }

  const confirmarSuspension = async () => {
    if (!motivoSuspension.trim()) return
    setSuspenderModal(null)
    setLoadingMsg('Suspendiendo usuario')
    try {
      await suspenderUserRequest(suspenderModal.id, motivoSuspension)
      setUsuarios(prev => prev.map(u => u.id === suspenderModal.id ? { ...u, is_active: false } : u))
      setFeedbackModal({ texto: 'Usuario suspendido con éxito.', tipo: 'exito' })
    } catch {
      setFeedbackModal({ texto: 'Error al cambiar el estado del usuario.', tipo: 'error' })
    } finally {
      setLoadingMsg(null)
    }
  }

  const handleReactivar = async (user) => {
    setLoadingMsg('Reactivando usuario')
    try {
      await suspenderUserRequest(user.id, null)
      setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, is_active: true } : u))
      setFeedbackModal({ texto: 'Usuario reactivado con éxito.', tipo: 'exito' })
    } catch {
      setFeedbackModal({ texto: 'Error al cambiar el estado del usuario.', tipo: 'error' })
    } finally {
      setLoadingMsg(null)
    }
  }

  const handleEliminarDefinitivo = (user) => {
    setUsuarioAEliminar(user)
  }

  const ejecutarBorradoFisicoReal = async () => {
    if (!usuarioAEliminar) return
    const id = usuarioAEliminar.id
    setUsuarioAEliminar(null)
    setLoadingMsg('Eliminando usuario')
    try {
      await hardDeleteUserRequest(id)
      setUsuarios(prev => prev.filter(u => u.id !== id))
      setFeedbackModal({ texto: 'Usuario eliminado por completo de la base de datos.', tipo: 'exito' })
    } catch {
      setFeedbackModal({ texto: 'Error al intentar eliminar definitivamente al usuario.', tipo: 'error' })
    } finally {
      setLoadingMsg(null)
    }
  }

  const usuariosFiltrados = usuarios.filter(u => {
    const matchRol = filtroRol === 'todos' || u.role === filtroRol
    const matchBusq = u.email.toLowerCase().includes(busqueda.toLowerCase())
    return matchRol && matchBusq
  })

  return (
    <section className={styles.section}>
      {loadingMsg && <LoadingOverlay mensaje={loadingMsg} />}

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
                {/* 1️⃣ BOTÓN DE ESTADO LÓGICO — solo para clientes */}
                {u.role === 'client' && (
                  <button
                    className={u.is_active ? styles.eliminarBtn : styles.activarBtn}
                    onClick={() => u.is_active ? handleSuspender(u) : handleReactivar(u)}
                    style={{ marginRight: '8px' }}
                  >
                    {u.is_active ? 'Suspender' : 'Activar'}
                  </button>
                )}

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
        <div style={{ position:'fixed', inset:0, background:'rgba(26,46,37,0.35)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}
          onClick={() => setSuspenderModal(null)}>
          <div style={{ background:'linear-gradient(160deg, #e8f5ee 0%, #daeee3 100%)', border:'1px solid #b8dece', borderRadius:'20px', padding:'2rem 2.2rem', width:'100%', maxWidth:'420px', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ color:'#0f1f17', fontSize:'1.2rem', fontWeight:700, marginBottom:'0.5rem' }}>Suspender usuario</h3>
            <p style={{ color:'#3d6b55', fontSize:'0.9rem', marginBottom:'1.2rem' }}>
              Ingresá el motivo de la suspensión de <strong style={{ color:'#52b788' }}>{suspenderModal.first_name} {suspenderModal.last_name}</strong>.
            </p>
            <textarea
              value={motivoSuspension}
              onChange={e => setMotivoSuspension(e.target.value)}
              placeholder="Motivo de suspensión..."
              rows={3}
              style={{ width:'100%', padding:'12px 14px', borderRadius:'12px', border:'1.5px solid #b8dece', background:'#f4faf7', color:'#1a2e25', fontSize:'0.95rem', resize:'vertical', boxSizing:'border-box', outline:'none', fontFamily:'inherit' }}
            />
            {motivoSuspension.trim() === '' && (
              <p style={{ color:'#dc2626', fontSize:'0.85rem', marginTop:'0.4rem' }}>El motivo es obligatorio.</p>
            )}
            <div style={{ display:'flex', gap:'1rem', marginTop:'1.4rem' }}>
              <button onClick={() => setSuspenderModal(null)}
                style={{ flex:1, padding:'0.65rem', borderRadius:'10px', border:'1.5px solid #b8dece', background:'linear-gradient(160deg, #e8f5ee 0%, #daeee3 100%)', color:'#1a2e25', fontWeight:600, cursor:'pointer', fontSize:'0.95rem' }}>
                Cancelar
              </button>
              <button onClick={confirmarSuspension} disabled={!motivoSuspension.trim()}
                style={{ flex:1, padding:'0.65rem', borderRadius:'10px', border:'none', background: motivoSuspension.trim() ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : '#c8d8d0', color:'#ffffff', fontWeight:600, cursor: motivoSuspension.trim() ? 'pointer' : 'not-allowed', fontSize:'0.95rem', boxShadow: motivoSuspension.trim() ? '0 4px 14px rgba(220,38,38,0.35)' : 'none' }}>
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
          <div style={{ background:'linear-gradient(160deg, #e8f5ee 0%, #daeee3 100%)', border:`1px solid ${feedbackModal.tipo === 'exito' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius:'20px', padding:'2rem 2.4rem', width:'100%', maxWidth:'380px', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>
            <p style={{ fontSize:'2rem', marginBottom:'0.8rem' }}>{feedbackModal.tipo === 'exito' ? '✅' : '❌'}</p>
            <p style={{ color:'#0f1f17', fontSize:'1rem', fontWeight:600, marginBottom:'1.5rem', lineHeight:1.5 }}>{feedbackModal.texto}</p>
            <button onClick={() => setFeedbackModal(null)}
              style={{ padding:'0.65rem 2rem', borderRadius:'12px', border:'none', background: feedbackModal.tipo === 'exito' ? 'linear-gradient(135deg,#1a9d85,#147a68)' : 'linear-gradient(135deg,#dc2626,#b91c1c)', color:'#ffffff', fontWeight:600, fontSize:'0.95rem', cursor:'pointer', boxShadow: feedbackModal.tipo === 'exito' ? '0 4px 14px rgba(26,157,133,0.3)' : '0 4px 14px rgba(220,38,38,0.3)' }}>
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
            background: 'linear-gradient(160deg, #e8f5ee 0%, #daeee3 100%)',
            border: '1.5px solid rgba(220, 38, 38, 0.3)',
            padding: '2.5rem 2rem', borderRadius: '20px', textAlign: 'center',
            boxShadow: '0 16px 48px rgba(0,0,0,0.25)', maxWidth: '430px', width: '90%'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
            <h4 style={{ color: '#1a2e25', marginBottom: '0.75rem', fontSize: '1.15rem', fontWeight: '700', lineHeight: '1.4' }}>
              ¿Eliminar definitivamente a <strong style={{ color: '#dc2626' }}>{usuarioAEliminar.first_name} {usuarioAEliminar.last_name}</strong>?
            </h4>
            <p style={{ color: '#3d6b55', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Esta acción es <strong style={{ color: '#dc2626' }}>irreversible</strong>. Se borrará toda su información personal, turnos e historial de la base de datos de RehabilitAR.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => setUsuarioAEliminar(null)}
                style={{
                  background: 'linear-gradient(160deg, #e8f5ee 0%, #daeee3 100%)',
                  color: '#1a2e25', border: '1.5px solid #b8dece',
                  padding: '0.65rem 1.5rem', borderRadius: '10px',
                  cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarBorradoFisicoReal}
                style={{
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  color: '#ffffff', border: 'none',
                  padding: '0.65rem 1.5rem', borderRadius: '10px',
                  cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)'
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

  // Filtrar clases no canceladas
  const clasesActivas = (sala.clases || []).filter(c => c.estado !== 'cancelada')
  const clasesConDias = clasesActivas.map(c => ({ ...c, diasSet: parseDiasSala(c.dias) }))

  function clasesDelDia(dia) {
    const dow = new Date(year, mes, dia).getDay()
    const fechaActual = toDs(year, mes, dia)
    return clasesConDias.filter(c => {
      // Clases fijas: aparecen en todos los días que coincidan con su día de la semana
      if (c.tipo_clase === 'fija') {
        return c.diasSet.has(dow)
      }
      // Clases individuales: aparecen solo en su fecha específica
      if (c.tipo_clase === 'individual') {
        return c.fecha === fechaActual
      }
      return false
    })
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