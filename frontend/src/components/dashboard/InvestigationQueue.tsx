import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpCircle, ChevronDown, ChevronUp, Eye } from 'lucide-react'
import type { Case } from '@/types'
import { cn, statusClass, priorityClass, riskScoreColor, riskScoreClass, timeAgo } from '@/lib/utils'
import { casesApi, investigationsApi } from '@/services/api'
import { useAppStore } from '@/store/useAppStore'
import { CaseTraceModal } from '@/components/cases/CaseTraceModal'

interface Props {
  cases: Case[]
  onRefresh: () => void
}

const STATUSES = ['Open', 'Investigating', 'Escalated', 'Closed']

export function InvestigationQueue({ cases, onRefresh }: Props) {
  const { setTraceTrader, activeInvestigation, setActiveInvestigation } = useAppStore()
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [sortBy, setSortBy] = useState<'risk_score' | 'created_at'>('risk_score')
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedCase, setSelectedCase] = useState<string | null>(null)

  const filtered = cases
    .filter(c => !filterStatus || c.status === filterStatus)
    .sort((a, b) => {
      const aVal = sortBy === 'risk_score' ? a.risk_score : new Date(a.created_at).getTime()
      const bVal = sortBy === 'risk_score' ? b.risk_score : new Date(b.created_at).getTime()
      return sortAsc ? aVal - bVal : bVal - aVal
    })

  const handleStatusChange = async (caseId: string, status: string) => {
    await casesApi.update(caseId, { status })
    onRefresh()
    // Re-fetch investigation stats so escalated_cases in funnel + metrics updates immediately
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
                <span className="flex items-center gap-1">Risk <SortIcon col="risk_score" /></span>
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
                <td className="text-xs text-slate-500">{c.assigned_to || '—'}</td>
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
    </div>
  )
}
