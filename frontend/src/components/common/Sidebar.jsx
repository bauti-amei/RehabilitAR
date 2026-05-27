import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../utils/roles'
import styles from './Sidebar.module.css'

/* Íconos SVG inline simples */
const Icon = ({ d }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const NAV_ITEMS = {
  [ROLES.ADMIN]: [
    { to: '/admin',            label: 'Dashboard',   icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
    { to: '/admin/clases',     label: 'Clases',       icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
    { to: '/admin/usuarios',   label: 'Usuarios',     icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
    { to: '/admin/reportes',   label: 'Reportes',     icon: 'M18 20V10M12 20V4M6 20v-6' },
    { to: '/admin/suspensiones', label: 'Suspensiones', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { to: '/admin/perfil',     label: 'Mi perfil',    icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
  ],
  [ROLES.TEACHER]: [
    { to: '/teacher',          label: 'Mis clases',   icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
    { to: '/teacher/asistencia', label: 'Asistencia', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { to: '/teacher/perfil',   label: 'Mi perfil',    icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
  ],
  [ROLES.RECEPTIONIST]: [
    { to: '/receptionist',     label: 'Dashboard',   icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
    { to: '/receptionist/registrar', label: 'Registrar cliente', icon: 'M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12.5 7a4 4 0 110 8 4 4 0 010-8zM20 8v6M23 11h-6' },
    { to: '/receptionist/pagos', label: 'Pagos',     icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { to: '/receptionist/perfil', label: 'Mi perfil', icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
  ],
  [ROLES.CLIENT]: [
    { to: '/client',           label: 'Inicio',       icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
    { to: '/client/reservas',  label: 'Mis reservas', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { to: '/client/suscripcion', label: 'Suscripción', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
    { to: '/client/perfil',    label: 'Mi perfil',    icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
  ],
}

const ROLE_LABELS = {
  [ROLES.ADMIN]:        'Administrador',
  [ROLES.TEACHER]:      'Profesor',
  [ROLES.RECEPTIONIST]: 'Recepcionista',
  [ROLES.CLIENT]:       'Cliente',
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const items = NAV_ITEMS[user?.role] ?? []
  const [confirmar, setConfirmar] = useState(false)

  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
    {/* Modal de confirmación */}
    {confirmar && (
      <div className={styles.logoutOverlay}>
        <div className={styles.logoutModal}>
          <p className={styles.logoutPregunta}>¿Está seguro que desea cerrar sesión?</p>
          <div className={styles.logoutBtns}>
            <button className={styles.logoutSi} onClick={handleLogout}>Sí</button>
            <button className={styles.logoutNo} onClick={() => setConfirmar(false)}>No</button>
          </div>
        </div>
      </div>
    )}
    <aside className={styles.sidebar}>
      {/* Logo + nombre del sistema */}
      <div className={styles.brand}>
        <div className={styles.brandDot} />
        <span className={styles.brandName}>Rehabilitar</span>
      </div>

      {/* Info del usuario */}
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className={styles.userName}>{user?.name}</p>
          <span className={`badge badge-primary ${styles.roleBadge}`}>
            {ROLE_LABELS[user?.role]}
          </span>
        </div>
      </div>

      {/* Navegación */}
      <nav className={styles.nav}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split('/').length <= 2}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <Icon d={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button className={styles.logoutBtn} onClick={() => setConfirmar(true)}>
        <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        Cerrar sesión
      </button>
            {/* 🚪 MODAL PERSONALIZADO DE CERRAR SESIÓN */}
      {mostrarConfirmacion && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#1e1e2f', // Fondo oscuro como tus tarjetas
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.25rem' }}>
              ¿Estás seguro de que deseas cerrar sesión?
            </h3>
            <p style={{ color: '#868e96', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Tendrás que volver a ingresar tus credenciales para acceder.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              
              {/* Botón Cancelar */}
              <button 
                onClick={() => setMostrarConfirmacion(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '0.6rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancelar
              </button>

              {/* Botón Confirmar Salida */}
              <button 
                onClick={confirmarLogout}
                style={{
                  background: '#ef4444', // Rojo alerta
                  color: 'white',
                  border: 'none',
                  padding: '0.6rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                }}
              >
                Cerrar Sesión
              </button>

            </div>
          </div>
        </div>
      )}
    </aside>
    </>
  )
}