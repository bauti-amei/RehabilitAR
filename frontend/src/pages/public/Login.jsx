import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { loginRequest, solicitarCodigoRequest, verificarCodigoRequest, nuevaPasswordRequest } from '../../api/auth'
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

  // Recuperar contraseña
  const [recuperar, setRecuperar] = useState(false)
  const [recuPaso,  setRecuPaso]  = useState(1)
  const [recuEmail, setRecuEmail] = useState('')
  const [recuCodigo, setRecuCodigo] = useState('')
  const [recuPass,  setRecuPass]  = useState('')
  const [recuError, setRecuError] = useState('')
  const [recuOk,    setRecuOk]    = useState('')
  const [recuLoading, setRecuLoading] = useState(false)
  const [verRecuPass, setVerRecuPass] = useState(false)

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

  const abrirRecuperar = () => {
    setRecuperar(true)
    setRecuPaso(1)
    setRecuEmail('')
    setRecuCodigo('')
    setRecuPass('')
    setRecuError('')
    setRecuOk('')
  }

  const cerrarRecuperar = () => {
    setRecuperar(false)
  }

  const handleEnviarCodigo = async (e) => {
    e.preventDefault()
    setRecuError('')
    setRecuLoading(true)
    try {
      await solicitarCodigoRequest(recuEmail.trim().toLowerCase())
      setRecuPaso(2)
    } catch (err) {
      setRecuError(err.response?.data?.detail ?? 'Ocurrio un error, intente nuevamente.')
    } finally {
      setRecuLoading(false)
    }
  }

  const handleVerificarCodigo = async (e) => {
    e.preventDefault()
    setRecuError('')
    setRecuLoading(true)
    try {
      await verificarCodigoRequest(recuEmail.trim().toLowerCase(), recuCodigo.trim())
      setRecuPaso(3)
    } catch (err) {
      setRecuError(err.response?.data?.detail ?? 'Código inválido.')
    } finally {
      setRecuLoading(false)
    }
  }

  const handleNuevaPassword = async (e) => {
    e.preventDefault()
    setRecuError('')
    setRecuLoading(true)
    try {
      await nuevaPasswordRequest(recuEmail.trim().toLowerCase(), recuCodigo.trim(), recuPass)
      setRecuOk('Se restablecio la contraseña con exito.')
      setRecuPaso(4)
    } catch (err) {
      setRecuError(err.response?.data?.detail ?? 'Ocurrio un error, intente nuevamente.')
    } finally {
      setRecuLoading(false)
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

          <div className={styles.forgotWrap}>
            <button type="button" className={styles.forgotBtn} onClick={abrirRecuperar}>
              ¿Olvidaste tu contraseña?
            </button>
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

      {recuperar && (
        <div className={styles.modalOverlay} onClick={cerrarRecuperar}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={cerrarRecuperar}>✕</button>

            <h3 className={styles.modalTitle}>Recuperar contraseña</h3>

            {recuPaso === 1 && (
              <form onSubmit={handleEnviarCodigo}>
                <p className={styles.modalText}>
                  Ingresá tu correo electrónico y te enviaremos un código de verificación.
                </p>
                <div className={styles.field}>
                  <label>Correo electrónico</label>
                  <input
                    type="email"
                    placeholder="ejemplo@mail.com"
                    value={recuEmail}
                    onChange={e => setRecuEmail(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
                {recuError && <p className={styles.error}>{recuError}</p>}
                <button type="submit" className={styles.button} disabled={recuLoading}>
                  {recuLoading ? 'Enviando...' : 'Enviar código'}
                </button>
              </form>
            )}

            {recuPaso === 2 && (
              <form onSubmit={handleVerificarCodigo}>
                <p className={styles.modalText}>
                  Ingresá el código de 6 dígitos que enviamos a <strong>{recuEmail}</strong>.
                </p>
                <div className={styles.field}>
                  <label>Código de verificación</label>
                  <input
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={recuCodigo}
                    onChange={e => setRecuCodigo(e.target.value.replace(/\D/g, ''))}
                    className={styles.input}
                    required
                  />
                </div>
                {recuError && <p className={styles.error}>{recuError}</p>}
                <button type="submit" className={styles.button} disabled={recuLoading}>
                  {recuLoading ? 'Verificando...' : 'Verificar código'}
                </button>
                <button type="button" className={styles.backBtn} onClick={() => { setRecuPaso(1); setRecuError('') }}>
                  ← Volver
                </button>
              </form>
            )}

            {recuPaso === 3 && (
              <form onSubmit={handleNuevaPassword}>
                <p className={styles.modalText}>
                  Ingresá tu nueva contraseña. Debe tener al menos 8 caracteres, incluyendo letras y números.
                </p>
                <div className={styles.field}>
                  <label>Nueva contraseña</label>
                  <div className={styles.passwordWrap}>
                    <input
                      type={verRecuPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={recuPass}
                      onChange={e => setRecuPass(e.target.value)}
                      className={styles.input}
                      required
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setVerRecuPass(v => !v)}>
                      {verRecuPass ? (
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
                {recuError && <p className={styles.error}>{recuError}</p>}
                <button type="submit" className={styles.button} disabled={recuLoading}>
                  {recuLoading ? 'Guardando...' : 'Restablecer contraseña'}
                </button>
              </form>
            )}

            {recuPaso === 4 && (
              <div>
                <p className={styles.successMsg}>{recuOk}</p>
                <button className={styles.button} onClick={cerrarRecuperar}>
                  Volver al inicio de sesión
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
