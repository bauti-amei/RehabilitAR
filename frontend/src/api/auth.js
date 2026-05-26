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

export const deleteUserRequest = (id, reason) => {
  const token = localStorage.getItem('token'); // O como extraigas el token en tu app

  // Usamos la configuración expandida de Axios
  return api({
    method: 'delete',
    url: `auth/users/${id}/`,
    data: { reason: reason }, // <-- Acá viaja el motivo directo al request.data de Django
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};
 // api.delete(`/auth/users/${id}/`, {data: {reason}})

export const solicitarCodigoRequest = (email) =>
  api.post('/auth/recuperar-password/', { email })

export const verificarCodigoRequest = (email, codigo) =>
  api.post('/auth/verificar-codigo/', { email, codigo })

export const nuevaPasswordRequest = (email, codigo, password) =>
  api.post('/auth/nueva-password/', { email, codigo, password })
