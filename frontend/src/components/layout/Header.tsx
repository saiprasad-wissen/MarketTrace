import { Bot, ChevronDown, Download, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

export function Header() {
  const { activeInvestigation, selectedSymbol, setSelectedSymbol, availableSymbols, toggleAIPanel, aiPanelOpen } = useAppStore()

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
          <select
            value={selectedSymbol || ''}
            onChange={e => setSelectedSymbol(e.target.value || null)}
            className="select text-sm font-medium min-w-[180px] border-slate-200 rounded-lg px-3 py-1.5">
            <option value="">Overall Market</option>
            {availableSymbols.map(sym => (
              <option key={sym} value={sym}>{sym}</option>
            ))}
          </select>
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
            onClick={() => window.print()}
            className="btn-secondary text-xs gap-1.5 py-1.5">
            <Download className="w-3.5 h-3.5" />
            Export PDF
          </button>
        )}

        {/* Ask AI removed in favor of global text selection */}
      </div>
    </header>
  )
}
