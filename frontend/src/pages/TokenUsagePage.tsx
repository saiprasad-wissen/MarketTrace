import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Zap, Coins, TrendingUp, Cpu } from 'lucide-react'
import api from '@/services/api'
import { formatNumber } from '@/lib/utils'

interface TokenMetrics {
  total_cost: number
  total_input: number
  total_output: number
  by_model: Record<string, number>
}

export function TokenUsagePage() {
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<TokenMetrics>('/settings/token-metrics').then(r => {
      setMetrics(r.data)
      setLoading(false)
    }).catch(e => {
      console.error(e)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="spinner scale-150" /></div>
  if (!metrics) return null

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary-600" />
          AI Token & Cost Analytics
        </h1>
        <p className="text-slate-500 mt-2 text-sm max-w-2xl">
          Monitor your real-time usage across Anthropic and Groq models. Cost is automatically tracked for every deep dive case analysis and copilot query.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 border-l-4 border-l-primary-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg"><Coins className="w-5 h-5" /></div>
            <h3 className="font-semibold text-slate-600">Total API Cost</h3>
          </div>
          <p className="text-4xl font-bold text-slate-900 mt-4">${metrics.total_cost.toFixed(4)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Zap className="w-5 h-5" /></div>
            <h3 className="font-semibold text-slate-600">Input Tokens</h3>
          </div>
          <p className="text-4xl font-bold text-slate-900 mt-4">{formatNumber(metrics.total_input)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
            <h3 className="font-semibold text-slate-600">Output Tokens</h3>
          </div>
          <p className="text-4xl font-bold text-slate-900 mt-4">{formatNumber(metrics.total_output)}</p>
        </motion.div>
      </div>

      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Cpu className="w-5 h-5 text-slate-400" /> Breakdown by Model
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(metrics.by_model).map(([model, cost], i) => (
          <motion.div key={model} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.05 }} className="card p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Model Name</p>
              <p className="font-semibold text-slate-800">{model}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">USD Cost</p>
              <p className="font-bold text-slate-900">${cost.toFixed(4)}</p>
            </div>
          </motion.div>
        ))}
        {Object.keys(metrics.by_model).length === 0 && (
          <div className="col-span-full p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-500">
            No API requests have been made yet.
          </div>
        )}
      </div>
    </div>
  )
}
