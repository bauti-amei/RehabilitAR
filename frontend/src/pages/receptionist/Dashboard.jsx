import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getUsersRequest, adminRegisterRequest } from '../../api/auth'
import styles from './Dashboard.module.css'

const FORM_VACIO = {
  first_name: '', last_name: '', email: '', password: '',
  birth_date: '', address: '', address_number: '',
  address_floor: '', address_apt: '', phone: '',
}

/* ══════════════════════════════════════════════════════════
   MODAL GENÉRICO
   ══════════════════════════════════════════════════════════ */
function Modal({ title, onClose, children, wide }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${wide ? styles.modalWide : ''}`} onClick={e => e.stopPropagation()}>
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

  // ── Modal registro ────────────────────────────────────────
  const [regModal,    setRegModal]   = useState(false)
  const [regForm,     setRegForm]    = useState(FORM_VACIO)
  const [regError,    setRegError]   = useState('')
  const [regOk,       setRegOk]      = useState(false)
  const [regCargando, setRegCarg]    = useState(false)

  const cargarClientes = () => {
    setCargando(true)
    getUsersRequest()
      .then(res => setClientes(res.data.filter(u => u.role === 'client')))
      .catch(() => setClientes([]))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargarClientes() }, [])

  const abrirRegModal = () => {
    setRegModal(true)
    setRegForm(FORM_VACIO)
    setRegError('')
    setRegOk(false)
  }

  const cambiarForm = e => setRegForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleRegistrar = async () => {
    const { first_name, last_name, email, password, birth_date, address, address_number, phone } = regForm
    if (!first_name || !last_name || !email || !password || !birth_date || !address || !address_number || !phone) {
      setRegError('Completá todos los campos obligatorios.')
      return
    }
    if (birth_date) {
      const hoy = new Date()
      const nac = new Date(birth_date)
      let edad  = hoy.getFullYear() - nac.getFullYear()
      const m   = hoy.getMonth() - nac.getMonth()
      if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
      if (edad < 18) { setRegError('El usuario debe ser mayor de edad.'); return }
    }
    setRegCarg(true); setRegError('')
    try {
      await adminRegisterRequest({ ...regForm, role: 'client' })
      setRegOk(true)
      cargarClientes()
    } catch (e) {
      setRegError(e.response?.data?.detail || 'Error, intente nuevamente.')
    } finally {
      setRegCarg(false)
    }
  }

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
          <button className={styles.btnPrimary} onClick={abrirRegModal}>
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

      {/* Modal registrar nuevo cliente */}
      {regModal && (
        <Modal
          title="Registrar nuevo cliente"
          onClose={() => setRegModal(false)}
          wide
        >
          {regOk ? (
            <div className={styles.regExito}>
              <span className={styles.regExitoIcon}>✅</span>
              <p>Cliente registrado correctamente.</p>
              <p className={styles.regExitoEmail}>Se envió un correo a <strong>{regForm.email}</strong></p>
              <button className={styles.btnPrimary} onClick={() => setRegModal(false)}>Cerrar</button>
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

              {regError && <p className={styles.msgError}>{regError}</p>}

              <div className={styles.formFooter}>
                <button className={styles.btnVolver} onClick={() => setRegModal(false)}>
                  Cancelar
                </button>
                <button className={styles.btnPrimary} onClick={handleRegistrar} disabled={regCargando}>
                  {regCargando ? 'Registrando...' : 'Crear cliente'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

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
