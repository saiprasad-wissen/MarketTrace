import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PatternType, Severity, Priority, CaseStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number, decimals = 0): string {
  if (decimals > 0) return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return n.toLocaleString('en-US')
}

export function formatPrice(p: number): string {
  return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatTimestamp(ts: string): string {
  return ts
}

export function severityClass(severity: Severity | string): string {
  const map: Record<string, string> = {
    CRITICAL: 'badge-critical',
    HIGH:     'badge-high',
    MEDIUM:   'badge-medium',
    LOW:      'badge-low',
  }
  return map[severity?.toUpperCase()] || 'badge-info'
}

export function priorityClass(priority: Priority | string): string {
  const map: Record<string, string> = {
    Critical: 'badge-critical',
    High:     'badge-high',
    Medium:   'badge-medium',
    Low:      'badge-low',
  }
  return map[priority] || 'badge-info'
}

export function statusClass(status: CaseStatus | string): string {
  const map: Record<string, string> = {
    Open:          'badge-open',
    Investigating: 'badge-investigating',
    Escalated:     'badge-escalated',
    Closed:        'badge-closed',
  }
  return map[status] || 'badge-info'
}

export function patternClass(pattern: PatternType | string): string {
  const map: Record<string, string> = {
    'Spoofing':           'pattern-spoofing',
    'Quote Stuffing':     'pattern-quote-stuffing',
    'Momentum Ignition':  'pattern-momentum',
    'Pump & Dump':        'pattern-pump-dump',
    'Wash Trading':       'pattern-wash-trading',
    'Layering':           'pattern-layering',
    'Close Manipulation': 'pattern-close-manip',
  }
  return map[pattern] || 'badge-info'
}

export function riskScoreClass(score: number): string {
  if (score >= 85) return 'risk-critical'
  if (score >= 70) return 'risk-high'
  if (score >= 50) return 'risk-medium'
  return 'risk-low'
}

export function riskScoreColor(score: number): string {
  if (score >= 85) return '#dc2626'
  if (score >= 70) return '#ea580c'
  if (score >= 50) return '#d97706'
  return '#16a34a'
}

export function patternColor(pattern: PatternType | string): string {
  const map: Record<string, string> = {
    'Spoofing':           '#dc2626',
    'Quote Stuffing':     '#7c3aed',
    'Momentum Ignition':  '#ea580c',
    'Pump & Dump':        '#be123c',
    'Wash Trading':       '#b45309',
    'Layering':           '#4338ca',
    'Close Manipulation': '#0d9488',
  }
  return map[pattern] || '#6b7280'
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase()
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
