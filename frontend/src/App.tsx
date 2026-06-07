import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { LandingPage } from '@/pages/public/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
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
import { useAuthStore } from '@/store/useAuthStore'

export default function App() {
  const { traceTrader, setTraceTrader, activeInvestigation } = useAppStore()
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout><Outlet /></Layout>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/investigations" element={<InvestigationsPage />} />
            <Route path="/profiles" element={<ProfilesPage />} />
            <Route path="/cases" element={<CasesPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/tokens" element={<TokenUsagePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

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
