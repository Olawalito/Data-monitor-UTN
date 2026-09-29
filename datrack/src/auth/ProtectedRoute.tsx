import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function ProtectedRoute() {
  const { loading, session } = useAuth()
  if (loading) return <main className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">Loading session…</main>
  return session ? <Outlet /> : <Navigate to="/" replace />
}
