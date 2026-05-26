import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './AdminLayout.module.css'

/* ── Íconos ──────────────────────────────────────────────── */
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
)

const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
)

const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

/* ── Modal genérico ──────────────────────────────────────── */
function Modal({ title, onClose, children, small }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        
        {/* Cabecera del modal modificada */}
        <div className={styles.modalHeader} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
          <h3 className={styles.modalTitle} style={{ fontSize: '1.4rem', textAlign: 'center', margin: '0 auto', width: '100%', paddingRight: '20px' }}>
            {title}
          </h3>
          <button className={styles.closeBtn} onClick={onClose} style={{ position: 'absolute', right: '0', top: '0' }}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>{children}</div>
      </div>
      </div>
  )
}

/* ── Notificaciones vacías ───────────────────────────────── */
const NOTIFICACIONES = []

/* ── AdminLayout ─────────────────────────────────────────── */
export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [modal, setModal]           = useState(null) // 'notifications' | 'settings' | 'cambiarRol'
  const [userMenuOpen, setUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openModal = (name) => { setModal(name); setUserMenu(false) }
  const pedirLogout = () => { setUserMenu(false); setModal('logout') }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?'

  const noLeidas = NOTIFICACIONES.filter(n => !n.leida).length

  const ROLES_DISPONIBLES = [
    { label: 'Administrador', value: 'admin',        emoji: '🛡️', current: true },
    { label: 'Profesor',      value: 'teacher',      emoji: '📋', current: false },
    { label: 'Recepcionista', value: 'receptionist', emoji: '🗂️', current: false },
  ]

  const ejecutarLogoutDefinitivo = () => {
    logout()
    navigate('/login')
  }
  
  return (
    <div className={styles.wrapper}>

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <span className={styles.brand}>RehabilitAR</span>
          <span className={styles.roleTag}>ADMINISTRADOR</span>
        </div>

        <div className={styles.navActions}>

          {/* Notificaciones */}
          <button className={styles.iconBtn} onClick={() => openModal('notifications')}>
            <BellIcon />
            <span className={styles.iconLabel}>Notificación</span>
            {noLeidas > 0 && <span className={styles.badge}>{noLeidas}</span>}
          </button>

          {/* Configuración */}
          <button className={styles.iconBtn} onClick={() => openModal('settings')}>
            <GearIcon />
            <span className={styles.iconLabel}>Configuración</span>
          </button>

          {/* Usuario */}
          <div className={styles.userMenu} ref={userMenuRef}>
            <button className={styles.userBtn} onClick={() => setUserMenu(v => !v)}>
              <div className={styles.avatar}>{initials}</div>
              <span className={styles.userName}>{user?.first_name}</span>
              <span className={`${styles.chevron} ${userMenuOpen ? styles.chevronOpen : ''}`}>
                <ChevronIcon />
              </span>
            </button>

            {userMenuOpen && (
              <div className={styles.dropdown}>
                <button className={styles.dropItem} onClick={() => {
                  setUserMenu(false);
                  navigate('/admin/perfil');
                }}>
                  <span>👤</span> Mi perfil
                </button>
                <button className={styles.dropItem} onClick={() => {
                  setUserMenu(false);
                  navigate('/admin/cambiar-contrasena');
                }}>
                  <span>🔒</span> Cambiar contraseña
                </button>
                <div className={styles.dropDivider} />
                <button className={`${styles.dropItem} ${styles.dropLogout}`} onClick={() => {
                  setUserMenu(false);
                  setModal('logout');
                }}>
                  <span>🚪</span> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MODALES ────────────────────────────────────────── */}

      {modal === 'cambiarRol' && (
        <Modal title="Cambiar rol" onClose={() => setModal(null)} small>
          <p className={styles.cambiarRolDesc}>
            Seleccioná el rol con el que querés operar:
          </p>
          <div className={styles.rolesList}>
            {ROLES_DISPONIBLES.map(r => (
              <button
                key={r.value}
                className={`${styles.roleOption} ${r.current ? styles.roleOptionActive : ''}`}
                onClick={() => setModal(null)}   // funcionalidad pendiente
              >
                <span className={styles.roleEmoji}>{r.emoji}</span>
                <span className={styles.roleLabel}>{r.label}</span>
                {r.current && <span className={styles.roleCurrentTag}>Actual</span>}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modal === 'logout' && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={`${styles.modal} ${styles.modalSmall}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalBody} style={{ textAlign: 'center', padding: '1.5rem' }}>
              <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'white', marginBottom: '1.5rem' }}>
                ¿Está seguro que desea cerrar sesión?
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button onClick={ejecutarLogoutDefinitivo} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}>Sí</button>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#c8cbdf', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}>No</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'notifications' && (
        <Modal title="Notificaciones" onClose={() => setModal(null)}>
          <p className={styles.emptyMsg}>No tenés notificaciones nuevas.</p>
        </Modal>
      )}

      {modal === 'settings' && (
        <Modal title="Configuración" onClose={() => setModal(null)}>
          <p className={styles.emptyMsg}>Próximamente podés configurar tus preferencias aquí.</p>
        </Modal>
      )}
      {modal === 'logout' && (
      <Modal title="Deseas cerrar sesión en RehabilitAR?" onClose={() => setModal(null)}>
        

        <div style={{ textAlign: 'center', padding: '0.5rem' }}>
          <p style={{ color: '#868e96', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Tendrás que volver a ingresar tus credenciales para acceder al centro.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            
            {/* Botón Cancelar */}
            <button 
              onClick={() => setModal(null)}
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

            {/* Botón Confirmar */}
            <button 
              onClick={ejecutarLogoutDefinitivo}
              style={{
                background: '#ef4444', 
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
            </Modal>
          )}

      {/* ── CONTENIDO ──────────────────────────────────────── */}
      <main className={styles.main}>
        <Outlet />
      </main>

    </div>
  )
}
