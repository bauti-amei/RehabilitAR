import React, { useState, useEffect } from 'react';
import styles from './MiPerfil.module.css';
import { getMeRequest, updateProfileRequest, subirAptoFisicoRequest } from '../../api/auth';
import { Link } from 'react-router-dom';

function MiPerfil() {

  // Obtenemos el rol real desde el localStorage (por ejemplo: 'CLIENTE', 'ADMIN', 'PROFESOR', 'RECEPCIONISTA')
  const [rolUsuario, setRolUsuario] = useState(''); 
  const [loading, setLoading] = useState(true);

  // --- Estados de Datos Personales ---
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [celular, setCelular] = useState('');
  
  // --- Estados de Dirección ---
  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [piso, setPiso] = useState('');
  const [depto, setDepto] = useState('');

  // --- Estados del Apto Físico ---
  const [archivo, setArchivo] = useState(null);
  const [estadoApto, setEstadoApto] = useState('NO_SUBIDO'); 
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // estado para notificaciones
  const [alerta, setAlerta] = useState({ mostrar: false, texto: '', tipo: 'exito' });

  let rutaInicio = '/login'; // Ruta por defecto por seguridad

if (rolUsuario === 'client' || rolUsuario === 'cliente') {
  rutaInicio = '/client';
} else if (rolUsuario === 'admin' || rolUsuario === 'administrador') {
  rutaInicio = '/admin';
} else if (rolUsuario === 'teacher' || rolUsuario === 'profesor') {
  rutaInicio = '/teacher';
} else if (rolUsuario === 'receptionist' || rolUsuario === 'recepcionista') {
  rutaInicio = '/receptionist';
}

  // Cargar los datos del usuario logueado al montar el componente
  useEffect(() => {
    const cargarPerfilCompleto = async () => {
      try {
        const respuesta = await getMeRequest();
        const datosUsuario = respuesta.data;

        console.log("DATOS REALES DEL ENDPOINT ME:", datosUsuario);

        if (datosUsuario) {
          const rolEnMinuscula = datosUsuario.role ? datosUsuario.role.toLowerCase() : 'client';
          setRolUsuario(rolEnMinuscula); 

          setNombre(datosUsuario.first_name || '');
          setApellido(datosUsuario.last_name || '');
          setEmail(datosUsuario.email || '');
          setFechaNacimiento(datosUsuario.birth_date || '');
          setCelular(datosUsuario.phone || '');
          setCalle(datosUsuario.address || '');
          setNumero(datosUsuario.address_number || '');
          setPiso(datosUsuario.address_floor || '');
          setDepto(datosUsuario.address_apt || '');

          setEstadoApto(datosUsuario.apto_estado || 'NO_SUBIDO');
          setMotivoRechazo(datosUsuario.apto_motivo_rechazo || '');
        }
      } catch (error) {
        console.error("Error al traer los datos de /auth/me/:", error);
        
        // Plan B si falla la API
        const usuarioBackup = JSON.parse(localStorage.getItem('user'));
        if (usuarioBackup) {
          setRolUsuario(usuarioBackup.role?.toLowerCase() || 'client');
          setNombre(usuarioBackup.first_name || '');
          setApellido(usuarioBackup.last_name || '');
          setEmail(usuarioBackup.email || '');
        }
      } finally {
        setLoading(false);
      }
    };

    cargarPerfilCompleto();
  }, []);

  const mostrarNotificacion = (texto, tipo = 'exito') => {
    setAlerta({ mostrar: true, texto, tipo });
    
    setTimeout(() => {
      setAlerta({ mostrar: false, texto: '', tipo: 'exito' });
    }, 3000);
  };


  const manejarCambioArchivo = (e) => {
    if (e.target.files.length > 0) {
      setArchivo(e.target.files[0]);
    }
  };

 const guardarDatosPersonales = async (e) => {
  e.preventDefault();

  if (fechaNacimiento) {
    const fechaNac = new Date(fechaNacimiento);
    const hoy = new Date();
    
    // Calculamos la edad restando los años
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();
    
    // Ajustamos la edad si aún no cumplió años este año
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }

    if (edad < 18) {
     mostrarNotificacion("Debes ser mayor de edad (18 años) para modificar tu perfil.", "error");
      return; // ✋ Bloquea el envío del formulario inmediatamente
    }
  }

  setLoading(true);

  try {
    const todosLosDatos = {
      first_name: nombre.strip?.() || nombre, // Mantiene el nombre
      last_name: apellido.strip?.() || apellido, // Mantiene el apellido
      phone: celular,
      birth_date: fechaNacimiento || null, 
      address: calle,
      address_number: numero,
      address_floor: piso,
      address_apt: depto
    };

    const datosFiltrados = {};
    Object.entries(todosLosDatos).forEach(([key, value]) => {
      // Si el campo tiene texto (no está vacío) o si es la fecha y no es nula, lo agregamos
      if (value !== '' && value !== null && value !== undefined) {
        datosFiltrados[key] = value;
      }
    });

    // Enviamos el PATCH a Django
    await updateProfileRequest(datosFiltrados);
    
    // Sincronizamos la memoria local del navegador
    const usuarioViejo = JSON.parse(localStorage.getItem('user')) || {};
    const usuarioActualizado = { ...usuarioViejo, ...datosFiltrados };
    localStorage.setItem('user', JSON.stringify(usuarioActualizado));
    
    mostrarNotificacion("¡Tus datos personales se guardaron con éxito!");
  } catch (error) {
    console.error("Error al actualizar el perfil:", error);
    const mensajeError = error.response?.data?.detail || JSON.stringify(error.response?.data) || "Hubo un error";
    mostrarNotificacion("Error al guardar: " + mensajeError);
  } finally {
    setLoading(false);
  }
};

  const enviarApto = async (e) => {
    e.preventDefault();
    if (!archivo) return alert("Por favor, selecciona un archivo PDF o Imagen.");

    setLoading(true); // Ponemos el loader para que el usuario espere
    const formData = new FormData();
    formData.append('documento', archivo); // El backend espera el archivo en el campo 'documento'

    try {
      // 1. Mandamos el archivo por Axios a Django
      await subirAptoFisicoRequest(formData);
      
      // 2. Si sale bien, fijamos el estado en PENDIENTE
      setEstadoApto('PENDIENTE');
      mostrarNotificacion("¡Apto físico subido con éxito! Queda listo para la revisión del Administrador.");
    } catch (error) {
      console.error("Error al subir el archivo:", error);
      const msg = error.response?.data?.detail || "No se pudo subir el archivo.";
      mostrarNotificacion("Error: " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container} style={{ position: 'relative' }}>
        
      {alerta.mostrar && (
        <div style={{
          position: 'fixed',
          top: '25px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: alerta.tipo === 'exito' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: alerta.tipo === 'exito' ? '#22c55e' : '#ef4444',
          border: alerta.tipo === 'exito' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          padding: '0.75rem 1.5rem', 
          borderRadius: '8px', 
          fontSize: '0.9rem',
          fontWeight: '500', 
          zIndex: 100000, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          backdropFilter: 'blur(6px)'
        }}>
          <span>{alerta.tipo === 'exito' ? '✅' : '❌'}</span>
          {alerta.texto}
        </div>
      )}

        <div style={{ marginBottom: '1.5rem', width: '100%' }}>
            <Link 
                to={rutaInicio} 
                title="Volver al Inicio" // 👈 Esto activa el cartel flotante al poner el mouse
                style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.5rem',      // Hace la flecha un poco más grande y visible
                color: '#a78bfa',        // Color violeta combinando con tu diseño oscuro
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, color 0.2s ease',
                }}
                // Efecto para que se mueva sutilmente hacia la izquierda al pasar el mouse
                onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(-4px)';
                e.currentTarget.style.color = '#c084fc';
                }}
                onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.color = '#a78bfa';
                }}
            >
                🡠 
            </Link>
         </div>
      <div className={styles.topRow}>
        
        {/* COLUMNA IZQUIERDA: DATOS PERSONALES EDITABLES (Visible para Todos) */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Mis Datos Personales</h2>
          <form onSubmit={guardarDatosPersonales}>
            
            <div className={styles.row}>
              <div className={styles.datoGrupo}>
                <label>Nombre</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className={styles.datoGrupo}>
                <label>Apellido</label>
                <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
              </div>
            </div>

            <div className={styles.datoGrupo}>
              <label>Correo electrónico</label>
              <input type="email" value={email} readOnly required className={styles.inputBloqueado} />
            </div>

            <div className={styles.row}>
              <div className={styles.datoGrupo}>
                <label>Fecha de nacimiento</label>
                <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
              </div>
              <div className={styles.datoGrupo}>
                <label>Celular</label>
                <input type="tel" value={celular} onChange={(e) => setCelular(e.target.value)} />
              </div>
            </div>

            <div className={styles.sectionLabel} style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontWeight: '600', color: '#a78bfa' }}>
              Dirección
            </div>

            <div className={styles.row}>
              <div className={styles.datoGrupo} style={{ flex: 2 }}>
                <label>Calle</label>
                <input type="text" value={calle} onChange={(e) => setCalle(e.target.value)} />
              </div>
              <div className={styles.datoGrupo} style={{ flex: 1 }}>
                <label>Número</label>
                <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)}/>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.datoGrupo}>
                <label>Piso</label>
                <input type="text" value={piso} onChange={(e) => setPiso(e.target.value)} />
              </div>
              <div className={styles.datoGrupo}>
                <label>Depto.</label>
                <input type="text" value={depto} onChange={(e) => setDepto(e.target.value)} />
              </div>
            </div>

            <button type="submit" className={styles.btnPrimary} style={{ marginTop: '1rem' }}>
              Guardar Cambios
            </button>
          </form>
        </div>

        {/* CONDICIONAL: COLUMNA DERECHA DEL APTO FÍSICO SOLO PARA EL CLIENTE */}
        {rolUsuario === 'client' && (
          <div className={styles.card} style={{ alignSelf: 'flex-start' }}>
            <h2 className={styles.cardTitle}>📄 Estado de Apto Físico</h2>
            <p className={styles.descripcion}>Es obligatorio presentar el apto firmado para asistir al centro.</p>

            {(estadoApto === 'NO_SUBIDO' || estadoApto === 'RECHAZADO') && (
              <form onSubmit={enviarApto} className={styles.formularioApto}>
                {estadoApto === 'RECHAZADO' && (
                  <div className={styles.alertaRechazo}>
                    <p><strong>❌ Rechazado:</strong> {motivoRechazo || "El documento no es legible."}</p>
                  </div>
                )}
      
                <div style={{ marginBottom: '15px' }}>
                  <input type="file" id="file-upload" accept=".pdf,image/*" onChange={manejarCambioArchivo} required style={{ display: 'none' }} />
                  <label htmlFor="file-upload" className={styles.btnSecondary} style={{ cursor: 'pointer', display: 'inline-block' }}>
                    {archivo ? '📄 Archivo cargado' : '🔍 Seleccionar Apto Físico'}
                  </label>
                  {archivo && (
                    <p style={{ marginTop: '5px', fontSize: '13px', color: '#868e96' }}>
                      <strong>Seleccionado:</strong> {archivo.name}
                    </p>
                  )}
                </div>

                <button type="submit" className={styles.btnPrimary} disabled={!archivo}>
                  Subir Apto Físico
                </button>
              </form>
            )}

            {estadoApto === 'PENDIENTE' && (
              <div className={`${styles.estadoCaja} ${styles.pendiente}`}>
                <span className={styles.iconoReloj}>⏳</span>
                <h4>En revisión</h4>
                <p>El administrativo está verificando tu documento.</p>
              </div>
            )}

            {estadoApto === 'APROBADO' && (
              <div className={`${styles.estadoCaja} ${styles.aprobado}`}>
                <span className={styles.iconoCheck}>✅</span>
                <h4>Apto Aprobado</h4>
                <p>Estás habilitado para asistir al centro.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default MiPerfil;