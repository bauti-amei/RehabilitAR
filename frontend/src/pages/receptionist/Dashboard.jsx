import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getUsersRequest } from '../../api/auth'
import styles from './Dashboard.module.css'

/* ══════════════════════════════════════════════════════════
   MODAL GENÉRICO
   ══════════════════════════════════════════════════════════ */
function Modal({ title, onClose, children }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
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
   DASHBOARD PRINCIPAL
   ══════════════════════════════════════════════════════════ */
export default function ReceptionistDashboard() {
  const { user } = useAuth()

  const [clientes,  setClientes]  = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [busqueda,  setBusqueda]  = useState('')
  const [userModal, setUserModal] = useState(null)

  useEffect(() => {
    getUsersRequest()
      .then(res => {
        // Solo mostramos clientes
        const soloClientes = res.data.filter(u => u.role === 'client')
        setClientes(soloClientes)
      })
      .catch(() => setClientes([]))
      .finally(() => setCargando(false))
  }, [])

  const clientesFiltrados = clientes.filter(u => {
    const texto = busqueda.toLowerCase()
    return (
      u.email.toLowerCase().includes(texto) ||
      u.first_name.toLowerCase().includes(texto) ||
      u.last_name.toLowerCase().includes(texto)
    )
  })

  return (
    <div className={styles.container}>

      {/* Saludo */}
      <div className={styles.greeting}>
        <h1>Bienvenido, <span>{user?.first_name}</span> 👋</h1>
        <p>Panel de recepción — RehabilitAR</p>
      </div>

      {/* Sección clientes */}
      <section className={styles.section}>

        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Clientes</h2>
          <button className={styles.btnPrimary}>
            + Registrar nuevo usuario
          </button>
        </div>

        {/* Buscador */}
        <input
          className={styles.buscador}
          type="text"
          placeholder="Buscar usuario por nombre o mail..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />

        {/* Lista de clientes */}
        <div className={styles.clientesList}>
          {cargando ? (
            <p className={styles.noResultados}>Cargando clientes...</p>
          ) : clientesFiltrados.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>👥</span>
              <p>
                {clientes.length === 0
                  ? 'No hay clientes registrados aún'
                  : 'No se encontraron clientes con esa búsqueda'}
              </p>
            </div>
          ) : clientesFiltrados.map(u => (
            <div key={u.id} className={styles.clienteRow}>

              {/* Avatar */}
              <div className={styles.clienteAvatar}>
                {u.first_name?.[0]}{u.last_name?.[0]}
              </div>

              {/* Info */}
              <div className={styles.clienteInfo}>
                <button
                  className={styles.clienteNombre}
                  onClick={() => setUserModal(u)}
                >
                  {u.first_name} {u.last_name}
                </button>
                <p className={styles.clienteEmail}>{u.email}</p>
              </div>

              {/* Estado */}
              <span className={`${styles.estadoBadge} ${u.is_active ? styles.estadoActivo : styles.estadoSuspendido}`}>
                {u.is_active ? 'Activo' : 'Suspendido'}
              </span>

              {/* Acciones */}
              <div className={styles.clienteAcciones}>
                <button className={styles.btnRegistrarPago}>
                  Registrar pago
                </button>
                <button className={styles.btnVerMas} onClick={() => setUserModal(u)}>
                  Ver más
                </button>
              </div>

            </div>
          ))}
        </div>

      </section>

      {/* Modal detalle cliente */}
      {userModal && (
        <Modal
          title={`${userModal.first_name} ${userModal.last_name}`}
          onClose={() => setUserModal(null)}
        >
          <div className={styles.detalleGrid}>
            <span>Email</span>       <span>{userModal.email}</span>
            <span>Teléfono</span>    <span>{userModal.phone || '—'}</span>
            <span>Nacimiento</span>  <span>{userModal.birth_date || '—'}</span>
            <span>Estado</span>
            <span className={userModal.is_active ? styles.estadoActivo : styles.estadoSuspendido}>
              {userModal.is_active ? 'Activo' : 'Suspendido'}
            </span>
          </div>
          <button className={`${styles.btnRegistrarPago} ${styles.btnRegistrarPagoModal}`}>
            Registrar pago
          </button>
        </Modal>
      )}

    </div>
  )
}
