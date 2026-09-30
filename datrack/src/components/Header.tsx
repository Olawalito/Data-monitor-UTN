import logo from '../assets/logo.png'
import type { Session } from '../types/api'

interface HeaderProps {
  session: Session
  onAdd: () => void
  onLogout: () => void
}

export default function Header({ session, onAdd, onLogout }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Datrack" className="h-9 w-auto object-contain" />
          <span className="hidden h-7 w-px bg-slate-200 sm:block" />
          <span className="hidden text-sm font-medium text-slate-500 sm:block">Local MTN monitor</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-900">{session.username}</p>
            <p className="text-xs capitalize text-slate-500">{session.role} access</p>
          </div>
          {session.role === 'admin' && <button onClick={onAdd} className="rounded-xl bg-[#ffdd00] px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-[#f2cf00]">Add SIM</button>}
          <button onClick={onLogout} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Sign out</button>
        </div>
      </div>
    </header>
  )
}
