import api from './axios'

export const getClasesRequest = () =>
  api.get('/clases/')

export const getClasesEnCursoRequest = () =>
  api.get('/clases/en-curso/')
