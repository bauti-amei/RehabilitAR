import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import styles from './Sidebar.module.css'

export default function Layout() {
  return (
    <div className={styles.layoutShell}>
      <Sidebar />
      <main className={styles.layoutMain}>
        <Outlet />
      </main>
    </div>
  )
}
