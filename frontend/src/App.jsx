import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ROLES } from './utils/roles'

// Common
import ProtectedRoute from './components/common/ProtectedRoute'
import Layout        from './components/common/Layout'

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
        <Routes>

          {/* Rutas públicas */}
          <Route path="/login"       element={<Login />} />
          <Route path="/register"    element={<Register />} />
          <Route path="/sin-permiso" element={<Unauthorized />} />

          {/* Rutas autenticadas con layout (sidebar) */}
          <Route element={<Layout />}>

            {/* Admin */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            {/* Más rutas de admin se agregan aquí */}

            {/* Profesor */}
            <Route path="/teacher" element={
              <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
                <TeacherDashboard />
              </ProtectedRoute>
            } />

            {/* Recepcionista */}
            <Route path="/receptionist" element={
              <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}>
                <ReceptionistDashboard />
              </ProtectedRoute>
            } />

            {/* Cliente */}
            <Route path="/client" element={
              <ProtectedRoute allowedRoles={[ROLES.CLIENT]}>
                <ClientDashboard />
              </ProtectedRoute>
            } />

          </Route>

          {/* Redirigir raíz al login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
