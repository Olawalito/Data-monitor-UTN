import type { Role, SimRecord, SimStatus } from '../types/api'

interface SimTableProps {
  sims: SimRecord[]
  role: Role
  busyIds: Set<string>
  onRefresh: (id: string) => void
  onRemove: (id: string) => void
}

const statusStyle: Record<SimStatus, string> = {
  pending: 'bg-slate-100 text-slate-600',
  fresh: 'bg-emerald-50 text-emerald-700',
  stale: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-700',
}

const statusLabel: Record<SimStatus, string> = {
  pending: 'Pending',
  fresh: 'Current',
  stale: 'Stale',
  error: 'Needs attention',
}

function formatBalance(sim: SimRecord) {
  if (sim.balance === null || !sim.balanceUnit) return 'Not available'
  return `${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(sim.balance)} ${sim.balanceUnit}`
}

function formatDate(value: string | null, includeTime = false) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

export default function SimTable({ sims, role, busyIds, onRefresh, onRemove }: SimTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">SIM line</th>
              <th className="px-5 py-4 font-semibold">Balance</th>
              <th className="px-5 py-4 font-semibold">Expiry</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Last successful</th>
              {role === 'admin' && <th className="px-6 py-4 text-right font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sims.map((sim) => {
              const busy = busyIds.has(sim.id)
              return (
                <tr key={sim.id} className="transition hover:bg-slate-50/70">
                  <th scope="row" className="px-6 py-5">
                    <span className="block font-semibold text-slate-900">{sim.label}</span>
                    <span className="mt-1 block font-mono text-xs font-normal text-slate-500">{sim.msisdn}</span>
                  </th>
                  <td className="px-5 py-5 text-sm font-semibold text-slate-900">{formatBalance(sim)}</td>
                  <td className="px-5 py-5 text-sm text-slate-600">{formatDate(sim.expiresAt)}</td>
                  <td className="px-5 py-5"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[sim.status]}`}>{statusLabel[sim.status]}</span></td>
                  <td className="px-5 py-5 text-sm text-slate-500">{formatDate(sim.lastSuccessAt, true)}</td>
                  {role === 'admin' && (
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button aria-label={`Refresh ${sim.label}`} disabled={busy} onClick={() => onRefresh(sim.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50">{busy ? 'Checking…' : 'Refresh'}</button>
                        <button aria-label={`Remove ${sim.label}`} disabled={busy} onClick={() => { if (window.confirm(`Remove ${sim.label} from this monitor?`)) onRemove(sim.id) }} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50">Remove</button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
