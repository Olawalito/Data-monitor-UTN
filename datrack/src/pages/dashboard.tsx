import { useCallback, useEffect, useState } from 'react'
import { api, ApiRequestError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import Header from '../components/Header'
import SimTable from '../components/table'
import type { SimRecord } from '../types/api'

export default function Dashboard() {
  const { session, logout, invalidate } = useAuth()
  const [sims, setSims] = useState<SimRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [label, setLabel] = useState('')
  const [msisdn, setMsisdn] = useState('')
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [refreshingAll, setRefreshingAll] = useState(false)

  const showError = useCallback((caught: unknown) => {
    if (caught instanceof ApiRequestError && caught.status === 401) {
      invalidate()
      return
    }
    setError(caught instanceof ApiRequestError ? caught.message : 'The local monitor could not complete that request.')
  }, [invalidate])

  useEffect(() => {
    let active = true
    let inFlight = false
    async function load() {
      if (inFlight) return
      inFlight = true
      try {
        const updated = await api.listSims()
        if (active) setSims(updated)
      } catch (caught) {
        if (active) showError(caught)
      } finally {
        inFlight = false
        if (active) setLoading(false)
      }
    }
    void load()
    const timer = window.setInterval(() => void load(), 30_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [showError])

  if (!session) return null

  async function addSim(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const added = await api.addSim(label.trim(), msisdn.trim())
      setSims((current) => [...current, added])
      setLabel('')
      setMsisdn('')
      setShowAdd(false)
    } catch (caught) { showError(caught) }
  }

  async function withBusy(id: string, action: () => Promise<void>) {
    setBusyIds((current) => new Set(current).add(id))
    setError('')
    try { await action() } catch (caught) { showError(caught) } finally {
      setBusyIds((current) => { const next = new Set(current); next.delete(id); return next })
    }
  }

  function refreshOne(id: string) {
    void withBusy(id, async () => {
      const updated = await api.refreshSim(id)
      setSims((current) => current.map((sim) => sim.id === id ? updated : sim))
    })
  }

  function removeOne(id: string) {
    void withBusy(id, async () => {
      await api.removeSim(id)
      setSims((current) => current.filter((sim) => sim.id !== id))
    })
  }

  async function refreshAll() {
    setRefreshingAll(true)
    setError('')
    try { setSims(await api.refreshAll()) } catch (caught) { showError(caught) } finally { setRefreshingAll(false) }
  }

  const current = sims.filter((sim) => sim.status === 'fresh').length
  const attention = sims.filter((sim) => sim.status === 'stale' || sim.status === 'error').length

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <Header session={session} onAdd={() => setShowAdd(true)} onLogout={() => void logout()} />
      <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#927900]">Company connectivity</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">MTN data overview</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Balances are fetched directly from MTN and stored only on this computer.</p>
          </div>
          {session.role === 'admin' && <button onClick={() => void refreshAll()} disabled={refreshingAll || loading || sims.length === 0} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">{refreshingAll ? 'Refreshing…' : 'Refresh all'}</button>}
        </div>

        <section aria-label="Monitor summary" className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Approved SIMs</p><p className="mt-2 text-3xl font-semibold">{sims.length}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Current balances</p><p className="mt-2 text-3xl font-semibold text-emerald-600">{current}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Needs attention</p><p className="mt-2 text-3xl font-semibold text-amber-600">{attention}</p></div>
        </section>

        {error && <p role="alert" className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <section className="mt-6">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">Loading approved lines…</div>
          ) : sims.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><p className="text-lg font-semibold">No approved SIMs yet</p><p className="mt-2 text-sm text-slate-500">{session.role === 'admin' ? 'Add the first company MTN line to begin monitoring.' : 'An administrator has not added any lines yet.'}</p></div>
          ) : <SimTable sims={sims} role={session.role} busyIds={busyIds} onRefresh={refreshOne} onRemove={removeOne} />}
        </section>
      </main>

      {showAdd && session.role === 'admin' && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-5 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAdd(false) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="add-sim-title" className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#927900]">Approved company line</p><h2 id="add-sim-title" className="mt-2 text-2xl font-semibold">Add MTN SIM</h2></div><button aria-label="Close add SIM dialog" onClick={() => setShowAdd(false)} className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100">×</button></div>
            <form className="mt-7 space-y-5" onSubmit={addSim}>
              <label className="block text-sm font-medium text-slate-700">Line label<input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Main office router" maxLength={80} required className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-[#d6b500] focus:ring-4 focus:ring-[#ffdd00]/20" /></label>
              <label className="block text-sm font-medium text-slate-700">MTN number<input value={msisdn} onChange={(event) => setMsisdn(event.target.value)} placeholder="0803 123 4567" inputMode="tel" required className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-[#d6b500] focus:ring-4 focus:ring-[#ffdd00]/20" /></label>
              <p className="text-xs leading-5 text-slate-500">Only add SIMs that Unified TrustNet is authorised to monitor. No OTP is required.</p>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowAdd(false)} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button><button className="rounded-xl bg-[#ffdd00] px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-[#f2cf00]">Save SIM</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
