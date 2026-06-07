import { Outlet, Link } from 'react-router-dom'
import { LogoIcon } from '@/components/ui/LogoIcon'

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="h-16 px-6 flex items-center justify-between border-b border-white/10 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <LogoIcon className="w-8 h-8" />
          <span className="font-bold text-lg text-white tracking-tight">MarketTrace</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link to="/register" className="text-sm font-bold bg-white/10 border border-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all shadow-sm">
            Sign up
          </Link>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}
