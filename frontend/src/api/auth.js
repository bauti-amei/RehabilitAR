import api from './axios'

export const loginRequest = (email, password) =>
  api.post('/auth/login/', { email, password })

export const getMeRequest = () =>
  api.get('/auth/me/')

export const registerRequest = (formData) =>
  api.post('/auth/register/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const getUsersRequest = () =>
  api.get('/auth/users/')

export const adminRegisterRequest = (data) =>
  api.post('/auth/admin-register/', data)

export const suspenderUserRequest = (id, reason) =>
  api.delete(`/auth/users/${id}/`, { data: { reason } });

export const hardDeleteUserRequest = (id) =>
  api.delete(`/clases/users/${id}/hard-delete/`);

export const updateProfileRequest = (datosActualizados) =>
  api.put('/auth/me/', datosActualizados);

export const logoutRequest = (refreshToken) =>
  api.post('/auth/logout/', { refresh: refreshToken });

export const getAptosPendientesRequest = () =>
  api.get('/auth/aptos/pendientes/')

export const validarAptoFisicoRequest = (id, accion, motivoRechazo = '') =>
  api.post(`/auth/aptos/${id}/validar/`, {
    accion,
    motivo_rechazo: motivoRechazo
  })

export const subirAptoFisicoRequest = (formData) =>
  api.post('/auth/aptos/subir/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

export const solicitarCodigoRequest = (email) =>
  api.post('/auth/recuperar-password/', { email })

export const verificarCodigoRequest = (email, codigo) =>
  api.post('/auth/verificar-codigo/', { email, codigo })

export const nuevaPasswordRequest = (email, codigo, password) =>
  api.post('/auth/nueva-password/', { email, codigo, password })
