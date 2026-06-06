import { useEffect, useState } from 'react'
import { Bot, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'

export function GlobalAIContextTrigger() {
  const { setAIPanelOpen, setAIContext } = useAppStore()
  const [selectionInfo, setSelectionInfo] = useState<{ text: string; x: number; y: number } | null>(null)

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        setSelectionInfo(null)
        return
      }

      // Check if inside an input or textarea
      const activeEl = document.activeElement
      if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') {
        setSelectionInfo(null)
        return
      }

      const text = selection.toString().trim()
      if (text.length > 2) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setSelectionInfo({
          text,
          x: rect.right + 10,
          y: rect.top - 30, // Just above the cursor
        })
      } else {
        setSelectionInfo(null)
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      // Don't close if they are clicking the popup itself
      const target = e.target as HTMLElement
      if (!target.closest('#ai-selection-popup')) {
        setSelectionInfo(null)
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  if (!selectionInfo) return null

  const handleAsk = () => {
    setAIContext('selection', selectionInfo.text)
    setAIPanelOpen(true)
    setSelectionInfo(null)
    window.getSelection()?.removeAllRanges()
  }

  return (
    <AnimatePresence>
      <motion.button
        id="ai-selection-popup"
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 10 }}
        onClick={handleAsk}
        style={{ top: selectionInfo.y, left: Math.min(selectionInfo.x, window.innerWidth - 120) }}
        className="fixed z-[9999] flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-full shadow-2xl border border-slate-700/50 hover:bg-primary-600 transition-colors cursor-pointer group"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-200" />
        <span className="text-xs font-semibold tracking-wide">Ask AI</span>
      </motion.button>
    </AnimatePresence>
  )
}
