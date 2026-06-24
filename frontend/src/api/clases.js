import api from './axios'

export const getClasesRequest = () =>
  api.get('/clases/')

export const getClasesEnCursoRequest = () =>
  api.get('/clases/en-curso/')

export const getClasesPublicasRequest = () =>
  api.get('/clases/publicas/')

export const getSalasRequest = () =>
  api.get('/clases/salas/')

export const createSalaRequest = (data) =>
  api.post('/clases/salas/', data)

export const createClaseRequest = (data) =>
  api.post('/clases/', data)

export const getProfesoresPorEspecialidadRequest = (especialidad, { tipo_clase = '', dia = '', fecha = '', horario_inicio = '', horario_fin = '' } = {}) => {
  const params = new URLSearchParams({ especialidad, tipo_clase, dia, fecha, horario_inicio, horario_fin })
  return api.get(`/clases/profesores/?${params}`)
}

export const getMisClasesRequest = () =>
  api.get('/clases/mis-clases/')

export const getClasesOfertadasRequest = () =>
  api.get('/clases/ofertadas/')

export const asignarseClaseRequest = (id) =>
  api.post(`/clases/${id}/asignarse/`)

export const desasignarseClaseRequest = (id) =>
  api.post(`/clases/${id}/desasignarse/`)

export const asignarProfesorRequest = (claseId, profesorId) =>
  api.patch(`/clases/${claseId}/asignar-profesor/`, { profesor_id: profesorId })

export const desasignarProfesorRequest = (claseId) =>
  api.patch(`/clases/${claseId}/desasignar-profesor/`)

// Suscripciones
export const getClasesFijasRequest = (mes, anio) =>
  api.get(`/clases/fijas/${mes && anio ? `?mes=${mes}&anio=${anio}` : ''}`)

export const calcularSuscripcionRequest = (clase_id, mes, anio) =>
  api.get(`/clases/suscripciones/calcular/?clase_id=${clase_id}&mes=${mes}&anio=${anio}`)

export const pagarSuscripcionRequest = (data) =>
  api.post('/clases/suscripciones/pagar/', data)

export const getMisReservasRequest = (mes, anio) =>
  api.get(`/clases/suscripciones/mis-reservas/?mes=${mes}&anio=${anio}`)

export const getClasesParaReprogramarRequest = (especialidad, fecha) =>
  api.get(`/clases/suscripciones/reprogramar/?especialidad=${especialidad}&fecha=${fecha}`)

export const getMisSuscripcionesRequest = () =>
  api.get('/clases/suscripciones/mis-suscripciones/')

// Reserva única
export const getClasesParaReservarRequest = (mes, anio) =>
  api.get(`/clases/para-reservar/?mes=${mes}&anio=${anio}`)

export const reservarClaseUnicaRequest = (data) =>
  api.post('/clases/reservar-unica/', data)

export const pagarSaldoReservaRequest = (id, datosPago) =>
  api.post(`/clases/pagar-saldo-reserva/${id}/`, { datos_pago: datosPago })

// Canje de créditos
export const getClasesParaCanjearRequest = (especialidad, mes, anio) =>
  api.get(`/clases/clases-para-canjear/?especialidad=${especialidad}&mes=${mes}&anio=${anio}`)

export const canjearCreditoRequest = (data) =>
  api.post('/clases/canjear-credito/', data)

// Lista de espera por fecha (admin)
export const getListaEsperaFechasRequest = (claseId) =>
  api.get(`/clases/${claseId}/lista-espera/`)

export const getListaEsperaUsuariosRequest = (claseId, fecha) =>
  api.get(`/clases/${claseId}/lista-espera/?fecha=${fecha}`)

// Cancelaciones y créditos (cliente)
export const getMisCreditosRequest = () =>
  api.get('/clases/mis-creditos/')

export const cancelarReservaUnicaRequest = (id) =>
  api.post(`/clases/cancelar-reserva-unica/${id}/`)

export const cancelarClaseSuscripcionRequest = (reservaId) =>
  api.post(`/clases/cancelar-clase-suscripcion/${reservaId}/`)

export const cancelarSuscripcionRequest = (id) =>
  api.post(`/clases/cancelar-suscripcion/${id}/`)

// Cambiar turno (cliente)
export const getClasesDisponiblesParaCambioRequest = (suscripcionId) =>
  api.get(`/clases/mis-suscripciones/${suscripcionId}/clases-disponibles/`)

export const cambiarTurnoRequest = (suscripcionId, nuevaClaseId) =>
  api.post(`/clases/mis-suscripciones/${suscripcionId}/cambiar-turno/`, { nueva_clase_id: nuevaClaseId })

// Cambiar capacidad (admin)
export const cambiarCapacidadRequest = (id, cupo) =>
  api.patch(`/clases/${id}/cambiar-capacidad/`, { cupo })

// Asistencia (admin)
export const getInscriptosAsistenciaRequest = (claseId) =>
  api.get(`/clases/${claseId}/inscriptos-asistencia/`)

export const registrarAsistenciaRequest = (claseId, usuarioId) =>
  api.post(`/clases/${claseId}/registrar-asistencia/`, { usuario_id: usuarioId })

// QR asistencia
export const getQrAsistenciaRequest = (claseId) =>
  api.get(`/clases/${claseId}/qr/`)

export const validarQrRequest = (token) =>
  api.post('/clases/validar-qr/', { token })

export const getMiAsistenciaRequest = (claseId) =>
  api.get(`/clases/${claseId}/mi-asistencia/`)
