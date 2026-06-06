import { useEffect, useState } from 'react'
import { ShieldAlert, RefreshCw } from 'lucide-react'
import { SuspiciousTraderTable } from '@/components/dashboard/SuspiciousTraderTable'
import { casesApi, profilesApi } from '@/services/api'
import type { ProfileTrader, TraderRiskSummary } from '@/types'

export function WatchlistPage() {
  const [summaries, setSummaries] = useState<TraderRiskSummary[]>([])
  const [profileTraders, setProfileTraders] = useState<ProfileTrader[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const allCases = await casesApi.list({} as any)
      const profiles = await profilesApi.list()
      
      // Aggregate cases by trader
      const traderMap = new Map<string, TraderRiskSummary & { _symbols: Set<string> }>()
      for (const c of allCases) {
        if (!traderMap.has(c.trader_id)) {
          traderMap.set(c.trader_id, {
            trader_id: c.trader_id,
            risk_score: 0,
            patterns: [],
            priority: 'Low',
            alert_count: 0,
            symbol_count: 0,
            occurrences: 0,
            _symbols: new Set(),
          })
        }
        const t = traderMap.get(c.trader_id)!
        t.occurrences! += 1
        if (c.symbol) t._symbols.add(c.symbol)
        t.risk_score = Math.max(t.risk_score, c.risk_score)
        
        const patterns = c.patterns?.split(',') || []
        patterns.forEach(p => { 
          if (!t.patterns.includes(p.trim() as any)) {
            t.patterns.push(p.trim() as any) 
          }
        })
        
        if (t.risk_score >= 85) t.priority = 'Critical'
        else if (t.risk_score >= 70) t.priority = 'High'
        else if (t.risk_score >= 50) t.priority = 'Medium'
        else t.priority = 'Low'
      }

      const aggregated = Array.from(traderMap.values()).map(t => {
        t.symbol_count = t._symbols.size
        return t
      }).sort((a, b) => b.risk_score - a.risk_score)
      setSummaries(aggregated)

      // Collect all profile traders for info matching
      const allTraders: ProfileTrader[] = []
      profiles.forEach((p: any) => p.traders && allTraders.push(...p.traders))
      setProfileTraders(allTraders)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" /> Global Watchlist
          </h1>
          <p className="text-sm text-slate-500 mt-1">Monitored suspicious traders aggregated across all investigations.</p>
        </div>
        <button onClick={loadData} className="btn-secondary text-xs gap-1.5">
          <RefreshCw className="w-4 h-4" /> Refresh List
        </button>
      </div>

      <div className="card">
        <div className="card-body p-0">
          {loading ? (
             <div className="flex justify-center py-20"><div className="spinner scale-150" /></div>
          ) : (
            <SuspiciousTraderTable summaries={summaries} profileTraders={profileTraders} />
          )}
        </div>
      </div>
    </div>
  )
}
