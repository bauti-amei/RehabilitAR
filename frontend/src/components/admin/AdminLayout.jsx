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
      <div
        className={`${styles.modal} ${small ? styles.modalSmall : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
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

  const handleLogout = () => { logout(); navigate('/login') }
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

  return (
    <div className={styles.wrapper}>

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <header className={styles.navbar}>
        <div className={styles.navLeft}>
          <span className={styles.brand}>RehabilitAR</span>
          <span className={styles.roleTag}>ADMINISTRADOR</span>
        </div>

        <div className={styles.navActions}>

          {/* Cambiar rol */}
          <button className={styles.cambiarRolBtn} onClick={() => openModal('cambiarRol')}>
            ⇄ Cambiar rol
          </button>

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
                <button className={styles.dropItem} onClick={() => navigate('/admin/perfil')}>
                  <span>👤</span> Mi perfil
                </button>
                <button className={styles.dropItem} onClick={() => navigate('/cambiar-contrasena')}>
                  <span>🔒</span> Cambiar contraseña
                </button>
                <div className={styles.dropDivider} />
                <button className={`${styles.dropItem} ${styles.dropLogout}`} onClick={pedirLogout}>
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
                <button onClick={handleLogout} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}>Sí</button>
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

      {/* ── CONTENIDO ──────────────────────────────────────── */}
      <main className={styles.main}>
        <Outlet />
      </main>

    </div>
  )
}
