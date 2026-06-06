import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, Pin, Download } from 'lucide-react'
import type { TraderRiskSummary, ProfileTrader } from '@/types'
import { cn, priorityClass, riskScoreClass, riskScoreColor, patternClass } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { generateTraderPdf } from '@/lib/pdfGenerator'

interface Props {
  summaries: TraderRiskSummary[]
  profileTraders?: ProfileTrader[]
}

export function SuspiciousTraderTable({ summaries, profileTraders = [] }: Props) {
  const { setTraceTrader, pinnedTraders, togglePinnedTrader } = useAppStore()
  const traderInfo = new Map(profileTraders.map(t => [t.trader_id, t]))
  
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null)

  const handleDownload = async (t: TraderRiskSummary) => {
    setGeneratingPdf(t.trader_id)
    try {
      await generateTraderPdf(t.trader_id, t, traderInfo.get(t.trader_id))
    } finally {
      setGeneratingPdf(null)
    }
  }

  if (!summaries.length) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
        No suspicious traders detected
      </div>
    )
  }

  // Sort: pinned first, then by risk_score
  const sortedSummaries = [...summaries].sort((a, b) => {
    const aPinned = pinnedTraders.includes(a.trader_id)
    const bPinned = pinnedTraders.includes(b.trader_id)
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    return b.risk_score - a.risk_score
  })

  // Only show Occurrences column if at least one summary has it (Watchlist view)
  const showOccurrences = summaries.some(s => s.occurrences !== undefined)

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Trader</th>
            <th>Risk Score</th>
            {showOccurrences && <th>Occurrences</th>}
            <th>Patterns Triggered</th>
            <th title="Total unique symbols traded by this trader that triggered alerts.">Symbols</th>
            <th>Priority</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedSummaries.map((t, i) => {
            const info = traderInfo.get(t.trader_id)
            const isPinned = pinnedTraders.includes(t.trader_id)
            
            return (
              <motion.tr key={t.trader_id} layout
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn("transition-colors", isPinned ? "bg-amber-50/40 hover:bg-amber-50/70" : "hover:bg-slate-50/60")}>

                <td className="text-slate-400 text-xs">
                  {isPinned ? <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> : (i + 1)}
                </td>

                <td>
                  <button onClick={() => setTraceTrader(t.trader_id)}
                    className="font-mono text-sm font-bold hover:text-primary-600 hover:underline">
                    {t.trader_id}
                  </button>
                </td>

                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${t.risk_score}%`,
                        backgroundColor: riskScoreColor(t.risk_score),
                      }} />
                    </div>
                    <span className={cn('text-sm font-bold tabular-nums', riskScoreClass(t.risk_score))}>
                      {t.risk_score.toFixed(1)}
                    </span>
                  </div>
                </td>

                {showOccurrences && (
                  <td>
                    {t.occurrences ? (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {t.occurrences} cases
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                )}

                <td>
                  <div className="flex flex-wrap gap-1">
                    {t.patterns.map(p => (
                      <span key={p} className={patternClass(p)}>{p}</span>
                    ))}
                  </div>
                </td>

                <td>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {t.symbol_count} symbol{t.symbol_count !== 1 ? 's' : ''}
                  </span>
                </td>

                <td><span className={cn(priorityClass(t.priority))}>{t.priority}</span></td>

                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setTraceTrader(t.trader_id)}
                      title="Trace Trader"
                      className="btn-icon p-1.5 text-primary-600 hover:bg-primary-50">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => togglePinnedTrader(t.trader_id)}
                      title={isPinned ? "Unpin Trader" : "Pin Trader"}
                      className={cn("btn-icon p-1.5 hover:bg-slate-100", isPinned ? "text-amber-500" : "text-slate-400")}>
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDownload(t)}
                      disabled={generatingPdf === t.trader_id}
                      title="Download PDF Dossier"
                      className="btn-icon p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                      {generatingPdf === t.trader_id ? (
                        <div className="spinner w-3.5 h-3.5 border-[1.5px]" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
