import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Zap, Trash2, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { investigationsApi } from '@/services/api'
import { cn, timeAgo, riskScoreColor } from '@/lib/utils'

export function InvestigationsPage() {
  const { investigations, setInvestigations, setActiveInvestigation, setWizardOpen } = useAppStore()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    investigationsApi.list().then(data => setInvestigations(data.filter(i => i.status !== 'deleted')))
  }, [])

  const filtered = investigations.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  const handleOpen = (inv: any) => {
    setActiveInvestigation(inv)
    navigate('/dashboard')
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to archive this investigation?')) {
      await investigationsApi.delete(id)
      setInvestigations(investigations.filter(i => i.id !== id))
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-6 h-6 text-primary-600" /> Investigations Library
          </h1>
          <p className="text-sm text-slate-500 mt-1">Browse and manage past surveillance runs.</p>
        </div>
        <button onClick={() => { setWizardOpen(true); navigate('/dashboard') }} className="btn-primary">
          <Zap className="w-4 h-4" /> New Investigation
        </button>
      </div>

      <div className="card p-3 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search investigations..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 text-sm" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Investigation Name</th>
              <th>Status</th>
              <th>Trades Analyzed</th>
              <th>Alerts Detected</th>
              <th>Escalated Cases</th>
              <th>Avg Risk Score</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-slate-500">No investigations found</td></tr>
            ) : filtered.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleOpen(inv)}>
                <td className="font-semibold text-slate-800">{inv.name}</td>
                <td>
                  <span className={cn('badge',
                    inv.status === 'ready' ? 'badge-low' :
                    inv.status === 'processing' ? 'badge-high live-indicator' : 'badge-closed'
                  )}>{inv.status.toUpperCase()}</span>
                </td>
                <td className="tabular-nums">{inv.total_trades.toLocaleString()}</td>
                <td className="tabular-nums font-semibold text-orange-600">{inv.total_alerts.toLocaleString()}</td>
                <td className="tabular-nums font-bold text-red-600">{inv.escalated_cases.toLocaleString()}</td>
                <td>
                  <span className="font-bold tabular-nums" style={{ color: riskScoreColor(inv.avg_risk_score) }}>
                    {inv.avg_risk_score.toFixed(1)}
                  </span>
                </td>
                <td className="text-slate-500">{timeAgo(inv.created_at)}</td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleDelete(inv.id)} className="btn-icon text-slate-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleOpen(inv)} className="btn-icon text-primary-600 hover:bg-primary-50">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
