import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { loginRequest } from '../../api/auth'
import { HOME_BY_ROLE } from '../../utils/roles'
import styles from './Login.module.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      const { data } = await loginRequest(
        form.email,
        form.password
      )

      login(data.user, data.access)

      navigate(HOME_BY_ROLE[data.user.role] ?? '/')
    } catch (err) {
      setError(
        err.response?.data?.detail ??
          'Credenciales incorrectas. Intentá nuevamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.leftSide}>
        <h1 className={styles.logo}>Rehabilitar</h1>

        <p className={styles.subtitle}>
          Centro de kinesiología
        </p>

        <p className={styles.description}>
          Gestión integral de pacientes, clases
          y profesionales.
        </p>
      </div>

      <div className={styles.rightSide}>
        <form
          className={styles.card}
          onSubmit={handleSubmit}
        >
          <h2 className={styles.title}>
            Bienvenido
          </h2>

          <p className={styles.text}>
            Ingresá tus credenciales para continuar
          </p>

          <div className={styles.field}>
            <label>Correo electrónico</label>

            <input
              type="email"
              name="email"
              placeholder="ejemplo@mail.com"
              value={form.email}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label>Contraseña</label>

            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          {error && (
            <p className={styles.error}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className={styles.button}
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}