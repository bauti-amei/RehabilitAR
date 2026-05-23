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

export const asignarProfesorRequest = (claseId, profesorId) =>
  api.patch(`/clases/${claseId}/asignar-profesor/`, { profesor_id: profesorId })
