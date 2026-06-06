import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import type { Trade, Alert } from '@/types'
import { useMemo } from 'react'
import { patternColor } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

// ─── Price vs Time ────────────────────────────────────────────────────────────

interface PriceChartProps { trades: Trade[]; symbol?: string | null }

export function PriceVolumeChart({ trades, symbol }: PriceChartProps) {
  const { setAIContext, setAIPanelOpen } = useAppStore()
  const filtered = symbol ? trades.filter(t => t.symbol === symbol) : trades
  const data = useMemo(() => {
    const executed = filtered.filter(t => t.status === 'EXECUTE')
      .sort((a, b) => a.sequence_num - b.sequence_num)
    // Sample for performance: take up to 200 points
    const step = Math.max(1, Math.floor(executed.length / 200))
    return executed.filter((_, i) => i % step === 0).map(t => ({
      time: t.timestamp,
      price: t.price,
      symbol: t.symbol,
    }))
  }, [filtered])

  if (!data.length) return <EmptyChart label="No executed trades" />

  return (
    <div onDoubleClick={() => { setAIContext('graph', 'Price Activity Chart'); setAIPanelOpen(true) }} className="w-full h-full cursor-pointer">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={['auto', 'auto']} width={56} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            formatter={(v: number) => [`${v.toFixed(2)}`, 'Price']}
          />
          <Line type="monotone" dataKey="price" stroke="#1a56db" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Volume vs Time ───────────────────────────────────────────────────────────

export function VolumeChart({ trades, symbol }: PriceChartProps) {
  const { setAIContext, setAIPanelOpen } = useAppStore()
  const filtered = symbol ? trades.filter(t => t.symbol === symbol) : trades
  const data = useMemo(() => {
    const executed = filtered.filter(t => t.status === 'EXECUTE')
      .sort((a, b) => a.sequence_num - b.sequence_num)
    const step = Math.max(1, Math.floor(executed.length / 150))
    return executed.filter((_, i) => i % step === 0).map(t => ({
      time: t.timestamp,
      volume: t.quantity,
    }))
  }, [filtered])

  if (!data.length) return <EmptyChart label="No volume data" />

  return (
    <div onDoubleClick={() => { setAIContext('graph', 'Volume Activity Chart'); setAIPanelOpen(true) }} className="w-full h-full cursor-pointer">
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1a56db" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#1a56db" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={56} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
          <Area type="monotone" dataKey="volume" stroke="#1a56db" fill="url(#volumeGrad)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Orders Per Minute ────────────────────────────────────────────────────────

export function OrdersPerMinuteChart({ trades, symbol }: PriceChartProps) {
  const { setAIContext, setAIPanelOpen } = useAppStore()
  const filtered = symbol ? trades.filter(t => t.symbol === symbol) : trades
  const data = useMemo(() => {
    const buckets: Record<string, number> = {}
    filtered.filter(t => t.status === 'NEW').forEach(t => {
      const min = t.timestamp.slice(0, 5) // HH:MM
      buckets[min] = (buckets[min] || 0) + 1
    })
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, count]) => ({ time, count }))
  }, [filtered])

  if (!data.length) return <EmptyChart label="No order data" />

  return (
    <div onDoubleClick={() => { setAIContext('graph', 'Orders Per Minute Chart'); setAIPanelOpen(true) }} className="w-full h-full cursor-pointer">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={Math.max(1, Math.floor(data.length / 12))} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={40} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
          <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Orders" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Cancellation Activity ────────────────────────────────────────────────────

export function CancellationChart({ trades, symbol }: PriceChartProps) {
  const { setAIContext, setAIPanelOpen } = useAppStore()
  const filtered = symbol ? trades.filter(t => t.symbol === symbol) : trades
  const data = useMemo(() => {
    const cancels: Record<string, number> = {}
    filtered.filter(t => t.status === 'CANCEL').forEach(t => {
      cancels[t.trader_id] = (cancels[t.trader_id] || 0) + 1
    })
    return Object.entries(cancels)
      .map(([trader_id, cancellations]) => ({ trader_id, cancellations }))
      .sort((a, b) => b.cancellations - a.cancellations)
      .slice(0, 15)
  }, [filtered])

  if (!data.length) return <EmptyChart label="No cancellations detected" />

  return (
    <div onDoubleClick={() => { setAIContext('graph', 'Cancellation Activity by Trader Chart'); setAIPanelOpen(true) }} className="w-full h-full cursor-pointer">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis type="category" dataKey="trader_id" tick={{ fontSize: 10, fill: '#64748b' }} width={52} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
          <Bar dataKey="cancellations" fill="#ea580c" radius={[0, 2, 2, 0]} name="Cancellations" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Alert Distribution ────────────────────────────────────────────────────────

interface AlertChartProps { alerts: Alert[] }

export function AlertDistributionChart({ alerts }: AlertChartProps) {
  const { setAIContext, setAIPanelOpen } = useAppStore()
  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    alerts.forEach(a => { counts[a.pattern] = (counts[a.pattern] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value, color: patternColor(name) }))
  }, [alerts])

  if (!data.length) return <EmptyChart label="No alerts detected" />

  return (
    <div onDoubleClick={() => { setAIContext('graph', 'Alert Distribution Chart'); setAIPanelOpen(true) }} className="w-full h-full cursor-pointer">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={55} outerRadius={85}
            paddingAngle={3}
            dataKey="value">
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(v) => <span style={{ fontSize: 11, color: '#64748b' }}>{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Investigation Funnel ─────────────────────────────────────────────────────

interface FunnelProps {
  trades: number
  alerts: number
  cases: number
  escalated: number
}

export function InvestigationFunnel({ trades, alerts, cases, escalated }: FunnelProps) {
  const { setAIContext, setAIPanelOpen } = useAppStore()
  const stages = [
    { label: 'Trades', value: trades, color: '#1a56db', width: '100%' },
    { label: 'Alerts', value: alerts, color: '#ea580c', width: '70%' },
    { label: 'Cases', value: cases, color: '#be123c', width: '45%' },
    { label: 'Escalated', value: escalated, color: '#991b1b', width: '25%' },
  ]

  return (
    <div onDoubleClick={() => { setAIContext('graph', 'Investigation Funnel'); setAIPanelOpen(true) }} className="flex flex-col items-center gap-1 py-2 cursor-pointer w-full h-full">
      {stages.map((stage, i) => (
        <div key={stage.label} className="flex flex-col items-center w-full">
          <div className="flex items-center justify-between w-full mb-1 px-2">
            <span className="text-xs font-medium text-slate-500">{stage.label}</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: stage.color }}>
              {stage.value.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-center w-full">
            <div
              className="h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold shadow-sm transition-all duration-700"
              style={{ width: stage.width, backgroundColor: stage.color }}>
              {stage.value > 0 ? stage.value.toLocaleString() : '—'}
            </div>
          </div>
          {i < stages.length - 1 && (
            <div className="w-0.5 h-3 bg-slate-300 my-0.5" />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Trader Risk Heatmap ──────────────────────────────────────────────────────

interface HeatmapProps {
  alerts: Alert[]
}

const PATTERNS_ORDER = [
  'Spoofing', 'Quote Stuffing', 'Momentum Ignition',
  'Pump & Dump', 'Wash Trading', 'Layering', 'Close Manipulation',
]

export function TraderRiskHeatmap({ alerts }: HeatmapProps) {
  const { setAIContext, setAIPanelOpen } = useAppStore()
  const { traders, patterns, matrix } = useMemo(() => {
    const traderSet = new Set<string>()
    const patternSet = new Set<string>()
    const counts: Record<string, Record<string, number>> = {}

    alerts.forEach(a => {
      traderSet.add(a.trader_id)
      patternSet.add(a.pattern)
      if (!counts[a.trader_id]) counts[a.trader_id] = {}
      counts[a.trader_id][a.pattern] = (counts[a.trader_id][a.pattern] || 0) + 1
    })

    const traders = [...traderSet].slice(0, 12)
    const patterns = PATTERNS_ORDER.filter(p => patternSet.has(p))
    const maxCount = Math.max(1, ...Object.values(counts).flatMap(v => Object.values(v)))

    const matrix = traders.map(trader =>
      patterns.map(pattern => ({
        count: counts[trader]?.[pattern] || 0,
        intensity: (counts[trader]?.[pattern] || 0) / maxCount,
      }))
    )

    return { traders, patterns, matrix }
  }, [alerts])

  if (!traders.length) return <EmptyChart label="No alerts for heatmap" />

  return (
    <div onDoubleClick={() => { setAIContext('graph', 'Trader Risk Heatmap'); setAIPanelOpen(true) }} className="overflow-x-auto cursor-pointer">
      <div className="min-w-[400px]">
        {/* Header */}
        <div className="flex mb-1" style={{ marginLeft: 60 }}>
          {patterns.map(p => (
            <div key={p} className="flex-1 text-[9px] text-slate-500 font-medium text-center px-0.5 leading-tight">
              {p.split(' ').map((w, i) => <div key={i}>{w}</div>)}
            </div>
          ))}
        </div>
        {/* Rows */}
        {traders.map((trader, ti) => (
          <div key={trader} className="flex items-center mb-0.5">
            <div className="text-xs text-slate-600 font-mono w-[56px] shrink-0 truncate pr-1">{trader}</div>
            {patterns.map((pattern, pi) => {
              const cell = matrix[ti][pi]
              return (
                <div
                  key={pattern}
                  title={`${trader} · ${pattern}: ${cell.count} alert(s)`}
                  className="flex-1 h-6 mx-0.5 rounded flex items-center justify-center text-[9px] font-semibold transition-all"
                  style={{
                    backgroundColor: cell.intensity > 0
                      ? `${patternColor(pattern)}${Math.round(cell.intensity * 220 + 35).toString(16).padStart(2, '0')}`
                      : '#f8fafc',
                    color: cell.intensity > 0.5 ? '#fff' : '#94a3b8',
                  }}>
                  {cell.count > 0 ? cell.count : ''}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
      <span>{label}</span>
    </div>
  )
}
