import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProfilesPage } from '@/pages/ProfilesPage'
import { InvestigationsPage } from '@/pages/InvestigationsPage'
import { CasesPage } from '@/pages/CasesPage'
import { WatchlistPage } from '@/pages/WatchlistPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TokenUsagePage } from '@/pages/TokenUsagePage'
import { AIInvestigatorPanel } from '@/components/ai-panel/AIInvestigatorPanel'
import { TraderTraceModal } from '@/components/trader-trace/TraderTraceModal'
import { GlobalAIContextTrigger } from '@/components/ai-panel/GlobalAIContextTrigger'
import { useAppStore } from '@/store/useAppStore'

export default function App() {
  const { traceTrader, setTraceTrader, activeInvestigation } = useAppStore()
  
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/investigations" element={<InvestigationsPage />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/cases" element={<CasesPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/tokens" element={<TokenUsagePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
      <AIInvestigatorPanel />
      <GlobalAIContextTrigger />
      {traceTrader && activeInvestigation && (
        <TraderTraceModal
          traderId={traceTrader}
          investigationId={activeInvestigation.id}
          onClose={() => setTraceTrader(null)}
        />
      )}
    </BrowserRouter>
  )
}
