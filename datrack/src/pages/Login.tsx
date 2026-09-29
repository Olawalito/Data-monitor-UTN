import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiRequestError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import logo from '../assets/logo.png'

export default function Login() {
  const { session, loading, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && session) navigate('/dashboard', { replace: true })
  }, [loading, navigate, session])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : 'Unable to sign in. Check that the local service is running.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f5f7fb] px-5 py-10">
      <div className="absolute -left-24 top-12 h-80 w-80 rounded-full bg-[#ffdd00]/20 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
      <section className="relative w-full max-w-md rounded-3xl border border-white bg-white/95 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:p-10">
        <img src={logo} alt="Datrack" className="mb-8 h-11 w-auto object-contain" />
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#927900]">Local MTN monitor</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Welcome back</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Sign in on this computer to view approved company SIM balances and expiry dates.</p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">Username
            <input autoComplete="username" className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-[#d6b500] focus:bg-white focus:ring-4 focus:ring-[#ffdd00]/20" value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>
          <label className="block text-sm font-medium text-slate-700">Password
            <input type="password" autoComplete="current-password" className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-[#d6b500] focus:bg-white focus:ring-4 focus:ring-[#ffdd00]/20" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button disabled={submitting} className="h-12 w-full rounded-xl bg-[#ffdd00] font-semibold text-slate-950 shadow-sm transition hover:bg-[#f2cf00] disabled:cursor-wait disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="mt-7 text-center text-xs text-slate-400">Restricted to authorised Unified TrustNet staff</p>
      </section>
    </main>
  )
}
