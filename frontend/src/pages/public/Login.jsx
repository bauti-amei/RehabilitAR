import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { loginRequest } from '../../api/auth'
import { HOME_BY_ROLE } from '../../utils/roles'
import CalendarioPublico from './CalendarioPublico'
import styles from './Login.module.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [verClases, setVerClases] = useState(false)
  const [verPass,  setVerPass]  = useState(false)

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

        <button
          className={styles.verClasesBtn}
          onClick={() => setVerClases(true)}
        >
          <span className={styles.verClasesBtnIcon}>📅</span>
          Ver clases disponibles
          <span className={styles.verClasesBtnArrow}>→</span>
        </button>
      </div>

      {verClases && (
        <CalendarioPublico onClose={() => setVerClases(false)} />
      )}

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
            <div className={styles.passwordWrap}>
              <input
                type={verPass ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className={styles.input}
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setVerPass(v => !v)}>
                {verPass ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
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

          <p className={styles.registerLink}>
            ¿No tenés cuenta? <Link to="/register">Registrate</Link>
          </p>
        </form>
      </div>
    </div>
  )
}