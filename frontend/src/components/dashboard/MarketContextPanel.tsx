import { motion } from 'framer-motion'
import { Clock, Newspaper, TrendingUp, Building2, Globe2 } from 'lucide-react'
import type { ContextEvent } from '@/types'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<string, React.ElementType> = {
  NEWS:     Newspaper,
  ANALYST:  TrendingUp,
  CORPORATE:Building2,
  MACRO:    Globe2,
}

const SEV_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  HIGH:     { dot: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700' },
  CRITICAL: { dot: 'bg-red-700',    bg: 'bg-red-50',    text: 'text-red-800' },
  MEDIUM:   { dot: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700' },
  LOW:      { dot: 'bg-slate-400',  bg: 'bg-slate-50',  text: 'text-slate-600' },
  INFO:     { dot: 'bg-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-700' },
}

interface Props {
  events: ContextEvent[]
  filterSymbol?: string | null
}

export function MarketContextPanel({ events, filterSymbol }: Props) {
  const filtered = filterSymbol
    ? events.filter(e => e.symbol === filterSymbol || e.symbol === 'MARKET' || !e.symbol)
    : events

  const sorted = [...filtered].sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  if (!sorted.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
        <Globe2 className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No context events for this scope</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {sorted.map((event, i) => {
        const Icon = TYPE_ICONS[event.event_type] || Globe2
        const sev = SEV_COLORS[event.severity] || SEV_COLORS.LOW
        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex gap-3 group">

            {/* Timeline line */}
            <div className="flex flex-col items-center shrink-0">
              <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5 shrink-0', sev.dot)} />
              {i < sorted.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 mt-1 mb-0" />}
            </div>

            {/* Content */}
            <div className={cn('flex-1 rounded-lg p-3 border border-transparent group-hover:border-slate-200 transition-all', sev.bg)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Icon className={cn('w-3.5 h-3.5 shrink-0', sev.text)} />
                  <span className="text-xs font-semibold text-slate-700">{event.title}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {event.symbol && event.symbol !== 'MARKET' && (
                    <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {event.symbol}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {event.timestamp}
                  </span>
                </div>
              </div>
              {event.summary && (
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{event.summary}</p>
              )}
              <span className={cn('text-[10px] font-semibold mt-1 inline-block', sev.text)}>
                {event.severity} · {event.event_type}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
