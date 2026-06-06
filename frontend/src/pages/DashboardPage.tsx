import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Zap, Bot } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { investigationsApi, alertsApi, casesApi, tradesApi, profilesApi } from '@/services/api'
import { ExecutiveMetrics } from '@/components/dashboard/ExecutiveMetrics'
import { InvestigationQueue } from '@/components/dashboard/InvestigationQueue'
import { SuspiciousTraderTable } from '@/components/dashboard/SuspiciousTraderTable'
import { MarketContextPanel } from '@/components/dashboard/MarketContextPanel'
import { TraderNetworkGraph } from '@/components/dashboard/TraderNetworkGraph'
import {
  PriceVolumeChart, OrdersPerMinuteChart,
  CancellationChart, AlertDistributionChart, InvestigationFunnel, TraderRiskHeatmap,
} from '@/components/dashboard/Charts'
import { InvestigationWizard } from '@/components/investigation/InvestigationWizard'
import { ReplayEngine } from '@/components/replay/ReplayEngine'
import { useReplayStore } from '@/store/useReplayStore'
import type { Trade, ContextEvent, ProfileTrader } from '@/types'

export function DashboardPage() {
  const {
    activeInvestigation, selectedSymbol, setAlerts, setAvailableSymbols, availableSymbols,
    traderRiskSummaries, alerts, cases, setCases, wizardOpen, setWizardOpen,
    setInvestigations,
    setActiveInvestigation, setAIContext, setAIPanelOpen,
  } = useAppStore()
  const { openReplay } = useReplayStore()

  const [trades, setTrades] = useState<Trade[]>([])
  const [contextEvents, setContextEvents] = useState<ContextEvent[]>([])
  const [profileTraders, setProfileTraders] = useState<ProfileTrader[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  // Load profiles for wizard
  useEffect(() => {
    profilesApi.list().then(setProfiles).catch(() => {})
    investigationsApi.list().then(invs => {
      const activeInvs = invs.filter(i => i.status !== 'deleted')
      setInvestigations(activeInvs)
      
      const store = useAppStore.getState()
      if (store.activeInvestigation && !activeInvs.find(i => i.id === store.activeInvestigation?.id)) {
        store.setActiveInvestigation(null)
      }
    }).catch(() => {})
  }, [])

  // Load investigation data when active investigation changes or refreshes
  useEffect(() => {
    if (!activeInvestigation || activeInvestigation.status !== 'ready') {
      setTrades([])
      setAlerts([])
      setCases([])
      setContextEvents([])
      return
    }

    const load = async () => {
      try {
        const [tradeData, alertData, caseData, contextData, symbolData] = await Promise.all([
          tradesApi.list(activeInvestigation.id, { limit: 5000 }),
          alertsApi.list(activeInvestigation.id),
          casesApi.list({ investigation_id: activeInvestigation.id }),
          tradesApi.contextEvents(activeInvestigation.id),
          investigationsApi.getSymbols(activeInvestigation.id),
        ])

        setTrades(tradeData)
        setAlerts(alertData)  // Also computes trader risk summaries in store
        setCases(caseData)
        setContextEvents(contextData)
        setAvailableSymbols(symbolData)

        // Load profile traders for enrichment
        if (activeInvestigation.profile_id) {
          const profile = await profilesApi.get(activeInvestigation.profile_id)
          setProfileTraders(profile.traders || [])
        }
      } finally {
        // finished
      }
    }

    load()
  }, [activeInvestigation?.id, refreshKey])

  // Refresh investigation stats
  const refreshInv = async () => {
    if (!activeInvestigation) return
    const updated = await investigationsApi.get(activeInvestigation.id)
    setActiveInvestigation(updated)
    setRefreshKey(k => k + 1)
  }

  const handleWizardCreated = async () => {
    setWizardOpen(false)
    const invs = await investigationsApi.list()
    setInvestigations(invs.filter(i => i.status !== 'deleted'))
    setRefreshKey(k => k + 1)
  }

  // Filtered data based on selected symbol
  const filteredTrades = selectedSymbol ? trades.filter(t => t.symbol === selectedSymbol) : trades
  const filteredAlerts = selectedSymbol ? alerts.filter(a => a.symbol === selectedSymbol) : alerts
  const filteredCases = selectedSymbol ? cases.filter(c => c.symbol === selectedSymbol) : cases
  const filteredContextEvents = selectedSymbol ? contextEvents.filter(c => !c.symbol || c.symbol === selectedSymbol) : contextEvents

  // Dynamic counts for metrics and funnel
  const dynTrades = selectedSymbol ? filteredTrades.length : activeInvestigation.total_trades
  const dynAlerts = selectedSymbol ? filteredAlerts.length : activeInvestigation.total_alerts
  const dynCases = selectedSymbol ? filteredCases.length : cases.length
  const dynEscalated = selectedSymbol 
    ? filteredCases.filter(c => c.status === 'Escalated').length 
    : cases.filter(c => c.status === 'Escalated').length
  const dynTraders = selectedSymbol 
    ? new Set(filteredAlerts.map(a => a.trader_id)).size 
    : activeInvestigation.suspicious_traders

  // ─── No Investigation State ─────────────────────────────────────────────────

  if (!activeInvestigation) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-md">

            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-violet-600 rounded-3xl 
                            flex items-center justify-center mx-auto mb-6 shadow-elevated">
              <Zap className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to MarketTrace</h1>
            <p className="text-slate-500 mb-2 font-medium">AI-Powered Trade Surveillance & Investigation Workbench</p>
            <div className="text-slate-400 text-sm mb-8 space-y-1">
              <p>1,000 Trades → 50 Alerts → 10 Investigations → 5 Escalations</p>
            </div>

            <button onClick={() => setWizardOpen(true)}
              className="btn-primary text-base px-8 py-3 text-lg gap-3 shadow-lg hover:shadow-xl">
              <Zap className="w-5 h-5" />
              Start New Investigation
            </button>
            <p className="text-xs text-slate-400 mt-4">Upload stocks, traders, trades, and context CSV files</p>
          </motion.div>
        </div>

        {wizardOpen && (
          <InvestigationWizard
            profiles={profiles}
            onCreated={handleWizardCreated}
            onClose={() => setWizardOpen(false)}
          />
        )}
      </>
    )
  }

  // ─── Processing State ───────────────────────────────────────────────────────

  if (activeInvestigation.status === 'processing' || activeInvestigation.status === 'created') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner scale-150 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700">Running Surveillance Engine...</h2>
          <p className="text-sm text-slate-400 mt-1">Detecting patterns across all uploaded trade data</p>
          <button onClick={refreshInv} className="btn-secondary mt-4 text-sm gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Check Status
          </button>
        </div>
      </div>
    )
  }

  // ─── Main Dashboard ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{activeInvestigation.name}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {selectedSymbol ? `${selectedSymbol} Surveillance Room` : 'Overall Market Surveillance'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshInv} className="btn-secondary text-xs gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => openReplay(filteredTrades, filteredAlerts, filteredContextEvents)}
            className="btn-secondary text-xs gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Replay
          </button>
          <button
            onClick={() => { setAIContext('investigation', null); setAIPanelOpen(true) }}
            className="btn-primary text-xs gap-1.5">
            <Bot className="w-3.5 h-3.5" /> AI Investigator
          </button>
        </div>
      </div>

      {/* Executive Metrics */}
      <ExecutiveMetrics 
        trades={dynTrades}
        alerts={dynAlerts}
        cases={dynCases}
        escalated={dynEscalated}
        suspiciousTraders={dynTraders}
        stocksMonitored={availableSymbols.length}
        contextEventsCount={filteredContextEvents.length}
      />

      {/* Investigation Funnel + Alert Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-700">Investigation Funnel</h3>
          </div>
          <div className="card-body">
            <InvestigationFunnel
              trades={dynTrades}
              alerts={dynAlerts}
              cases={dynCases}
              escalated={dynEscalated}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-700">Alert Distribution by Pattern</h3>
          </div>
          <div className="card-body">
            <AlertDistributionChart alerts={filteredAlerts} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-700">Market Context Events</h3>
          </div>
          <div className="card-body">
            <MarketContextPanel events={contextEvents} filterSymbol={selectedSymbol} />
          </div>
        </div>
      </div>

      {/* Price Chart + Volume */}
      {filteredTrades.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <div className="card-body pt-4">
              <PriceVolumeChart trades={filteredTrades} symbol={selectedSymbol} />
            </div>
          </div>

          <div className="card">
            <div className="card-body pt-4">
              <OrdersPerMinuteChart trades={filteredTrades} symbol={selectedSymbol} />
            </div>
          </div>
        </div>
      )}

      {/* Cancellation + Heatmap */}
      {filteredAlerts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <div className="card-body pt-4">
              <CancellationChart trades={filteredTrades} symbol={selectedSymbol} />
            </div>
          </div>

          <div className="card">
            <div className="card-body pt-4">
              <TraderRiskHeatmap alerts={filteredAlerts} />
            </div>
          </div>
        </div>
      )}

      {/* Trader Network Graph */}
      {filteredAlerts.length > 0 && (
        <div className="card">
          <div className="card-body pt-4">
            <TraderNetworkGraph alerts={filteredAlerts} />
          </div>
        </div>
      )}

      {/* Suspicious Traders */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-slate-700">
            Suspicious Traders — {traderRiskSummaries.length} flagged
          </h3>
        </div>
        <div className="card-body">
          <SuspiciousTraderTable
            summaries={selectedSymbol
              ? traderRiskSummaries.filter(s => alerts.some(a => a.symbol === selectedSymbol && a.trader_id === s.trader_id))
              : traderRiskSummaries
            }
            profileTraders={profileTraders}
          />
        </div>
      </div>

      {/* Investigation Queue */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-slate-700">
            Investigation Queue — {filteredCases.length} cases
          </h3>
        </div>
        <div className="card-body">
          <InvestigationQueue
            cases={filteredCases}
            onRefresh={() => setRefreshKey(k => k + 1)}
          />
        </div>
      </div>

      {/* Modals & Overlays */}
      {wizardOpen && (
        <InvestigationWizard
          profiles={profiles}
          onCreated={handleWizardCreated}
          onClose={() => setWizardOpen(false)}
        />
      )}



      <ReplayEngine />
    </div>
  )
}
