import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldAlert, Clock, TrendingUp, AlertOctagon, BookOpen, FileText, Bot } from 'lucide-react'
import type { Alert, Trade, ContextEvent, ProfileTrader } from '@/types'
import { cn, riskScoreColor, riskScoreClass, patternClass, patternColor, priorityClass, formatNumber } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { tradesApi, alertsApi, profilesApi, casesApi, investigationsApi } from '@/services/api'
import { CaseTraceModal } from '@/components/cases/CaseTraceModal'
import ReactMarkdown from 'react-markdown'
import type { Case } from '@/types'

interface Props {
  traderId: string
  investigationId: string
  profileTraders?: ProfileTrader[]
  onClose: () => void
}

export function TraderTraceModal({ traderId, investigationId, profileTraders = [], onClose }: Props) {
  const { setAIContext, setAIPanelOpen, alerts: allAlerts } = useAppStore()
  const [trades, setTrades] = useState<Trade[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [selectedCase, setSelectedCase] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiProfile, setAiProfile] = useState<string | null>(null)

  const [traderInfo, setTraderInfo] = useState<ProfileTrader | null>(
    profileTraders.find(t => t.trader_id === traderId) || null
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [t, a, c, ai_res] = await Promise.all([
        tradesApi.list(investigationId, { trader_id: traderId, limit: 500 }),
        alertsApi.list(investigationId, { trader_id: traderId }),
        casesApi.list({ investigation_id: investigationId, trader_id: traderId }),
        investigationsApi.getTraderAnalysis(investigationId, traderId).catch(() => ({ data: { ai_profile: null } }))
      ])

      if (!traderInfo && useAppStore.getState().activeInvestigation?.profile_id) {
        try {
          const profile = await profilesApi.get(useAppStore.getState().activeInvestigation!.profile_id)
          const found = profile.traders?.find((pt: any) => pt.trader_id === traderId)
          if (found) setTraderInfo(found)
        } catch (e) {}
      }
      setTrades(t.sort((a, b) => a.sequence_num - b.sequence_num))
      setAlerts(a)
      setCases(c)
      if (ai_res?.data?.ai_profile) {
         setAiProfile(ai_res.data.ai_profile)
      }
      setLoading(false)
    }
    load()
  }, [traderId, investigationId])

  useEffect(() => {
    setAIContext('trader', traderId)
    return () => setAIContext('investigation', null)
  }, [traderId, setAIContext])

  // Compute risk score from alerts
  const PATTERN_SCORES: Record<string, number> = {
    'Spoofing': 85, 'Momentum Ignition': 80, 'Pump & Dump': 90,
    'Quote Stuffing': 70, 'Wash Trading': 75, 'Layering': 65, 'Close Manipulation': 72,
  }
  const SEV_MULT: Record<string, number> = { CRITICAL: 1.0, HIGH: 0.85, MEDIUM: 0.65, LOW: 0.40 }
  const CONF_MULT: Record<string, number> = { High: 1.0, Medium: 0.80, Low: 0.55 }

  const patternScores = alerts.map(a =>
    (PATTERN_SCORES[a.pattern] || 60) * (SEV_MULT[a.severity] || 0.65) * (CONF_MULT[a.confidence] || 0.80)
  )
  const riskScore = patternScores.length
    ? Math.min(100, Math.max(...patternScores) + Math.min(alerts.length * 4, 15))
    : 0

  const symbols = [...new Set(trades.map(t => t.symbol))]
  const totalVolume = trades.filter(t => t.status === 'EXECUTE').reduce((s, t) => s + t.quantity, 0)
  const cancels = trades.filter(t => t.status === 'CANCEL')
  const newOrders = trades.filter(t => t.status === 'NEW')
  const cancelRatio = newOrders.length > 0 ? (cancels.length / newOrders.length) * 100 : 0

  const handleAskAI = () => {
    setAIContext('trader', traderId)
    setAIPanelOpen(true)
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} />

        {/* Modal */}
        <motion.div
          className="relative bg-white rounded-2xl shadow-modal w-full max-w-5xl mx-4 my-8 overflow-hidden"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25 }}>

          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6 flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">
                Trader Investigation Report
              </p>
              <h1 className="text-2xl font-bold text-white font-mono">{traderId}</h1>
              {traderInfo && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-slate-300 text-sm font-medium">{traderInfo.trader_name}</span>
                  {traderInfo.desk && <span className="text-slate-500 text-xs">· {traderInfo.desk}</span>}
                  {traderInfo.region && <span className="text-slate-500 text-xs">· {traderInfo.region}</span>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-slate-400 text-xs">Risk Score</p>
                <p className="text-3xl font-bold tabular-nums" style={{ color: riskScoreColor(riskScore) }}>
                  {riskScore.toFixed(1)}
                </p>
              </div>
              <button onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="spinner scale-150" />
            </div>
          ) : (
            <div className="p-8 space-y-8 max-h-[calc(90vh-140px)] overflow-y-auto">

              {/* Claude Deep Dive Profile Removed */}

              {/* Evidence Metrics */}
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Evidence Summary
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Orders', value: newOrders.length, format: 'n' },
                    { label: 'Cancellation Ratio', value: cancelRatio, format: 'pct' },
                    { label: 'Total Executed Volume', value: totalVolume, format: 'n' },
                    { label: 'Symbols Traded', value: symbols.length, format: 'n' },
                  ].map(({ label, value, format }) => (
                    <div key={label} className="card p-4">
                      <p className="text-xs font-medium text-slate-500">{label}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                        {format === 'pct'
                          ? `${value.toFixed(1)}%`
                          : formatNumber(value)
                        }
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Triggered Patterns */}
              {alerts.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4" /> Triggered Patterns — WHY FLAGGED?
                  </h2>
                  <div className="space-y-3">
                    {alerts.map((alert, i) => (
                      <motion.div key={alert.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100"
                          style={{ backgroundColor: patternColor(alert.pattern) + '10' }}>
                          <div className="flex items-center gap-2">
                            <span className={patternClass(alert.pattern)}>{alert.pattern}</span>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs text-slate-500">
                              {alert.start_time} → {alert.end_time}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn('badge text-[10px]',
                              alert.severity === 'CRITICAL' ? 'badge-critical' :
                              alert.severity === 'HIGH' ? 'badge-high' : 'badge-medium'
                            )}>{alert.severity}</span>
                            <span className="text-[10px] text-slate-400">Confidence: {alert.confidence}</span>
                          </div>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-sm text-slate-700 leading-relaxed mb-4 font-medium">{alert.description}</p>
                          
                          {/* Inject Detailed Llama Reasoning for this Symbol */}
                          {(() => {
                             const relatedCase = cases.find(c => c.symbol === alert.symbol)
                             if (relatedCase && relatedCase.ai_analysis) {
                               try {
                                 const steps = JSON.parse(relatedCase.ai_analysis)
                                 if (Array.isArray(steps) && steps.length > 0) {
                                   return (
                                     <div className="mb-4 mt-2 border-l-2 border-primary-200 pl-4 space-y-3">
                                       <h3 className="text-xs font-bold text-primary-800 uppercase flex items-center gap-2 mb-2"><Bot className="w-3.5 h-3.5"/> Detailed Forensic Analysis</h3>
                                       {steps.map((step: any, idx: number) => (
                                         <div key={idx} className="bg-white rounded-lg border border-slate-100 p-3 shadow-sm">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="font-semibold text-slate-800 text-xs">{idx + 1}. {step.step}</span>
                                              <span className={cn('badge text-[9px]', step.risk_level === 'High' ? 'badge-critical' : step.risk_level === 'Medium' ? 'badge-high' : 'badge-low')}>{step.risk_level}</span>
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                                         </div>
                                       ))}
                                     </div>
                                   )
                                 }
                               } catch (e) {}
                             }
                             return null
                          })()}

                          {alert.evidence && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {Object.entries(alert.evidence).map(([k, v]) => (
                                <div key={k} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                  <p className="text-[10px] text-slate-400 font-medium capitalize">
                                    {k.replace(/_/g, ' ')}
                                  </p>
                                  <p className="text-sm font-semibold text-slate-800 mt-0.5">
                                    {typeof v === 'number' ? (
                                      k.includes('pct') || k.includes('ratio')
                                        ? `${(v as number).toFixed(1)}%`
                                        : (v as number).toLocaleString()
                                    ) : String(v)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated Cases */}
              {cases.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Generated Cases
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cases.map(c => (
                      <button key={c.id} onClick={() => setSelectedCase(c.id)} className="card p-4 text-left hover:border-primary-500 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-mono font-bold text-sm text-slate-800">{c.case_ref}</span>
                          <span className={cn('badge', c.status === 'Open' ? 'badge-high' : 'badge-low')}>{c.status}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">Symbol: <span className="font-bold">{c.symbol}</span></p>
                        <p className="text-xs font-semibold text-primary-600 flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5" /> View AI Deep Dive &rarr;
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Timeline */}
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Chronological Activity Timeline
                </h2>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="max-h-72 overflow-y-auto">
                    <table className="data-table">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th>Time</th><th>Symbol</th><th>Side</th>
                          <th>Qty</th><th>Price</th><th>Order</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map(t => (
                          <tr key={t.id} className={cn(
                            t.status === 'CANCEL' ? 'bg-red-50/40' :
                            t.status === 'EXECUTE' ? 'bg-green-50/20' : ''
                          )}>
                            <td className="font-mono text-xs">{t.timestamp}</td>
                            <td className="font-bold text-xs">{t.symbol}</td>
                            <td>
                              <span className={cn('text-xs font-semibold',
                                t.side === 'BUY' ? 'text-green-700' : 'text-red-700'
                              )}>{t.side}</span>
                            </td>
                            <td className="tabular-nums text-xs">{t.quantity.toLocaleString()}</td>
                            <td className="tabular-nums text-xs">{t.price.toFixed(2)}</td>
                            <td className="font-mono text-[10px] text-slate-400">{t.order_id}</td>
                            <td>
                              <span className={cn('text-[10px] font-semibold',
                                t.status === 'EXECUTE' ? 'text-green-700' :
                                t.status === 'CANCEL'  ? 'text-red-600'   : 'text-slate-500'
                              )}>{t.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Related Symbols */}
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Related Symbols
                </h2>
                <div className="flex flex-wrap gap-2">
                  {symbols.map(sym => (
                    <span key={sym} className="font-bold text-sm bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200">
                      {sym}
                    </span>
                  ))}
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Risk Assessment
                  </h2>
                  <span className={cn('text-sm font-bold', riskScoreClass(riskScore))}>
                    {riskScore >= 85 ? 'ESCALATION RECOMMENDED' :
                     riskScore >= 70 ? 'HIGH PRIORITY — INVESTIGATE' :
                     riskScore >= 50 ? 'MEDIUM — MONITOR' : 'LOW — REVIEW'}
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${riskScore}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: riskScoreColor(riskScore) }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-slate-400">0</span>
                  <span className="text-[10px] text-slate-400">50</span>
                  <span className="text-[10px] text-slate-400">100</span>
                </div>
              </div>

            </div>
          )}
        </motion.div>
      </div>

      {selectedCase && <CaseTraceModal caseId={selectedCase} onClose={() => setSelectedCase(null)} />}
    </AnimatePresence>
  )
}
