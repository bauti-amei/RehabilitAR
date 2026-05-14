import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: '240px', padding: '32px', background: 'var(--color-dark)' }}>
        <Outlet />
      </main>
    </div>
  )
}
