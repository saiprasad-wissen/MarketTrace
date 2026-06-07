import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldAlert, AlertOctagon, Brain, RefreshCw } from 'lucide-react'
import type { Case } from '@/types'
import { cn, riskScoreColor, riskScoreClass, patternClass, patternColor } from '@/lib/utils'
import { casesApi } from '@/services/api'
import ReactMarkdown from 'react-markdown'

interface Props {
  caseId: string
  onClose: () => void
}

export function CaseTraceModal({ caseId, onClose }: Props) {
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const c = await casesApi.get(caseId)
    setCaseData(c)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [caseId])


  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-16">
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} />

        <motion.div
          className="relative bg-white rounded-2xl shadow-modal w-full max-w-4xl mx-4 overflow-hidden mb-16"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25 }}>

          {loading && !caseData ? (
             <div className="flex items-center justify-center py-20"><div className="spinner scale-150" /></div>
          ) : caseData ? (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6 flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">
                    Case Investigation File
                  </p>
                  <h1 className="text-2xl font-bold text-white font-mono">{caseData.case_ref}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-slate-300 text-sm font-medium">Trader: {caseData.trader_id}</span>
                    <span className="text-slate-500 text-xs">·</span>
                    <span className="text-slate-300 text-sm font-medium">Symbol: {caseData.symbol}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-slate-400 text-xs">Risk Score</p>
                    <p className="text-3xl font-bold tabular-nums" style={{ color: riskScoreColor(caseData.risk_score) }}>
                      {caseData.risk_score.toFixed(1)}
                    </p>
                  </div>
                  <button onClick={onClose}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-8">
                
                {/* Patterns & Evidence */}
                <div>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4" /> Flagged Patterns
                  </h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {caseData.patterns?.split(', ').map(p => (
                      <span key={p} className={patternClass(p as any)}>{p}</span>
                    ))}
                  </div>

                  {caseData.evidence && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(caseData.evidence).map(([k, v]) => (
                        <div key={k} className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                          <p className="text-xs text-slate-400 font-medium capitalize">
                            {k.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm font-semibold text-slate-800 mt-1">
                            {typeof v === 'number' ? (k.includes('pct') || k.includes('ratio') ? `${(v as number).toFixed(1)}%` : (v as number).toLocaleString()) : String(v)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Llama 3.3 Reasoning Tree */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                     <h2 className="text-sm font-semibold text-primary-700 uppercase tracking-wider flex items-center gap-2">
                       <Brain className="w-5 h-5" /> AI Forensic Reasoning
                     </h2>
                     <button
                       onClick={async () => {
                         setCaseData(null)
                         setLoading(true)
                         try {
                           await casesApi.generateReasoning(caseId)
                           await load()
                         } catch (e) {
                           console.error(e)
                           setLoading(false)
                         }
                       }}
                       disabled={loading}
                       className="btn btn-secondary py-1.5 px-3 text-xs"
                     >
                       <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
                       Regenerate Analysis
                     </button>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 min-h-[200px] overflow-hidden">
                     {caseData.ai_analysis ? (
                        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                          {(() => {
                            try {
                              const steps = JSON.parse(caseData.ai_analysis)
                              if (!Array.isArray(steps)) return <p className="text-sm text-slate-500">Invalid analysis format</p>
                              return steps.map((step, i) => (
                                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                    <span className="text-xs font-bold">{i + 1}</span>
                                  </div>
                                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                                    <div className="flex items-center justify-between mb-1">
                                      <h3 className="font-bold text-slate-800 text-sm">{step.step}</h3>
                                      <span className={cn('badge text-[10px]', step.risk_level === 'High' ? 'badge-critical' : step.risk_level === 'Medium' ? 'badge-high' : 'badge-low')}>{step.risk_level}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
                                  </div>
                                </div>
                              ))
                            } catch (e) {
                              return <p className="text-sm text-slate-500">Could not parse reasoning tree.</p>
                            }
                          })()}
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400">
                           <Brain className="w-10 h-10 mb-3 opacity-20" />
                           <p className="text-sm">No AI analysis generated yet.</p>
                           <p className="text-xs mt-1">AI analysis is queued and will appear shortly.</p>
                        </div>
                     )}
                  </div>
                </div>

              </div>
            </>
          ) : null}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
