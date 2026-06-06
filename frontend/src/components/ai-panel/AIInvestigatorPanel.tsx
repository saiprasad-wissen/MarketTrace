import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bot, Send, Loader2, ChevronRight, Sparkles } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { aiApi } from '@/services/api'
import type { AIMessage } from '@/types'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const QUICK_QUESTIONS = [
  'Why was this trader flagged?',
  'Summarize the evidence.',
  'Could this be a false positive?',
  'What rules triggered?',
  'Generate executive summary.',
  'Recommend escalation decision.',
]

export function AIInvestigatorPanel() {
  const {
    aiPanelOpen, setAIPanelOpen, activeInvestigation,
    aiContextType, aiContextId, aiHistory, addAIMessage, clearAIHistory, setAIContext,
  } = useAppStore()

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiHistory])

  const handleSend = async (question?: string) => {
    const q = question || input.trim()
    if (!q || !activeInvestigation) return

    setInput('')
    addAIMessage({ role: 'user', content: q })
    setLoading(true)

    try {
      const result = await aiApi.ask({
        question: q,
        investigation_id: activeInvestigation.id,
        context_type: aiContextType,
        context_id: aiContextId || undefined,
        conversation_history: aiHistory,
      })
      addAIMessage({ role: 'assistant', content: result.answer })
    } catch (err) {
      addAIMessage({ role: 'assistant', content: '❌ Failed to reach AI service. Please check your API key in Settings.' })
    } finally {
      setLoading(false)
    }
  }

  const isSelection = aiContextType === 'selection' && aiContextId
  
  const contextLabel = !isSelection && aiContextId
    ? `${aiContextType.charAt(0).toUpperCase() + aiContextType.slice(1)}: ${aiContextId}`
    : (!isSelection ? (activeInvestigation?.name || 'No investigation selected') : undefined)

  return (
    <AnimatePresence>
      {aiPanelOpen && (
        <motion.div
          className="ai-panel"
          initial={{ x: 'var(--ai-panel-width)' }}
          animate={{ x: 0 }}
          exit={{ x: 'var(--ai-panel-width)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}>

          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-violet-600 to-primary-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">AI Investigator</p>
                  <p className="text-white/60 text-[10px]">Investigation Copilot</p>
                </div>
              </div>
              <button onClick={() => setAIPanelOpen(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Context badge */}
            {contextLabel && (
              <div className="mt-2 bg-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-white/60 shrink-0" />
                <p className="text-white/80 text-[11px] font-medium truncate">{contextLabel}</p>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {aiHistory.length === 0 && (
              <div className="text-center py-6">
                <Bot className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">Ask me anything about this investigation</p>
                <p className="text-slate-300 text-xs mt-1">I have full context of all traders, alerts, and patterns.</p>
              </div>
            )}

            {aiHistory.map((msg, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[88%] rounded-xl px-3 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-50 text-slate-800 border border-slate-200'
                )}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Bot className="w-3 h-3 text-violet-500" />
                      <span className="text-[10px] font-semibold text-violet-600">AI Investigator</span>
                    </div>
                  )}
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="prose prose-slate prose-sm max-w-none text-xs leading-relaxed 
                                    prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2
                                    prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-pre:p-2 prose-pre:rounded-md">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
                  <span className="text-xs text-slate-500">Analyzing investigation data...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          <div className="px-3 py-2 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1.5">Quick Questions</p>
            <div className="flex flex-col gap-1">
              {QUICK_QUESTIONS.map(q => (
                <button key={q}
                  onClick={() => handleSend(q)}
                  disabled={loading || !activeInvestigation}
                  className="text-left text-xs text-primary-700 hover:bg-primary-50 px-2 py-1 rounded-lg 
                             transition-colors flex items-center gap-1.5 disabled:opacity-40">
                  <ChevronRight className="w-3 h-3 shrink-0" />
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-200">
            {isSelection && (
              <div className="mb-2 bg-slate-50 border-l-2 border-primary-500 px-3 py-2 rounded-r-lg text-xs relative">
                <span className="text-primary-600 font-semibold mb-0.5 block">Replying to selection:</span>
                <p className="text-slate-600 line-clamp-2 italic">"{aiContextId}"</p>
                <button onClick={() => setAIContext('investigation', null)} 
                  className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={activeInvestigation ? 'Ask about this investigation...' : 'Open an investigation first'}
                disabled={loading || !activeInvestigation}
                rows={2}
                className="flex-1 text-xs rounded-xl border border-slate-200 px-3 py-2 resize-none 
                           placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 
                           disabled:opacity-40"
              />
              <button onClick={() => handleSend()}
                disabled={!input.trim() || loading || !activeInvestigation}
                className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl disabled:opacity-40 
                           transition-colors shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <button onClick={clearAIHistory}
              className="text-[10px] text-slate-300 hover:text-slate-500 mt-1.5 transition-colors">
              Clear conversation
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
