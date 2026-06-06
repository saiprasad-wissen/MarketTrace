import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen, Plus, Search, Trash2, Edit2, CheckCircle, Upload, AlertCircle, Loader2, X } from 'lucide-react'
import { profilesApi } from '@/services/api'
import type { Profile } from '@/types'
import { cn, timeAgo } from '@/lib/utils'

export function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)

  const loadProfiles = async () => {
    setLoading(true)
    try {
      const data = await profilesApi.list()
      setProfiles(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProfiles() }, [])

  const filtered = profiles.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()))

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this profile?')) {
      await profilesApi.delete(id)
      setProfiles(p => p.filter(x => x.id !== id))
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary-600" /> Profiles Universe
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage stock and trader universes for surveillance investigations.</p>
        </div>
        <button onClick={() => setWizardOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Profile
        </button>
      </div>

      {/* Toolbar */}
      <div className="card p-3 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search profiles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9 text-sm"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner scale-150" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">No profiles found. Create one to get started.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="card p-5 group hover:border-primary-300 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-slate-800 text-lg">{p.name}</h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDelete(p.id)} className="btn-icon text-red-500 hover:bg-red-50 p-1.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-500 h-10 line-clamp-2 mb-4">{p.description || 'No description'}</p>
              <div className="flex items-center gap-4 text-sm font-semibold mb-4">
                <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-center flex-1">
                  {p.stock_count} <span className="text-[10px] uppercase font-bold block opacity-70">Stocks</span>
                </div>
                <div className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 text-center flex-1">
                  {p.trader_count} <span className="text-[10px] uppercase font-bold block opacity-70">Traders</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>{p.investigation_count} investigations</span>
                <span>Created {timeAgo(p.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Wizard */}
      {wizardOpen && (
        <ProfileWizard onClose={() => setWizardOpen(false)} onCreated={loadProfiles} />
      )}
    </div>
  )
}

function ProfileWizard({ onClose, onCreated }: { onClose: () => void, onCreated: () => void }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stocksFile, setStocksFile] = useState<File | null>(null)
  const [tradersFile, setTradersFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    setUploading(true); setError('')
    try {
      const p = await profilesApi.create(name, description)
      if (stocksFile) await profilesApi.uploadStocks(p.id, stocksFile)
      if (tradersFile) await profilesApi.uploadTraders(p.id, tradersFile)
      onCreated()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.detail?.errors?.[0] || 'Upload failed')
      setUploading(false)
    }
  }

  const FileDrop = ({ label, desc, file, setFile }: any) => (
    <div className="mb-4">
      <label className="label">{label}</label>
      <p className="text-xs text-slate-500 mb-2">{desc}</p>
      <label className={cn('drop-zone block cursor-pointer py-6', file && 'border-green-500 bg-green-50')}>
        <input type="file" className="hidden" accept=".csv" onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
        {file ? (
          <div className="flex items-center justify-center gap-2 text-green-700 font-medium">
            <CheckCircle className="w-5 h-5" /> {file.name}
          </div>
        ) : (
          <div className="text-center text-slate-500 text-sm">
            <Upload className="w-6 h-6 mx-auto mb-1 opacity-50" /> Click or drop CSV here
          </div>
        )}
      </label>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={!uploading ? onClose : undefined} />
      <div className="relative bg-white rounded-xl shadow-modal w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-800">Create Profile Universe</h2>
          {!uploading && <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>}
        </div>

        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="label">Profile Name</label>
                <input autoFocus value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. US Equities Tech Sector" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="input resize-none" rows={3} placeholder="Brief description..." />
              </div>
            </div>
          ) : (
            <div>
              <FileDrop label="Stocks CSV" desc="Columns: symbol, company, sector, exchange" file={stocksFile} setFile={setStocksFile} />
              <FileDrop label="Traders CSV" desc="Columns: trader_id, trader_name, desk, region" file={tradersFile} setFile={setTradersFile} />
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between">
          <button className="btn-secondary" disabled={uploading} onClick={() => step === 1 ? onClose() : setStep(1)}>
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button className="btn-primary" disabled={uploading || (step === 1 && name.length < 2)} onClick={() => step === 1 ? setStep(2) : handleCreate()}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {step === 1 ? 'Next' : 'Create & Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}
