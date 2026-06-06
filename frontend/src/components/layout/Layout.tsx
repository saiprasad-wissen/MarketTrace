import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAppStore } from '@/store/useAppStore'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { aiPanelOpen } = useAppStore()

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <Header />
      <main
        className="transition-all duration-300"
        style={{
          marginLeft: 'var(--sidebar-width)',
          marginTop: 'var(--header-height)',
          marginRight: aiPanelOpen ? 'var(--ai-panel-width)' : '0',
        }}>
        <div className="p-6 min-h-[calc(100vh-var(--header-height))]">
          {children}
        </div>
      </main>
    </div>
  )
}
