import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ROLES } from './utils/roles'

// Common
import ProtectedRoute from './components/common/ProtectedRoute'
import Layout         from './components/common/Layout'
import ClientLayout   from './components/client/ClientLayout'
import AdminLayout    from './components/admin/AdminLayout'
import TeacherLayout  from './components/teacher/TeacherLayout'
import PublicRoute    from './components/common/PublicRoute'

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
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/sin-permiso" element={<Unauthorized />} />

          {/* Rutas del admin — layout con navbar superior */}
          <Route element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          {/* Rutas del profesor — layout con navbar superior */}
          <Route element={
            <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
              <TeacherLayout />
            </ProtectedRoute>
          }>
            <Route path="/teacher" element={<TeacherDashboard />} />
          </Route>

          {/* Rutas con sidebar (recepcionista) */}
          <Route element={<Layout />}>

            {/* Recepcionista */}
            <Route path="/receptionist" element={
              <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}>
                <ReceptionistDashboard />
              </ProtectedRoute>
            } />

          </Route>

          {/* Rutas del cliente — layout con navbar superior */}
          <Route element={
            <ProtectedRoute allowedRoles={[ROLES.CLIENT]}>
              <ClientLayout />
            </ProtectedRoute>
          }>
            <Route path="/client" element={<ClientDashboard />} />
          </Route>

          {/* Redirigir raíz al login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
