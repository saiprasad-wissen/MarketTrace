import { cn } from '@/lib/utils'

export function LogoIcon({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700/50 shadow-[0_0_20px_rgba(79,70,229,0.3)] overflow-hidden", className)}>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay"></div>
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-primary-500 blur-xl opacity-40"></div>

      {/* MarketTrace Emblem: Chart with Target Ring */}
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3/5 h-3/5 text-indigo-400 relative z-10 drop-shadow-lg">
        {/* Market Trend Line */}
        <path d="M2 16l6-6 4 4 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Trace / Radar Target */}
        <circle cx="18" cy="8" r="2" fill="currentColor" />
        <circle cx="18" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" className="animate-[spin_4s_linear_infinite]" />
      </svg>
    </div>
  )
}
