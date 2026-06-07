import { Bot, ChevronDown, Download } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'
import { Search, Globe, TrendingUp, X } from 'lucide-react'

export function Header() {
  const { activeInvestigation, selectedSymbol, setSelectedSymbol, availableSymbols, toggleAIPanel, aiPanelOpen } = useAppStore()
  const [isExporting, setIsExporting] = useState(false)

  const handleExportPdf = async () => {
    if (!activeInvestigation) return
    setIsExporting(true)
    try {
      // Direct fetch to backend to get the PDF blob
      const baseUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
      const response = await fetch(`${baseUrl}/reports/investigation-dossier?investigation_id=${activeInvestigation.id}`)
      if (!response.ok) throw new Error('Failed to generate report')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Market_Report_${activeInvestigation.name.replace(/ /g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert("Failed to export PDF.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <header
      className="fixed top-0 bg-white border-b border-slate-200 z-20 flex items-center justify-between px-5 gap-4 shadow-sm"
      style={{
        left: 'var(--sidebar-width)',
        right: aiPanelOpen ? 'var(--ai-panel-width)' : '0',
        height: 'var(--header-height)',
        transition: 'right 0.3s ease',
      }}>

      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-slate-400 text-sm">MarketTrace</span>
        {activeInvestigation && (
          <>
            <ChevronDown className="w-3.5 h-3.5 text-slate-300 rotate-[-90deg] shrink-0" />
            <span className="font-semibold text-slate-800 text-sm truncate max-w-[240px]">
              {activeInvestigation.name}
            </span>
            <span className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full border ml-1 shrink-0',
              activeInvestigation.status === 'ready'
                ? 'bg-green-50 text-green-700 border-green-200'
                : activeInvestigation.status === 'processing'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : activeInvestigation.status === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            )}>
              {activeInvestigation.status.toUpperCase()}
            </span>
          </>
        )}
      </div>

      {/* Center: Stock Filter */}
      {activeInvestigation?.status === 'ready' && availableSymbols.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Surveillance Scope:</span>
          <SymbolDropdown
            value={selectedSymbol}
            symbols={availableSymbols}
            onChange={setSelectedSymbol}
          />
          {selectedSymbol && (
            <span className="text-xs font-semibold text-primary-600 bg-primary-50 border border-primary-200 
                             px-2 py-0.5 rounded-full animate-fade-in">
              {selectedSymbol} Surveillance Room
            </span>
          )}
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {activeInvestigation?.status === 'ready' && (
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="btn-secondary text-xs gap-1.5 py-1.5 min-w-[100px] justify-center">
            {isExporting ? <div className="spinner w-3.5 h-3.5 border-slate-400 border-t-slate-600" /> : <Download className="w-3.5 h-3.5" />}
            {isExporting ? 'Generating...' : 'Export PDF'}
          </button>
        )}

        {/* Ask AI removed in favor of global text selection */}
      </div>
    </header>
  )
}

// ─── Custom Symbol Dropdown ───────────────────────────────────────────────────

const SYMBOL_COLORS: Record<string, string> = {
  AAPL: '#1d4ed8', MSFT: '#0f766e', NVDA: '#7c3aed', TSLA: '#dc2626',
  AMZN: '#b45309', GOOGL: '#059669', META: '#2563eb', NFLX: '#dc2626',
  RELIANCE: '#0369a1', TCS: '#4338ca', INFY: '#0d9488', HDFCBANK: '#b45309',
}
function symbolColor(sym: string) {
  return SYMBOL_COLORS[sym] ?? '#64748b'
}

interface SymbolDropdownProps {
  value: string | null
  symbols: string[]
  onChange: (sym: string | null) => void
}

function SymbolDropdown({ value, symbols, onChange }: SymbolDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else setSearch('')
  }, [open])

  const filtered = symbols.filter(s => s.toLowerCase().includes(search.toLowerCase()))
  const label = value ?? 'Overall Market'

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold',
          'transition-all duration-200 min-w-[190px] justify-between',
          'shadow-sm hover:shadow-md',
          open
            ? 'border-primary-400 bg-primary-50 text-primary-700 ring-2 ring-primary-100'
            : 'border-slate-200 bg-white text-slate-800 hover:border-primary-300 hover:bg-slate-50'
        )}
      >
        <div className="flex items-center gap-2">
          {value ? (
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: symbolColor(value) }} />
          ) : (
            <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          )}
          <span className="truncate">{label}</span>
        </div>
        <ChevronDown
          className={cn('w-4 h-4 flex-shrink-0 transition-transform duration-200', open ? 'rotate-180 text-primary-500' : 'text-slate-400')}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute top-full mt-2 left-0 z-50 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
          style={{ animation: 'dropdownIn 0.15s ease' }}
        >
          {/* Search box */}
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
              <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search symbol..."
                className="bg-transparent text-sm text-slate-700 outline-none w-full placeholder:text-slate-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Overall Market option */}
          <div className="px-2 pt-2">
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                !value
                  ? 'bg-primary-50 text-primary-700 border border-primary-200'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', !value ? 'bg-primary-100' : 'bg-slate-100')}>
                <Globe className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-xs">Overall Market</div>
                <div className="text-[10px] text-slate-400">All symbols combined</div>
              </div>
              {!value && <span className="ml-auto text-[10px] bg-primary-600 text-white px-1.5 py-0.5 rounded-full font-bold">ACTIVE</span>}
            </button>
          </div>

          {/* Divider */}
          {filtered.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[10px] text-slate-400 font-medium">{filtered.length} SYMBOLS</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
          )}

          {/* Symbol list */}
          <div className="max-h-52 overflow-y-auto px-2 pb-2 space-y-0.5" style={{ scrollbarWidth: 'thin' }}>
            {filtered.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">No symbols match "{search}"</div>
            ) : (
              filtered.map(sym => (
                <button
                  key={sym}
                  onClick={() => { onChange(sym); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                    value === sym
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'text-slate-700 hover:bg-slate-50 hover:translate-x-0.5'
                  )}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[9px] font-bold"
                    style={{ backgroundColor: symbolColor(sym) }}
                  >
                    {sym.slice(0, 2)}
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-xs">{sym}</div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-2.5 h-2.5 text-slate-300" />
                      <span className="text-[10px] text-slate-400">Click to filter</span>
                    </div>
                  </div>
                  {value === sym && <span className="text-[10px] bg-primary-600 text-white px-1.5 py-0.5 rounded-full font-bold">ACTIVE</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
