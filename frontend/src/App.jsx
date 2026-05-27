import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ROLES } from './utils/roles'
import { Toaster } from 'react-hot-toast'

// Common
import ProtectedRoute from './components/common/ProtectedRoute'
import PublicRoute    from './components/common/PublicRoute'
import Layout         from './components/common/Layout'
import ClientLayout   from './components/client/ClientLayout'
import AdminLayout    from './components/admin/AdminLayout'
import TeacherLayout  from './components/teacher/TeacherLayout'
import ReceptionistLayout from './components/receptionist/ReceptionistLayout'
import ChangePassword from './pages/client/ChangePassword'
import MiPerfil from './components/common/MiPerfil'

// Public
import Login        from './pages/public/Login'
import Register     from './pages/public/Register'
import Unauthorized from './pages/public/Unauthorized'

// Admin
import AdminDashboard from './pages/admin/Dashboard'

// Teacher
import TeacherDashboard from './pages/teacher/Dashboard'

// Receptionist
import ReceptionistDashboard from './pages/receptionist/Dashboard'

// Client
import ClientDashboard from './pages/client/Dashboard'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster />
        <Routes>

          {/* Rutas públicas */}
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/sin-permiso" element={<Unauthorized />} />

          {/* Ruta de cambio de contraseña */}
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/cambiar-contrasena" element={<ChangePassword />} />
          </Route>

          {/* Rutas del admin — layout con navbar superior */}
          <Route element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/perfil" element={<MiPerfil />} />
          </Route>

          {/* Rutas del profesor — layout con navbar superior */}
          <Route element={
            <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
              <TeacherLayout />
            </ProtectedRoute>
          }>
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/perfil" element={<MiPerfil />} />
          </Route>

          {/* Rutas del recepcionista — layout con navbar superior */}
          <Route element={
            <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}>
              <ReceptionistLayout />
            </ProtectedRoute>
          }>
            <Route path="/receptionist" element={<ReceptionistDashboard />} />
            <Route path="/receptionist/perfil" element={<MiPerfil />} />
          </Route>

          {/* Rutas del cliente — layout con navbar superior */}
          <Route element={
            <ProtectedRoute allowedRoles={[ROLES.CLIENT]}>
              <ClientLayout />
            </ProtectedRoute>
          }>
            <Route path="/client" element={<ClientDashboard />} />
            <Route path="/client/perfil" element={<MiPerfil />} />
          </Route>

          {/* Redirigir raíz al login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
