import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { investigationsApi, profilesApi } from '@/services/api'
import { useAppStore } from '@/store/useAppStore'
import type { Profile } from '@/types'
import { cn } from '@/lib/utils'

const BOOT_STAGES = [
  'Loading Dataset',
  'Validating Records',
  'Building Market Timeline',
  'Running Pattern Discovery',
  'Running Surveillance Engine',
  'Calculating Risk Scores',
  'Building Cases',
  'Generating Dashboards',
  'Preparing AI Context',
  'Generating Reports',
]

interface Props {
  profiles: Profile[]
  onCreated: () => void
  onClose: () => void
}

export function InvestigationWizard({ profiles, onCreated, onClose }: Props) {
  const { addInvestigation, setActiveInvestigation } = useAppStore()

  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [profileId, setProfileId] = useState('')
  const [tradesFile, setTradesFile] = useState<File | null>(null)
  const [contextFile, setContextFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [bootStage, setBootStage] = useState(0)
  const [bootProgress, setBootProgress] = useState(0)
  const [booting, setBooting] = useState(false)
  const [investigationId, setInvestigationId] = useState<string | null>(null)

  const canNext = () => {
    if (step === 1) return name.trim().length >= 2
    if (step === 2) return !!profileId
    if (step === 3) return !!tradesFile
    if (step === 4) return true // context is optional
    return true
  }

  const handleNext = async () => {
    setErrors([])
    if (step < 4) { setStep(s => s + 1); return }
    // Step 4 → Run
    await runInvestigation()
  }

  const runInvestigation = async () => {
    setBooting(true)
    setBootStage(0)
    setBootProgress(0)

    try {
      // Stage 0: Create investigation
      setBootStage(0); setBootProgress(5)
      const inv = await investigationsApi.create(name.trim(), profileId)
      setInvestigationId(inv.id)
      addInvestigation(inv)

      // Stage 1-2: Upload trades
      setBootStage(1); setBootProgress(15)
      await investigationsApi.uploadTrades(inv.id, tradesFile!)

      setBootStage(2); setBootProgress(25)
      await new Promise(r => setTimeout(r, 500))

      // Stage 3: Upload context (optional)
      setBootStage(3); setBootProgress(35)
      if (contextFile) {
        await investigationsApi.uploadContext(inv.id, contextFile)
      }

      // Stage 4-9: Run surveillance engine
      setBootStage(4); setBootProgress(45)
      await investigationsApi.run(inv.id)

      // Poll for completion
      for (let stage = 5; stage <= 9; stage++) {
        setBootStage(stage)
        setBootProgress(Math.min(99, 45 + stage * 6))
        await new Promise(r => setTimeout(r, 1500))
      }

      // Poll investigation status
      let attempts = 0
      while (attempts < 120) {
        await new Promise(r => setTimeout(r, 1500))
        const updated = await investigationsApi.get(inv.id)
        if (updated.status === 'ready') {
          setBootProgress(100)
          setActiveInvestigation(updated)
          addInvestigation(updated)
          break
        }
        if (updated.status === 'error') {
          setErrors(['Surveillance engine encountered an error. Check backend logs.'])
          setBooting(false)
          return
        }
        attempts++
      }

      onCreated()

    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (Array.isArray(detail?.errors)) {
        setErrors(detail.errors)
      } else {
        setErrors([err?.message || 'Unexpected error'])
      }
      setBooting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={!booting ? onClose : undefined} />

      <div className="modal">
        <motion.div
          className="modal-content max-w-xl"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2 }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">New Investigation</h2>
              {!booting && <p className="text-sm text-slate-400">Step {step} of 4</p>}
            </div>
            {!booting && (
              <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
            )}
          </div>

          {/* Progress dots */}
          {!booting && (
            <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  s === step ? 'bg-primary-600 flex-[2]' :
                  s < step   ? 'bg-primary-300 flex-1' : 'bg-slate-200 flex-1'
                )} />
              ))}
            </div>
          )}

          {/* Boot Sequence */}
          {booting && (
            <div className="p-8 flex-1">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Running Surveillance Engine</h3>
                <p className="text-sm text-slate-400 mt-1">Analyzing uploaded data for market abuse patterns</p>
              </div>

              {/* Overall progress */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Overall Progress</span>
                  <span className="tabular-nums">{bootProgress}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary-600 rounded-full"
                    animate={{ width: `${bootProgress}%` }}
                    transition={{ duration: 0.4 }} />
                </div>
              </div>

              {/* Stages */}
              <div className="space-y-2">
                {BOOT_STAGES.map((stage, i) => (
                  <motion.div key={stage}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3">
                    {i < bootStage ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : i === bootStage ? (
                      <Loader2 className="w-4 h-4 text-primary-500 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-200 shrink-0" />
                    )}
                    <span className={cn('text-sm',
                      i < bootStage  ? 'text-green-600 font-medium' :
                      i === bootStage ? 'text-primary-700 font-semibold' : 'text-slate-300'
                    )}>{stage}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Step Content */}
          {!booting && (
            <div className="p-6 flex-1">
              <AnimatePresence mode="wait">
                <motion.div key={step}
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.15 }}>

                  {step === 1 && (
                    <div>
                      <label className="label text-base">Investigation Name</label>
                      <input
                        autoFocus
                        className="input text-base py-3"
                        placeholder="e.g., NVDA Replay Session, Friday Market Run..."
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && canNext() && handleNext()}
                      />
                      <p className="text-xs text-slate-400 mt-2">Give it a descriptive name so you can find it later.</p>
                    </div>
                  )}

                  {step === 2 && (
                    <div>
                      <label className="label text-base">Select Profile</label>
                      <p className="text-sm text-slate-500 mb-3">
                        Choose a profile that contains the stocks and traders universe for this investigation.
                      </p>
                      {profiles.length === 0 ? (
                        <div className="text-center py-6 bg-amber-50 rounded-xl border border-amber-200">
                          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                          <p className="text-sm font-medium text-amber-700">No profiles yet</p>
                          <p className="text-xs text-amber-500 mt-1">Create a profile first with stocks and traders CSV files.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {profiles.map(p => (
                            <button key={p.id} onClick={() => setProfileId(p.id)}
                              className={cn(
                                'w-full text-left p-4 rounded-xl border-2 transition-all',
                                profileId === p.id
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              )}>
                              <p className="font-semibold text-slate-800">{p.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {p.stock_count} stocks · {p.trader_count} traders
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {step === 3 && (
                    <FileUploadStep
                      label="Upload Trades CSV"
                      description="Required columns: timestamp, trader_id, symbol, side, quantity, price, order_id, status"
                      file={tradesFile}
                      onFile={setTradesFile}
                      accept=".csv"
                    />
                  )}

                  {step === 4 && (
                    <FileUploadStep
                      label="Upload Context CSV (Optional)"
                      description="Columns: timestamp, symbol, type, severity, title, summary — for news, analyst, macro events"
                      file={contextFile}
                      onFile={setContextFile}
                      accept=".csv"
                      optional
                    />
                  )}

                </motion.div>
              </AnimatePresence>

              {errors.length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                  {errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-sm text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {e}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          {!booting && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
                className="btn-secondary">
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              <button onClick={handleNext} disabled={!canNext()}
                className="btn-primary disabled:opacity-40">
                {step === 4 ? 'Run Investigation' : 'Next'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function FileUploadStep({
  label, description, file, onFile, accept, optional
}: {
  label: string; description: string; file: File | null
  onFile: (f: File) => void; accept: string; optional?: boolean
}) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  return (
    <div>
      <label className="label text-base">
        {label} {optional && <span className="text-slate-400 font-normal text-sm">(optional)</span>}
      </label>
      <p className="text-xs text-slate-500 mb-3">{description}</p>
      <label
        className={cn('drop-zone block cursor-pointer', file && 'border-green-400 bg-green-50')}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}>
        <input type="file" accept={accept} className="hidden"
          onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div className="text-left">
              <p className="font-semibold text-green-700">{file.name}</p>
              <p className="text-xs text-green-500">{(file.size / 1024).toFixed(1)} KB — Click to replace</p>
            </div>
          </div>
        ) : (
          <div>
            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">Drop your CSV here or click to browse</p>
            <p className="text-xs text-slate-400 mt-1">CSV format required</p>
          </div>
        )}
      </label>
    </div>
  )
}
