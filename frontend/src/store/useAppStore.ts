import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Investigation, Alert, Case, AIMessage, TraderRiskSummary } from '@/types'

interface AppState {
  // Active investigation
  activeInvestigation: Investigation | null
  setActiveInvestigation: (inv: Investigation | null) => void
  recentVisited: string[]

  // Stock filter
  selectedSymbol: string | null  // null = "Overall Market"
  setSelectedSymbol: (s: string | null) => void

  // Available symbols in current investigation (populated dynamically from data)
  availableSymbols: string[]
  setAvailableSymbols: (symbols: string[]) => void

  // Alerts cache
  alerts: Alert[]
  setAlerts: (alerts: Alert[]) => void

  // Cases cache
  cases: Case[]
  setCases: (cases: Case[]) => void

  // Trader risk summaries
  traderRiskSummaries: TraderRiskSummary[]
  setTraderRiskSummaries: (summaries: TraderRiskSummary[]) => void

  // AI Panel
  aiPanelOpen: boolean
  toggleAIPanel: () => void
  setAIPanelOpen: (open: boolean) => void

  // AI context focus
  aiContextType: string
  aiContextId: string | null
  setAIContext: (type: string, id: string | null) => void

  // AI conversation history
  aiHistory: AIMessage[]
  addAIMessage: (msg: AIMessage) => void
  clearAIHistory: () => void

  // Investigation wizard
  wizardOpen: boolean
  setWizardOpen: (open: boolean) => void

  // Profile wizard
  profileWizardOpen: boolean
  setProfileWizardOpen: (open: boolean) => void

  // Trader trace
  traceTrader: string | null
  setTraceTrader: (id: string | null) => void

  // Investigations list (sidebar)
  investigations: Investigation[]
  setInvestigations: (invs: Investigation[]) => void
  addInvestigation: (inv: Investigation) => void
  removeInvestigation: (id: string) => void

  // Pinned Traders
  pinnedTraders: string[]
  togglePinnedTrader: (id: string) => void

  clearStore: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeInvestigation: null,
      recentVisited: [],
      setActiveInvestigation: (inv) => set(s => {
        let rv = s.recentVisited || [];
        if (inv) {
          rv = [inv.id, ...rv.filter(id => id !== inv.id)].slice(0, 3);
        }
        return { 
          activeInvestigation: inv, 
          recentVisited: rv,
          selectedSymbol: null, 
          alerts: [], 
          cases: [], 
          traderRiskSummaries: [], 
          availableSymbols: [], 
          aiHistory: [] 
        };
      }),

      selectedSymbol: null,
      setSelectedSymbol: (s) => set({ selectedSymbol: s }),

      availableSymbols: [],
      setAvailableSymbols: (symbols) => set({ availableSymbols: symbols }),

      alerts: [],
      setAlerts: (alerts) => {
        // Dynamically build trader risk summaries from alert data
        const summaries = buildTraderSummaries(alerts)
        set({ alerts, traderRiskSummaries: summaries })
      },

      cases: [],
      setCases: (cases) => set({ cases }),

      traderRiskSummaries: [],
      setTraderRiskSummaries: (summaries) => set({ traderRiskSummaries: summaries }),

      aiPanelOpen: false,
      toggleAIPanel: () => set(s => ({ aiPanelOpen: !s.aiPanelOpen })),
      setAIPanelOpen: (open) => set({ aiPanelOpen: open }),

      aiContextType: 'investigation',
      aiContextId: null,
      setAIContext: (type, id) => set({ aiContextType: type, aiContextId: id }),

      aiHistory: [],
      addAIMessage: (msg) => set(s => ({ aiHistory: [...s.aiHistory, msg] })),
      clearAIHistory: () => set({ aiHistory: [] }),

      wizardOpen: false,
      setWizardOpen: (open) => set({ wizardOpen: open }),

      profileWizardOpen: false,
      setProfileWizardOpen: (open) => set({ profileWizardOpen: open }),

      traceTrader: null,
      setTraceTrader: (id) => set({ traceTrader: id }),

      investigations: [],
      setInvestigations: (invs) => set({ investigations: invs }),
      addInvestigation: (inv) => set(s => ({ investigations: [inv, ...s.investigations] })),
      removeInvestigation: (id) => set(s => ({
        investigations: s.investigations.filter(i => i.id !== id),
        activeInvestigation: s.activeInvestigation?.id === id ? null : s.activeInvestigation,
      })),

      pinnedTraders: [],
      togglePinnedTrader: (id) => set(s => ({
        pinnedTraders: s.pinnedTraders.includes(id)
          ? s.pinnedTraders.filter(t => t !== id)
          : [...s.pinnedTraders, id]
      })),
      clearStore: () => set({
        activeInvestigation: null,
        recentVisited: [],
        selectedSymbol: null,
        availableSymbols: [],
        alerts: [],
        cases: [],
        traderRiskSummaries: [],
        aiHistory: [],
        investigations: []
      })
    }),
    {
      name: 'markettrace-state',
      partialize: (state) => ({
        investigations: state.investigations,
        activeInvestigation: state.activeInvestigation,
        pinnedTraders: state.pinnedTraders,
        recentVisited: state.recentVisited,
      }),
    }
  )
)

// Builds trader risk summaries purely from alert data — no hardcoding
function buildTraderSummaries(alerts: Alert[]): TraderRiskSummary[] {
  const PATTERN_SCORES: Record<string, number> = {
    'Spoofing': 85, 'Momentum Ignition': 80, 'Pump & Dump': 90,
    'Quote Stuffing': 70, 'Wash Trading': 75, 'Layering': 65, 'Close Manipulation': 72,
  }
  const SEV_MULT: Record<string, number> = { CRITICAL: 1.0, HIGH: 0.85, MEDIUM: 0.65, LOW: 0.40 }
  const CONF_MULT: Record<string, number> = { High: 1.0, Medium: 0.80, Low: 0.55 }

  const byTrader = new Map<string, Alert[]>()
  for (const alert of alerts) {
    if (!byTrader.has(alert.trader_id)) byTrader.set(alert.trader_id, [])
    byTrader.get(alert.trader_id)!.push(alert)
  }

  return Array.from(byTrader.entries()).map(([trader_id, traderAlerts]) => {
    const scores = traderAlerts.map(a =>
      (PATTERN_SCORES[a.pattern] || 60) * (SEV_MULT[a.severity] || 0.65) * (CONF_MULT[a.confidence] || 0.80)
    )
    const primary = Math.max(...scores)
    const patterns = [...new Set(traderAlerts.map(a => a.pattern))]
    const symbols = [...new Set(traderAlerts.map(a => a.symbol))]
    const frequencyBonus = Math.min(patterns.length * 4, 15)
    const symbolBonus = Math.min(symbols.length * 2.5, 10)
    const score = Math.min(primary + frequencyBonus + symbolBonus, 100)

    return {
      trader_id,
      risk_score: Math.round(score * 10) / 10,
      priority: score >= 85 ? 'Critical' : score >= 70 ? 'High' : score >= 50 ? 'Medium' : 'Low',
      patterns: patterns as any,
      alert_count: traderAlerts.length,
      symbol_count: symbols.length,
    } as TraderRiskSummary
  }).sort((a, b) => b.risk_score - a.risk_score)
}
