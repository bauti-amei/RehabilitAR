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

// ── Suscripciones del cliente ─────────────────────────────
export const getMisSuscripcionesRequest = () =>
  api.get('/clases/mis-suscripciones/')

export const cancelarSuscripcionRequest = (id) =>
  api.post(`/clases/mis-suscripciones/${id}/cancelar/`)

export const cambiarTurnoRequest = (id, claseId) =>
  api.patch(`/clases/mis-suscripciones/${id}/cambiar-turno/`, { clase_id: claseId })

export const getClasesDisponiblesParaCambioRequest = (id) =>
  api.get(`/clases/mis-suscripciones/${id}/clases-disponibles/`)

// ── Lista de espera (admin) ───────────────────────────────
export const getListaEsperaRequest = (id) =>
  api.get(`/clases/${id}/lista-espera/`)

// ── Cambiar capacidad (admin) ─────────────────────────────
export const cambiarCapacidadRequest = (id, cupo) =>
  api.patch(`/clases/${id}/cambiar-capacidad/`, { cupo })
