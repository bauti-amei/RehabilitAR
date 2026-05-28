import styles from './LoadingOverlay.module.css'

export default function LoadingOverlay({ mensaje = 'Cargando' }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <img
          src="/runner.png"
          alt="Cargando"
          className={styles.runner}
        />
        <div className={styles.shadow} />
        <p className={styles.texto}>
          {mensaje}
          <span className={styles.dots}>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
      </div>
    </div>
  )
}
