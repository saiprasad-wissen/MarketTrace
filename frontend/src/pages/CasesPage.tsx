import { useEffect, useState } from 'react'
import { ClipboardList, Filter } from 'lucide-react'
import { casesApi } from '@/services/api'
import type { Case } from '@/types'
import { InvestigationQueue } from '@/components/dashboard/InvestigationQueue'

export function CasesPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)

  const loadCases = async () => {
    setLoading(true)
    const data = await casesApi.list()
    setCases(data)
    setLoading(false)
  }

  useEffect(() => { loadCases() }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary-600" /> Global Case Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Review and action all investigation cases across the platform.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header border-b-0 pb-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Filter className="w-4 h-4" /> All Active Cases
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="flex justify-center py-20"><div className="spinner scale-150" /></div>
          ) : (
            <InvestigationQueue cases={cases} onRefresh={loadCases} />
          )}
        </div>
      </div>
    </div>
  )
}
