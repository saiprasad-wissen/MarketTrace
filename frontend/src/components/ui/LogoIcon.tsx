import { cn } from '@/lib/utils'

export function LogoIcon({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] overflow-hidden", className)}>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay"></div>
      
      {/* Custom MarketTrace Emblem */}
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3/5 h-3/5 text-white relative z-10 drop-shadow-lg">
        {/* Outer Shield/Hexagon */}
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
