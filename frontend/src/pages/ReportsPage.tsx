import { useEffect, useState } from 'react'
import { FileText, Download, Trash2, FileCheck } from 'lucide-react'
import { reportsApi } from '@/services/api'
import type { Report } from '@/types'
import { timeAgo } from '@/lib/utils'

export function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  const loadReports = async () => {
    setLoading(true)
    const data = await reportsApi.list()
    setReports(data)
    setLoading(false)
  }

  useEffect(() => { loadReports() }, [])

  const handleDelete = async (id: string) => {
    if (confirm('Delete this report?')) {
      await reportsApi.delete(id)
      setReports(r => r.filter(x => x.id !== id))
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-600" /> Regulatory Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">Generated compliance and market surveillance reports.</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Report Title</th>
              <th>Type</th>
              <th>Subject</th>
              <th>Generated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10"><div className="spinner mx-auto" /></td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-500">No reports generated yet. Use the "Generate Report" buttons in the dashboard.</td></tr>
            ) : reports.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-green-600" /> {r.title}
                </td>
                <td><span className="badge badge-low uppercase">{r.report_type}</span></td>
                <td className="font-mono text-xs">{r.subject_id || '—'}</td>
                <td className="text-slate-500 text-sm">{timeAgo(r.created_at)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <button className="btn-secondary text-xs px-2 py-1 gap-1">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="btn-icon text-slate-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
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
