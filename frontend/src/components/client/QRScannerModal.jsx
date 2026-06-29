import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { validarQrRequest } from '../../api/clases'

export default function QRScannerModal({ onClose, onSuccess }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const streamRef = useRef(null)

  const [estado, setEstado]     = useState('escaneando') // 'escaneando' | 'ok' | 'error'
  const [mensaje, setMensaje]   = useState('')
  const [enviando, setEnviando] = useState(false)
  const scannedRef              = useRef(false)

  useEffect(() => {
    let active = true

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        videoRef.current.srcObject = stream
        videoRef.current.play()
        scan()
      })
      .catch(() => {
        setEstado('error')
        setMensaje('No se pudo acceder a la cámara.')
      })

    function scan() {
      if (!active) return
      rafRef.current = requestAnimationFrame(() => {
        const video  = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || scannedRef.current) return
        if (video.readyState !== video.HAVE_ENOUGH_DATA) { scan(); return }

        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (code && code.data) {
          scannedRef.current = true
          handleToken(code.data)
        } else {
          scan()
        }
      })
    }

    return () => {
      active = false
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const handleToken = async (token) => {
    stopCamera()
    setEnviando(true)
    try {
      const res = await validarQrRequest(token)
      const codigo = res.data.codigo
      if (codigo === 'ok') {
        setEstado('ok')
        setMensaje(res.data.detail)
      } else {
        setEstado('info')
        setMensaje(res.data.detail)
      }
    } catch (e) {
      setEstado('error')
      const codigo = e?.response?.data?.codigo
      const status = e?.response?.status
      if (status === 404) {
        setMensaje('Error en el QR')
      } else if (codigo === 'clase_finalizada') {
        setMensaje('Error QR vencido')
      } else {
        setMensaje(e?.response?.data?.detail || 'Error al registrar asistencia.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,31,23,0.75)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999,
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(160deg,#e8f5ee,#daeee3)',
        border: '1px solid #b8dece', borderRadius: '20px',
        padding: '1.5rem 1.75rem', width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: '#0f1f17', fontWeight: 700, margin: 0 }}>Escanear QR</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#3d6b55' }}>✕</button>
        </div>

        {estado === 'escaneando' && (
          <>
            <p style={{ color: '#3d6b55', fontSize: '0.88rem', marginBottom: '0.75rem', textAlign: 'center' }}>
              Apuntá la cámara al código QR del profesor.
            </p>
            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
              <video ref={videoRef} style={{ width: '100%', display: 'block', maxHeight: '280px', objectFit: 'cover' }} playsInline muted />
              {/* viewfinder overlay */}
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: '180px', height: '180px',
                  border: '3px solid rgba(26,157,133,0.9)',
                  borderRadius: '12px',
                  boxShadow: '0 0 0 1000px rgba(0,0,0,0.35)',
                }} />
              </div>
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {enviando && <p style={{ textAlign: 'center', color: '#3d6b55', marginTop: '0.75rem', fontSize: '0.88rem' }}>Verificando...</p>}
          </>
        )}

        {(estado === 'ok' || estado === 'info' || estado === 'error') && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              {estado === 'ok' ? '✅' : estado === 'info' ? 'ℹ️' : '❌'}
            </p>
            <p style={{ color: '#1a2e25', fontWeight: 700, marginBottom: '0.4rem', fontSize: '1rem' }}>
              {estado === 'ok' ? 'Asistencia registrada' : estado === 'info' ? 'Aviso' : 'Error'}
            </p>
            <p style={{ color: '#3d6b55', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{mensaje}</p>
            <button
              onClick={() => estado === 'ok' ? onSuccess?.() : onClose()}
              style={{ padding: '0.65rem 2rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#1a9d85,#147a68)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}
            >
              Aceptar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
