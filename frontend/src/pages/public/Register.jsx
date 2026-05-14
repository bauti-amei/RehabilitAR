import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerRequest } from '../../api/auth'
import styles from './Register.module.css'

const INITIAL_FORM = {
  email:          '',
  password:       '',
  first_name:     '',
  last_name:      '',
  phone:          '',
  birth_date:     '',
  address:        '',
  address_number: '',
  address_floor:  '',
  address_apt:    '',
}

export default function Register() {
  const navigate = useNavigate()

  const [form, setForm]       = useState(INITIAL_FORM)
  const [dniFile, setDniFile] = useState(null)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFileChange = (e) => {
    setDniFile(e.target.files[0] ?? null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!dniFile) {
      setError('Por favor, complete todos los campos.')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, value]) => formData.append(key, value))
      formData.append('dni_photo', dniFile)

      await registerRequest(formData)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Error al registrarse. Intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.leftSide}>
          <h1 className={styles.logo}>Rehabilitar</h1>
          <p className={styles.subtitle}>Centro de kinesiología</p>
        </div>
        <div className={styles.rightSide}>
          <div className={styles.card}>
            <h2 className={styles.title}>¡Registro exitoso!</h2>
            <p className={styles.text}>Tu cuenta fue creada. Ya podés iniciar sesión.</p>
            <button className={styles.button} onClick={() => navigate('/login')}>
              Ir al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.leftSide}>
        <h1 className={styles.logo}>Rehabilitar</h1>
        <p className={styles.subtitle}>Centro de kinesiología</p>
        <p className={styles.description}>
          Creá tu cuenta para acceder a clases y seguir tu progreso.
        </p>
      </div>

      <div className={styles.rightSide}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <h2 className={styles.title}>Crear cuenta</h2>
          <p className={styles.text}>Completá todos los campos para registrarte</p>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Nombre</label>
              <input
                type="text"
                name="first_name"
                placeholder="Juan"
                value={form.first_name}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Apellido</label>
              <input
                type="text"
                name="last_name"
                placeholder="Pérez"
                value={form.last_name}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>Correo electrónico</label>
            <input
              type="email"
              name="email"
              placeholder="ejemplo@mail.com"
              value={form.email}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label>Contraseña</label>
            <input
              type="password"
              name="password"
              placeholder="Mínimo 8 caracteres, letras y números"
              value={form.password}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Fecha de nacimiento</label>
              <input
                type="date"
                name="birth_date"
                value={form.birth_date}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Celular</label>
              <input
                type="tel"
                name="phone"
                placeholder="1234567890"
                value={form.phone}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>
          </div>

          <div className={styles.sectionLabel}>Dirección</div>

          <div className={styles.row}>
            <div className={`${styles.field} ${styles.grow}`}>
              <label>Calle</label>
              <input
                type="text"
                name="address"
                placeholder="Avenida 60"
                value={form.address}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Número</label>
              <input
                type="text"
                name="address_number"
                placeholder="385"
                value={form.address_number}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Piso</label>
              <input
                type="text"
                name="address_floor"
                placeholder="18"
                value={form.address_floor}
                onChange={handleChange}
                className={styles.input}
              />
            </div>
            <div className={styles.field}>
              <label>Depto.</label>
              <input
                type="text"
                name="address_apt"
                placeholder="A"
                value={form.address_apt}
                onChange={handleChange}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>Foto del DNI</label>
            <label className={styles.fileLabel}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className={styles.fileInput}
                required
              />
              <span className={styles.fileText}>
                {dniFile ? dniFile.name : 'Seleccionar imagen del DNI'}
              </span>
            </label>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </button>

          <p className={styles.loginLink}>
            ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
