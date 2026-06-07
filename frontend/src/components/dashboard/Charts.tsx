import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine, Brush
} from 'recharts'
import type { Trade, Alert } from '@/types'
import { useMemo } from 'react'
import { patternColor, riskScoreColor } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { TrendingUp, TrendingDown, AlertTriangle, Activity, BarChart2, XCircle, ArrowUpRight, Briefcase, ShieldAlert } from 'lucide-react'

// ─── Shared Tooltip Style ─────────────────────────────────────────────────────

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  padding: '8px 12px',
  backgroundColor: '#fff',
}

// ─── Chart Section Header ─────────────────────────────────────────────────────

function ChartHeader({ icon, title, subtitle, badge }: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  badge?: { label: string; color: string; bg: string }
}) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-700 leading-tight">{title}</p>
          {subtitle && <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {badge && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: badge.color, backgroundColor: badge.bg }}>
          {badge.label}
        </span>
      )}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyChart({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-36 gap-2 text-slate-400">
      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
        {icon ?? <Activity className="w-5 h-5" />}
      </div>
      <span className="text-xs">{label}</span>
    </div>
  )
}

// ─── Custom Tooltip Components ────────────────────────────────────────────────

const PriceTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value as number
  return (
    <div style={tooltipStyle} className="space-y-1">
      <p className="text-[10px] text-slate-400 font-medium">{label}</p>
      <p className="text-sm font-bold text-blue-600">₹ {val?.toFixed(2)}</p>
    </div>
  )
}

const OrderTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle} className="space-y-1">
      <p className="text-[10px] text-slate-400 font-medium">Time: {label}</p>
      <p className="text-sm font-bold text-blue-700">{payload[0]?.value} new orders</p>
    </div>
  )
}

const CancelTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle} className="space-y-1">
      <p className="text-[10px] text-slate-400 font-medium">Trader: {payload[0]?.payload?.trader_id}</p>
      <p className="text-sm font-bold text-orange-600">{payload[0]?.value} cancellations</p>
      <p className="text-[10px] text-slate-400">High cancellation rate indicates spoofing / layering</p>
    </div>
  )
}

// ─── Price Activity Chart ─────────────────────────────────────────────────────

interface PriceChartProps { trades: Trade[]; symbol?: string | null }

export function PriceVolumeChart({ trades, symbol }: PriceChartProps) {
  const { setAIContext, setAIPanelOpen } = useAppStore()
  const filtered = symbol ? trades.filter(t => t.symbol === symbol) : trades

  const { data, minPrice, maxPrice, trend } = useMemo(() => {
    const executed = filtered.filter(t => t.status === 'EXECUTE')
      .sort((a, b) => a.sequence_num - b.sequence_num)
    const step = Math.max(1, Math.floor(executed.length / 200))
    const pts = executed.filter((_, i) => i % step === 0).map(t => ({
      time: t.timestamp.slice(0, 5),
      price: t.price,
      symbol: t.symbol,
    }))
    const prices = pts.map(p => p.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const trend = pts.length >= 2 ? (pts[pts.length - 1].price > pts[0].price ? 'up' : 'down') : 'flat'
    return { data: pts, minPrice, maxPrice, trend }
  }, [filtered])

  if (!data.length) return <EmptyChart label="No executed trades to display" icon={<TrendingUp className="w-5 h-5" />} />

  const trendColor = trend === 'up' ? '#16a34a' : '#dc2626'

  return (
    <div
      onDoubleClick={() => { setAIContext('graph', 'Price Activity Chart'); setAIPanelOpen(true) }}
      className="cursor-pointer"
    >
      <ChartHeader
        icon={<TrendingUp className="w-4 h-4" />}
        title="Price Movement"
        subtitle={symbol ? `${symbol} executed trade prices over time` : 'All-symbol price trail'}
        badge={trend !== 'flat' ? {
          label: trend === 'up' ? `▲ Uptrend` : `▼ Downtrend`,
          color: trendColor,
          bg: trend === 'up' ? '#f0fdf4' : '#fef2f2',
        } : undefined}
      />

      {/* Summary strip */}
      <div className="flex gap-4 mb-2 px-1">
        <div className="text-center">
          <p className="text-[9px] text-slate-400 uppercase tracking-wide">Low</p>
          <p className="text-xs font-bold text-slate-600">₹{minPrice.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-slate-400 uppercase tracking-wide">High</p>
          <p className="text-xs font-bold text-slate-600">₹{maxPrice.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-slate-400 uppercase tracking-wide">Points</p>
          <p className="text-xs font-bold text-slate-600">{data.length}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1a56db" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#1a56db" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            domain={['auto', 'auto']}
            width={58}
            tickFormatter={(v) => `₹${v}`}
          />
          <Tooltip content={<PriceTooltip />} />
          <Area type="monotone" dataKey="price" stroke="#1a56db" strokeWidth={2} fill="url(#priceGrad)" dot={false} activeDot={{ r: 5, fill: '#1a56db', strokeWidth: 2, stroke: '#fff' }} />
          <Brush 
            dataKey="time" 
            height={24} 
            stroke="#3b82f6" 
            fill="#f8fafc" 
            travellerWidth={8}
            tickFormatter={() => ''}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-slate-400 text-center mt-1.5 flex items-center justify-center gap-1.5">
        <span className="w-2.5 h-1.5 rounded-sm bg-blue-400"></span>
        Drag the slider to filter time range
      </p>
    </div>
  )
}

// ─── Orders Per Minute ────────────────────────────────────────────────────────

export function OrdersPerMinuteChart({ trades, symbol }: PriceChartProps) {
  const { setAIContext, setAIPanelOpen } = useAppStore()
  const filtered = symbol ? trades.filter(t => t.symbol === symbol) : trades

  const { data, peak } = useMemo(() => {
    const buckets: Record<string, number> = {}
    filtered.filter(t => t.status === 'NEW').forEach(t => {
      const min = t.timestamp.slice(0, 5)
      buckets[min] = (buckets[min] || 0) + 1
    })
    const pts = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, count]) => ({ time, count }))
    const peak = pts.reduce((max, p) => p.count > max.count ? p : max, { time: '', count: 0 })
    return { data: pts, peak }
  }, [filtered])

  if (!data.length) return <EmptyChart label="No new orders placed" icon={<BarChart2 className="w-5 h-5" />} />

  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div
      onDoubleClick={() => { setAIContext('graph', 'Orders Per Minute Chart'); setAIPanelOpen(true) }}
      className="cursor-pointer"
    >
      <ChartHeader
        icon={<BarChart2 className="w-4 h-4" />}
        title="Order Activity"
        subtitle="New orders placed per minute — spikes may indicate quote stuffing"
        badge={{ label: `${total} total orders`, color: '#1d4ed8', bg: '#eff6ff' }}
      />

      <div className="flex gap-4 mb-2 px-1">
        <div>
          <p className="text-[9px] text-slate-400 uppercase tracking-wide">Peak Time</p>
          <p className="text-xs font-bold text-blue-600">{peak.time || '—'}</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400 uppercase tracking-wide">Peak Volume</p>
          <p className="text-xs font-bold text-slate-700">{peak.count} orders/min</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            interval={Math.max(1, Math.floor(data.length / 10))}
          />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={36} />
          {peak.time && <ReferenceLine x={peak.time} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: 'PEAK', position: 'top', fontSize: 9, fill: '#f59e0b' }} />}
          <Tooltip content={<OrderTooltip />} />
          <Bar dataKey="count" fill="url(#orderGrad)" radius={[3, 3, 0, 0]} name="Orders" />
          <Brush 
            dataKey="time" 
            height={24} 
            stroke="#3b82f6" 
            fill="#f8fafc" 
            travellerWidth={8}
            tickFormatter={() => ''}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-slate-400 text-center mt-1.5 flex items-center justify-center gap-1.5">
        <span className="w-2.5 h-1.5 rounded-sm bg-blue-400"></span>
        Drag the slider to filter time range
      </p>
    </div>
  )
}

// ─── Cancellation Activity ────────────────────────────────────────────────────

export function CancellationChart({ trades, symbol }: PriceChartProps) {
  const { setAIContext, setAIPanelOpen } = useAppStore()
  const filtered = symbol ? trades.filter(t => t.symbol === symbol) : trades

  const { data, threshold } = useMemo(() => {
    const cancels: Record<string, number> = {}
    const total: Record<string, number> = {}
    filtered.forEach(t => {
      total[t.trader_id] = (total[t.trader_id] || 0) + 1
      if (t.status === 'CANCEL') cancels[t.trader_id] = (cancels[t.trader_id] || 0) + 1
    })
    const pts = Object.entries(cancels)
      .map(([trader_id, cancellations]) => ({
        trader_id,
        cancellations,
        rate: Math.round((cancellations / (total[trader_id] || 1)) * 100),
      }))
      .sort((a, b) => b.cancellations - a.cancellations)
      .slice(0, 12)
    const avg = pts.length ? pts.reduce((s, d) => s + d.cancellations, 0) / pts.length : 0
    return { data: pts, threshold: Math.round(avg) }
  }, [filtered])

  if (!data.length) return <EmptyChart label="No cancellations detected" icon={<XCircle className="w-5 h-5" />} />

  return (
    <div
      onDoubleClick={() => { setAIContext('graph', 'Cancellation Activity by Trader Chart'); setAIPanelOpen(true) }}
      className="cursor-pointer"
    >
      <ChartHeader
        icon={<XCircle className="w-4 h-4" />}
        title="Cancellations by Trader"
        subtitle="High cancel rates are a key spoofing & layering indicator"
        badge={{ label: `Top ${data.length} traders`, color: '#ea580c', bg: '#fff7ed' }}
      />

      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="cancelGrad" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={true} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis
            type="category"
            dataKey="trader_id"
            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
            width={56}
          />
          {threshold > 0 && (
            <ReferenceLine x={threshold} stroke="#f59e0b" strokeDasharray="4 3"
              label={{ value: 'Avg', position: 'top', fontSize: 9, fill: '#f59e0b' }} />
          )}
          <Tooltip content={<CancelTooltip />} />
          <Bar
            dataKey="cancellations"
            fill="url(#cancelGrad)"
            radius={[0, 4, 4, 0]}
            name="Cancellations"
            label={{ position: 'right', fontSize: 10, fill: '#94a3b8', formatter: (v: number) => v }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Alert Distribution Donut ─────────────────────────────────────────────────

interface AlertChartProps { alerts: Alert[] }

export function AlertDistributionChart({ alerts }: AlertChartProps) {
  const { setAIContext, setAIPanelOpen } = useAppStore()

  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    alerts.forEach(a => { counts[a.pattern] = (counts[a.pattern] || 0) + 1 })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value, color: patternColor(name) }))
  }, [alerts])

  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (!data.length) return <EmptyChart label="No alerts detected" icon={<AlertTriangle className="w-5 h-5" />} />

  const top = data[0]
  const topPct = total > 0 ? ((top.value / total) * 100).toFixed(0) : '0'

  return (
    <div
      onDoubleClick={() => { setAIContext('graph', 'Alert Distribution Chart'); setAIPanelOpen(true) }}
      className="cursor-pointer"
    >
      <ChartHeader
        icon={<AlertTriangle className="w-4 h-4" />}
        title="Alert Distribution"
        subtitle="Breakdown of detected manipulation patterns"
        badge={{ label: `Top: ${top?.name} (${topPct}%)`, color: patternColor(top?.name ?? ''), bg: '#fef2f2' }}
      />

      {/* Donut + center label overlay */}
      <div className="relative" style={{ height: 190 }}>
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius={55} outerRadius={82}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={2}
              stroke="#fff"
              labelLine={false}
            >
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, name: string) => [`${v} alerts  (${((v / total) * 100).toFixed(1)}%)`, name]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label — pure CSS overlay, no Recharts Label */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <span className="text-2xl font-extrabold text-slate-800 leading-none">{total}</span>
          <span className="text-[9px] font-semibold text-slate-400 tracking-widest mt-1">ALERTS</span>
        </div>
      </div>

      {/* Legend grid */}
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 px-1">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5 min-w-0 group">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-[10px] text-slate-600 truncate leading-tight flex-1">{entry.name}</span>
            <span
              className="text-[10px] font-bold flex-shrink-0 px-1 rounded"
              style={{ color: entry.color, backgroundColor: entry.color + '18' }}
            >
              {entry.value}
            </span>
          </div>
        ))}
      </div>
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

// Icon components for each funnel stage
const FUNNEL_STAGES_META = [
  {
    label: 'Trades',
    color: '#1a56db',
    iconBg: '#eff6ff',
    desc: 'Raw trades ingested',
    Icon: BarChart2,
  },
  {
    label: 'Alerts',
    color: '#ea580c',
    iconBg: '#fff7ed',
    desc: 'Suspicious patterns flagged',
    Icon: ShieldAlert,
  },
  {
    label: 'Cases',
    color: '#be123c',
    iconBg: '#fff1f2',
    desc: 'Cases created for review',
    Icon: Briefcase,
  },
  {
    label: 'Escalated',
    color: '#7f1d1d',
    iconBg: '#fef2f2',
    desc: 'for enforcement',
    Icon: ArrowUpRight,
  },
]

export function InvestigationFunnel({ trades, alerts, cases, escalated }: FunnelProps) {
  const { setAIContext, setAIPanelOpen } = useAppStore()

  const values = [trades, alerts, cases, escalated]
  const pcts = [
    100,
    trades > 0 ? (alerts / trades) * 100 : 0,
    alerts > 0 ? (cases / alerts) * 100 : 0,
    cases > 0 ? (escalated / cases) * 100 : 0,
  ]
  const widths = ['100%', '72%', '46%', '26%']

  return (
    <div
      onDoubleClick={() => { setAIContext('graph', 'Investigation Funnel'); setAIPanelOpen(true) }}
      className="flex flex-col gap-2 py-1 cursor-pointer"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Activity className="w-4 h-4 text-slate-400" />
        <p className="text-xs font-bold text-slate-700">Investigation Funnel</p>
        <p className="text-[10px] text-slate-400 ml-1">Trades → Escalation pipeline</p>
      </div>

      {FUNNEL_STAGES_META.map(({ label, color, iconBg, desc, Icon }, i) => (
        <div key={label} className="group relative">
          <div className="flex items-center justify-between mb-1 px-1">
            <div className="flex items-center gap-2">
              {/* Professional icon box instead of emoji */}
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: iconBg, border: `1px solid ${color}22` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-bold text-slate-700 shrink-0">{label}</span>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">{desc}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold tabular-nums" style={{ color }}>
                {values[i].toLocaleString()}
              </span>
              {i > 0 && (
                <span className="text-[10px] text-slate-400 ml-1">
                  ({pcts[i].toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
          <div className="relative h-7 w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
            <div
              className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-700"
              style={{ width: widths[i], backgroundColor: color }}
            >
              {values[i] > 0 && (
                <span className="text-white text-[10px] font-bold">{values[i].toLocaleString()}</span>
              )}
            </div>
          </div>
          {i < FUNNEL_STAGES_META.length - 1 && (
            <div className="flex justify-center mt-0.5">
              <div className="w-px h-2 bg-slate-200" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Trader Risk Heatmap ──────────────────────────────────────────────────────

interface HeatmapProps { alerts: Alert[] }

const PATTERNS_ORDER = [
  'Spoofing', 'Quote Stuffing', 'Momentum Ignition',
  'Pump & Dump', 'Wash Trading', 'Layering', 'Close Manipulation',
]

export function TraderRiskHeatmap({ alerts }: HeatmapProps) {
  const { setAIContext, setAIPanelOpen } = useAppStore()

  const { traders, patterns, matrix, traderTotals } = useMemo(() => {
    const traderSet = new Set<string>()
    const patternSet = new Set<string>()
    const counts: Record<string, Record<string, number>> = {}

    alerts.forEach(a => {
      traderSet.add(a.trader_id)
      patternSet.add(a.pattern)
      if (!counts[a.trader_id]) counts[a.trader_id] = {}
      counts[a.trader_id][a.pattern] = (counts[a.trader_id][a.pattern] || 0) + 1
    })

    const allTraders = [...traderSet]
    // Sort by total alert count descending
    const traderTotals: Record<string, number> = {}
    allTraders.forEach(t => {
      traderTotals[t] = Object.values(counts[t] || {}).reduce((s, v) => s + v, 0)
    })
    const traders = allTraders.sort((a, b) => traderTotals[b] - traderTotals[a]).slice(0, 12)
    const patterns = PATTERNS_ORDER.filter(p => patternSet.has(p))
    const maxCount = Math.max(1, ...Object.values(counts).flatMap(v => Object.values(v)))

    const matrix = traders.map(trader =>
      patterns.map(pattern => ({
        count: counts[trader]?.[pattern] || 0,
        intensity: (counts[trader]?.[pattern] || 0) / maxCount,
      }))
    )

    return { traders, patterns, matrix, traderTotals }
  }, [alerts])

  if (!traders.length) return <EmptyChart label="No alerts for heatmap" />

  return (
    <div
      onDoubleClick={() => { setAIContext('graph', 'Trader Risk Heatmap'); setAIPanelOpen(true) }}
      className="cursor-pointer"
    >
      <div className="flex items-center gap-1.5 mb-3">
        <AlertTriangle className="w-4 h-4 text-slate-400" />
        <p className="text-xs font-bold text-slate-700">Trader × Pattern Risk Heatmap</p>
        <p className="text-[10px] text-slate-400 ml-1">Darker = more alerts · Hover for details</p>
      </div>

      {/* Pattern color legend */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {patterns.map(p => (
          <span key={p} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white"
            style={{ backgroundColor: patternColor(p) }}>
            {p}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[360px]">
          {/* Column header */}
          <div className="flex mb-1.5" style={{ paddingLeft: 72 }}>
            {patterns.map(p => (
              <div
                key={p}
                className="flex-1 text-center px-0.5"
                title={p}
              >
                <div
                  className="w-4 h-4 rounded mx-auto"
                  style={{ backgroundColor: patternColor(p) }}
                  title={p}
                />
              </div>
            ))}
            <div className="w-12 shrink-0 text-[9px] text-slate-400 text-center">Total</div>
          </div>

          {/* Rows */}
          {traders.map((trader, ti) => (
            <div key={trader} className="flex items-center mb-1 group">
              <div className="text-[10px] text-slate-700 font-semibold font-mono w-[68px] shrink-0 truncate pr-2 group-hover:text-primary-600 transition-colors">
                {trader}
              </div>
              {patterns.map((pattern, pi) => {
                const cell = matrix[ti][pi]
                return (
                  <div
                    key={pattern}
                    title={`${trader} · ${pattern}: ${cell.count} alert(s)`}
                    className="flex-1 h-7 mx-0.5 rounded-md flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110 cursor-default"
                    style={{
                      backgroundColor: cell.intensity > 0
                        ? `${patternColor(pattern)}${Math.round(cell.intensity * 200 + 55).toString(16).padStart(2, '0')}`
                        : '#f1f5f9',
                      color: cell.intensity > 0.45 ? '#fff' : '#94a3b8',
                      boxShadow: cell.intensity > 0.7 ? `0 0 6px ${patternColor(pattern)}66` : 'none',
                    }}
                  >
                    {cell.count > 0 ? cell.count : ''}
                  </div>
                )
              })}
              {/* Row total */}
              <div className="w-12 shrink-0 flex items-center justify-center">
                <span
                  className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full"
                  style={{
                    color: riskScoreColor(Math.min(100, traderTotals[trader] * 5)),
                    backgroundColor: riskScoreColor(Math.min(100, traderTotals[trader] * 5)) + '18',
                  }}
                >
                  {traderTotals[trader]}
                </span>
              </div>
            </div>
          ))}

          {/* Intensity legend */}
          <div className="flex items-center gap-2 mt-3 px-1">
            <span className="text-[9px] text-slate-400">Low</span>
            {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
              <div key={v} className="h-3 flex-1 rounded-sm" style={{ backgroundColor: `#dc262640`, opacity: v }} />
            ))}
            <span className="text-[9px] text-slate-400">High</span>
          </div>
        </div>
      </div>
    </div>
  )
}
