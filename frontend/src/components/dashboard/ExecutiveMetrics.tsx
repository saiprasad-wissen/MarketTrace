import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, ShieldAlert, Briefcase, TrendingUp,
  Users, BarChart2, AlertOctagon, Scale,
} from 'lucide-react'
import type { Investigation } from '@/types'
import { cn, formatNumber, riskScoreColor } from '@/lib/utils'

interface Props {
  trades: number
  alerts: number
  cases: number
  escalated: number
  suspiciousTraders: number
  stocksMonitored: number
  contextEventsCount: number
}

interface MetricCardProps {
  label: string
  value: number
  icon: React.ElementType
  color: string
  bgColor: string
  suffix?: string
  decimals?: number
  delay?: number
}

function MetricCard({ label, value, icon: Icon, color, bgColor, suffix = '', decimals = 0, delay = 0 }: MetricCardProps) {
  const [display, setDisplay] = useState(0)
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    const duration = 800
    const start = performance.now()
    const from = 0
    const to = value

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (to - from) * eased)
      if (progress < 1) animRef.current = requestAnimationFrame(tick)
    }

    const timer = setTimeout(() => {
      animRef.current = requestAnimationFrame(tick)
    }, delay)

    return () => {
      clearTimeout(timer)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [value, delay])

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : formatNumber(Math.round(display))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay / 1000 }}
      className="metric-card group cursor-default">
      <div className="flex items-start justify-between">
        <div>
          <p className="metric-label">{label}</p>
          <p className="metric-value mt-1" style={{ color }}>
            {formatted}{suffix}
          </p>
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bgColor)}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </motion.div>
  )
}

export function ExecutiveMetrics({ trades, alerts, cases, escalated, suspiciousTraders, stocksMonitored, contextEventsCount }: Props) {
  const metrics: MetricCardProps[] = [
    {
      label: 'Total Trades',
      value: trades,
      icon: Activity,
      color: '#1a56db',
      bgColor: 'bg-blue-50',
      delay: 0,
    },
    {
      label: 'Stocks Monitored',
      value: stocksMonitored,
      icon: BarChart2,
      color: '#0d9488',
      bgColor: 'bg-teal-50',
      delay: 50,
    },
    {
      label: 'Context Events',
      value: contextEventsCount,
      icon: Scale,
      color: '#7c3aed',
      bgColor: 'bg-violet-50',
      delay: 100,
    },
    {
      label: 'Detected Alerts',
      value: alerts,
      icon: AlertOctagon,
      color: '#ea580c',
      bgColor: 'bg-orange-50',
      delay: 150,
    },
    {
      label: 'Cases Created',
      value: cases,
      icon: Briefcase,
      color: '#be123c',
      bgColor: 'bg-rose-50',
      delay: 200,
    },
    {
      label: 'Escalated Cases',
      value: escalated,
      icon: TrendingUp,
      color: '#dc2626',
      bgColor: 'bg-red-50',
      delay: 250,
    },
    {
      label: 'Suspicious Traders',
      value: suspiciousTraders,
      icon: Users,
      color: '#b45309',
      bgColor: 'bg-amber-50',
      delay: 300,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {metrics.map((m) => (
        <MetricCard key={m.label} {...m} />
      ))}
    </div>
  )
}
