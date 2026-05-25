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
