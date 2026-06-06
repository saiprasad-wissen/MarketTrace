import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Search, FolderOpen, ClipboardList,
  FileText, Settings, Plus, ChevronRight, MoreHorizontal,
  Archive, Trash2, Copy, Pencil, AlertTriangle, ShieldAlert, BarChart2
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { investigationsApi } from '@/services/api'
import { useState } from 'react'
import { cn, timeAgo } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/investigations', icon: Search,           label: 'Investigations' },
  { to: '/profiles',       icon: FolderOpen,       label: 'Profiles' },
  { to: '/cases',          icon: ClipboardList,    label: 'Cases' },
  { to: '/watchlist',      icon: ShieldAlert,      label: 'Watchlist' },
  { to: '/tokens',         icon: BarChart2,        label: 'Token Usage' },
  { to: '/settings',       icon: Settings,         label: 'Settings' },
]

export function Sidebar() {
  const { investigations, activeInvestigation, setActiveInvestigation, setWizardOpen, removeInvestigation, recentVisited } = useAppStore()
  const navigate = useNavigate()
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const handleNewInvestigation = () => {
    setWizardOpen(true)
    navigate('/dashboard')
  }

  const handleSelectInvestigation = (inv: any) => {
    setActiveInvestigation(inv)
    navigate('/dashboard')
  }

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setContextMenu({ id, x: e.clientX, y: e.clientY })
  }

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return
    await investigationsApi.update(id, { name: renameValue.trim() })
    const updated = await investigationsApi.get(id)
    useAppStore.setState(s => ({
      investigations: s.investigations.map(i => i.id === id ? updated : i),
      activeInvestigation: s.activeInvestigation?.id === id ? updated : s.activeInvestigation,
    }))
    setRenamingId(null)
    setContextMenu(null)
  }

  const handleDelete = async (id: string) => {
    await investigationsApi.delete(id)
    removeInvestigation(id)
    setContextMenu(null)
  }

  return (
    <>
      <aside className="fixed top-0 left-0 h-screen bg-navy-800 flex flex-col z-30"
             style={{ width: 'var(--sidebar-width)' }}>

        {/* Brand */}
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-sm tracking-wide">MarketTrace</span>
              <p className="text-white/40 text-[10px] font-medium uppercase tracking-widest">Surveillance</p>
            </div>
          </div>
        </div>

        {/* New Investigation */}
        <div className="px-3 py-3 border-b border-white/10">
          <button onClick={handleNewInvestigation}
            className="w-full flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white 
                       rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150 
                       shadow-md hover:shadow-lg active:scale-95">
            <Plus className="w-4 h-4" />
            New Investigation
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-3 space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => cn('sidebar-link', isActive && 'active')}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-3 my-2 border-t border-white/10" />

        {/* Recent Investigations */}
        <div className="flex-1 overflow-hidden flex flex-col px-3">
          <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-1 mb-2">
            Recent Investigations
          </p>
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            <AnimatePresence>
              {recentVisited.map(id => investigations.find(i => i.id === id)).filter(Boolean).map((inv: any) => (
                <motion.div key={inv.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
                  {renamingId === inv.id ? (
                    <input
                      autoFocus
                      className="w-full bg-white/10 text-white text-xs px-2 py-1.5 rounded outline-none border border-primary-500"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(inv.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      onBlur={() => setRenamingId(null)}
                    />
                  ) : (
                    <button
                      onClick={() => handleSelectInvestigation(inv)}
                      onContextMenu={(e) => handleContextMenu(e, inv.id)}
                      className={cn(
                        'w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all group',
                        activeInvestigation?.id === inv.id
                          ? 'bg-primary-600/25 text-white border border-primary-500/40'
                          : 'text-white/60 hover:text-white hover:bg-white/8'
                      )}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate font-medium">{inv.name}</span>
                        <MoreHorizontal className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                          inv.status === 'ready' ? 'bg-green-400' :
                          inv.status === 'processing' ? 'bg-amber-400 live-indicator' :
                          inv.status === 'error' ? 'bg-red-400' : 'bg-slate-500'
                        )} />
                        <span className="text-white/30 text-[10px] truncate">{timeAgo(inv.created_at)}</span>
                      </div>
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {investigations.length === 0 && (
              <p className="text-white/25 text-xs px-2 py-3 text-center">No investigations yet</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-white/20 text-[10px] text-center">MarketTrace v1.0 · Enterprise</p>
        </div>
      </aside>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }}
              className="fixed z-50 bg-white rounded-xl shadow-modal border border-slate-200 py-1 min-w-[160px]"
              style={{ top: contextMenu.y, left: contextMenu.x }}>
              {[
                { icon: Pencil, label: 'Rename', action: () => {
                  const inv = investigations.find(i => i.id === contextMenu.id)
                  setRenameValue(inv?.name || '')
                  setRenamingId(contextMenu.id)
                  setContextMenu(null)
                }},
                { icon: Copy, label: 'Duplicate', action: () => setContextMenu(null) },
                { icon: Archive, label: 'Archive', action: () => {
                  investigationsApi.update(contextMenu.id, { status: 'archived' })
                  setContextMenu(null)
                }},
                { icon: Trash2, label: 'Delete', action: () => handleDelete(contextMenu.id), danger: true },
              ].map(({ icon: Icon, label, action, danger }) => (
                <button key={label} onClick={action}
                  className={cn(
                    'flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm transition-colors',
                    danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
                  )}>
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
