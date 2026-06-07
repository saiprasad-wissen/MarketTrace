import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpCircle, ChevronDown, ChevronUp, Eye, Info, X, ExternalLink } from 'lucide-react'
import type { Case } from '@/types'
import { cn, priorityClass, riskScoreColor, riskScoreClass } from '@/lib/utils'
import { casesApi, investigationsApi } from '@/services/api'
import { useAppStore } from '@/store/useAppStore'
import { CaseTraceModal } from '@/components/cases/CaseTraceModal'

interface Props {
  cases: Case[]
  onRefresh: () => void
}

const STATUSES = ['Open', 'Investigating', 'Escalated', 'Closed']

// ─── Pattern weights (mirrors risk_scorer.py exactly) ─────────────────────────
const PATTERN_SCORES = [
  { name: 'Pump & Dump',        base: 90, eda: 30, color: '#dc2626' },
  { name: 'Spoofing',           base: 85, eda: 40, color: '#ea580c' },
  { name: 'Wash Trading',       base: 80, eda: 35, color: '#a21caf' },
  { name: 'Momentum Ignition',  base: 80, eda: 30, color: '#d97706' },
  { name: 'Layering',           base: 75, eda: 35, color: '#0284c7' },
  { name: 'Quote Stuffing',     base: 70, eda: 25, color: '#16a34a' },
  { name: 'Close Manipulation', base: 65, eda: 15, color: '#64748b' },
]

const SEVERITY_MULT = [
  { label: 'CRITICAL', mult: '×1.00', color: '#dc2626' },
  { label: 'HIGH',     mult: '×0.85', color: '#ea580c' },
  { label: 'MEDIUM',   mult: '×0.65', color: '#d97706' },
  { label: 'LOW',      mult: '×0.40', color: '#64748b' },
]

const CONFIDENCE_MULT = [
  { label: 'High',   mult: '×1.00' },
  { label: 'Medium', mult: '×0.80' },
  { label: 'Low',    mult: '×0.55' },
]

const PRIORITY_BANDS = [
  { label: 'Critical', range: '≥ 85',    color: '#dc2626', bg: '#fef2f2' },
  { label: 'High',     range: '70 – 84', color: '#ea580c', bg: '#fff7ed' },
  { label: 'Medium',   range: '50 – 69', color: '#d97706', bg: '#fffbeb' },
  { label: 'Low',      range: '< 50',    color: '#16a34a', bg: '#f0fdf4' },
]

// ─── Risk Score Info Modal ────────────────────────────────────────────────────
function RiskScoreInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

        {/* Panel */}
        <motion.div
          className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 rounded-t-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <Info className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Risk Score Methodology</h2>
                <p className="text-xs text-slate-400 mt-0.5">How the 0–100 composite score is calculated</p>
              </div>
            </div>
            <button onClick={onClose} className="btn-icon p-1.5 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-6">

            {/* Formula banner */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Formula</p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <span className="bg-primary-100 text-primary-800 px-2 py-0.5 rounded font-semibold">Score</span>
                <span className="text-slate-400">=</span>
                <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded">max(pattern scores)</span>
                <span className="text-slate-400">+</span>
                <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded">frequency bonus</span>
                <span className="text-slate-400">+</span>
                <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded">symbol bonus</span>
                <span className="text-slate-400">→</span>
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">capped at 100</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Each pattern score = base × severity multiplier × confidence multiplier
              </p>
            </div>

            {/* Pattern base scores */}
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Pattern Base Scores &amp; EDA Weights
              </p>
              <div className="space-y-2">
                {PATTERN_SCORES.map(p => {
                  const pct = (p.base / 90) * 100
                  return (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="w-40 text-xs font-medium text-slate-700 shrink-0">{p.name}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
                          style={{ backgroundColor: p.color + 'cc' }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs font-bold tabular-nums shrink-0" style={{ color: p.color }}>
                        {p.base}
                      </span>
                      <span className="text-[10px] text-slate-400 w-28 shrink-0">
                        EDA: <span className="font-semibold text-slate-600">{p.eda} pts</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Multipliers grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Severity */}
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Severity Multipliers
                </p>
                <div className="space-y-1">
                  {SEVERITY_MULT.map(s => (
                    <div key={s.label} className="flex items-center justify-between text-xs rounded-lg px-3 py-1.5 bg-slate-50 border border-slate-100">
                      <span className="font-semibold" style={{ color: s.color }}>{s.label}</span>
                      <span className="font-mono font-bold text-slate-700">{s.mult}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confidence + Bonus */}
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Confidence Multipliers
                </p>
                <div className="space-y-1">
                  {CONFIDENCE_MULT.map(c => (
                    <div key={c.label} className="flex items-center justify-between text-xs rounded-lg px-3 py-1.5 bg-slate-50 border border-slate-100">
                      <span className="font-semibold text-slate-700">{c.label}</span>
                      <span className="font-mono font-bold text-slate-700">{c.mult}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mt-4 mb-2">
                  Bonus Points
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs rounded-lg px-3 py-1.5 bg-slate-50 border border-slate-100">
                    <span className="text-slate-600">Multi-pattern</span>
                    <span className="font-mono font-bold text-slate-700">+4 / pattern (max 15)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs rounded-lg px-3 py-1.5 bg-slate-50 border border-slate-100">
                    <span className="text-slate-600">Multi-symbol</span>
                    <span className="font-mono font-bold text-slate-700">+2.5 / symbol (max 10)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Priority bands */}
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2.5">
                Priority Classification Thresholds
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITY_BANDS.map(b => (
                  <div
                    key={b.label}
                    className="flex items-center justify-between rounded-xl px-4 py-2.5 border"
                    style={{ backgroundColor: b.bg, borderColor: b.color + '33' }}
                  >
                    <span className="text-sm font-bold" style={{ color: b.color }}>{b.label}</span>
                    <span className="text-xs font-mono font-semibold text-slate-600">{b.range}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Example */}
            <div className="rounded-xl bg-primary-50 border border-primary-100 px-4 py-3">
              <p className="text-[11px] font-semibold text-primary-700 uppercase tracking-wide mb-2">
                Example Calculation
              </p>
              <div className="text-xs text-primary-900 space-y-0.5 font-mono">
                <p>Spoofing (CRITICAL, High confidence)</p>
                <p className="pl-4 text-primary-700">= 85 × 1.00 × 1.00 = <strong>85.0</strong> (primary)</p>
                <p className="pt-1">Layering (HIGH, Medium confidence)</p>
                <p className="pl-4 text-primary-700">= 75 × 0.85 × 0.80 = 51.0 (not primary)</p>
                <p className="pt-1">Multi-pattern bonus (2 patterns) = <strong>+8.0</strong></p>
                <p>Multi-symbol bonus (1 symbol)  = <strong>+2.5</strong></p>
                <div className="mt-2 pt-2 border-t border-primary-200 text-primary-800 font-semibold">
                  Total = min(85.0 + 8.0 + 2.5, 100) = <span className="text-primary-600">95.5</span> → Critical
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── InvestigationQueue ───────────────────────────────────────────────────────
export function InvestigationQueue({ cases, onRefresh }: Props) {
  const { setTraceTrader, activeInvestigation, setActiveInvestigation } = useAppStore()
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPattern, setFilterPattern] = useState<string>('')
  const [sortBy, setSortBy] = useState<'risk_score' | 'created_at'>('risk_score')
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedCase, setSelectedCase] = useState<string | null>(null)
  const [showRiskInfo, setShowRiskInfo] = useState(false)

  const filtered = cases
    .filter(c => !filterStatus || c.status === filterStatus)
    .filter(c => !filterPattern || c.patterns?.includes(filterPattern))
    .sort((a, b) => {
      const aVal = sortBy === 'risk_score' ? a.risk_score : new Date(a.created_at).getTime()
      const bVal = sortBy === 'risk_score' ? b.risk_score : new Date(b.created_at).getTime()
      return sortAsc ? aVal - bVal : bVal - aVal
    })

  const handleStatusChange = async (caseId: string, status: string) => {
    await casesApi.update(caseId, { status })
    onRefresh()
    if (activeInvestigation) {
      const updated = await investigationsApi.get(activeInvestigation.id).catch(() => null)
      if (updated) setActiveInvestigation(updated)
    }
  }

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortAsc(s => !s)
    else { setSortBy(col); setSortAsc(false) }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => (
    sortBy === col
      ? sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : null
  )

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="select text-xs py-1.5 w-36">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        
        <select value={filterPattern} onChange={e => setFilterPattern(e.target.value)}
          className="select text-xs py-1.5 w-40">
          <option value="">All Patterns</option>
          {PATTERN_SCORES.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
        
        <span className="text-xs text-slate-400">{filtered.length} cases</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="data-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Trader</th>
              <th>Symbol</th>
              <th>Patterns</th>
              <th className="cursor-pointer select-none" onClick={() => toggleSort('risk_score')}>
                <span className="flex items-center gap-1">
                  Risk <SortIcon col="risk_score" />
                  {/* ⓘ Info button — explains risk score weightage */}
                  <button
                    id="risk-score-info-btn"
                    onClick={e => { e.stopPropagation(); setShowRiskInfo(true) }}
                    className="ml-0.5 text-slate-400 hover:text-primary-600 transition-colors rounded-full p-0.5 hover:bg-primary-50"
                    title="How is the risk score calculated?"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                </span>
              </th>
              <th>Priority</th>
              <th title="Ties into Jira workflow. Escalating triggers a Slack alert.">Status</th>
              <th title="Maps to the assigned agent in Jira when synced.">Assigned</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-8 text-slate-400 text-sm">No cases found</td></tr>
            )}
            {filtered.map((c, i) => (
              <motion.tr key={c.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="hover:bg-slate-50/60 transition-colors">
                <td>
                  <button onClick={() => setSelectedCase(c.id)}
                    className="font-mono text-xs font-semibold text-primary-700 hover:text-primary-500 hover:underline">
                    {c.case_ref}
                  </button>
                </td>
                <td>
                  <button onClick={() => setTraceTrader(c.trader_id)}
                    className="font-mono text-xs hover:text-primary-600 hover:underline font-medium">
                    {c.trader_id}
                  </button>
                </td>
                <td><span className="font-semibold text-slate-800 text-xs">{c.symbol}</span></td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {c.patterns?.split(', ').map(p => (
                      <span key={p} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={cn('text-sm font-bold tabular-nums', riskScoreClass(c.risk_score))}>
                    {c.risk_score.toFixed(1)}
                  </span>
                </td>
                <td><span className={cn(priorityClass(c.priority))}>{c.priority}</span></td>
                <td>
                  <select value={c.status}
                    onChange={e => handleStatusChange(c.id, e.target.value)}
                    className={cn('text-xs font-semibold rounded-full px-2 py-0.5 border cursor-pointer bg-transparent',
                      c.status === 'Open'          ? 'border-blue-200   text-blue-700   bg-blue-50'   :
                      c.status === 'Investigating' ? 'border-amber-200  text-amber-700  bg-amber-50'  :
                      c.status === 'Escalated'     ? 'border-red-200    text-red-700    bg-red-50'    :
                                                     'border-slate-200  text-slate-600  bg-slate-50'
                    )}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="text-xs text-slate-500">
                  {c.assigned_to ? (
                    /^[A-Z]+-\d+$/.test(c.assigned_to) ? (
                      <a href={`https://jira.atlassian.com/browse/${c.assigned_to}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium hover:underline">
                        {c.assigned_to}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      c.assigned_to
                    )
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setTraceTrader(c.trader_id)}
                      className="btn-icon text-xs p-1.5" title="Trace Trader">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {c.status !== 'Escalated' && c.status !== 'Closed' && (
                      <button
                        onClick={() => handleStatusChange(c.id, 'Escalated')}
                        className="text-[10px] font-semibold text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                        title="Escalate">
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCase && <CaseTraceModal caseId={selectedCase} onClose={() => setSelectedCase(null)} />}
      {showRiskInfo && <RiskScoreInfoModal onClose={() => setShowRiskInfo(false)} />}
    </div>
  )
}
