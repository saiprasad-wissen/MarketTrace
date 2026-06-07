// Core domain types — mirrors backend Pydantic schemas exactly

export interface Profile {
  id: string
  name: string
  description?: string
  status: string
  created_at: string
  stock_count?: number
  trader_count?: number
  stocks?: ProfileStock[]
  traders?: ProfileTrader[]
  investigation_count?: number
}

export interface ProfileStock {
  symbol: string
  company?: string
  sector?: string
  exchange?: string
}

export interface ProfileTrader {
  trader_id: string
  trader_name?: string
  desk?: string
  region?: string
}

export interface Investigation {
  id: string
  name: string
  profile_id: string
  status: 'created' | 'processing' | 'ready' | 'error' | 'deleted'
  total_trades: number
  total_alerts: number
  total_cases: number
  escalated_cases: number
  suspicious_traders: number
  avg_risk_score: number
  created_at: string
  updated_at: string
}

export interface Trade {
  id: string
  timestamp: string
  trader_id: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  order_id: string
  status: 'NEW' | 'EXECUTE' | 'CANCEL'
  sequence_num: number
}

export interface ContextEvent {
  id: string
  timestamp: string
  symbol?: string
  event_type: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL' | 'INFO'
  title: string
  summary?: string
}

export interface Alert {
  id: string
  trader_id: string
  symbol: string
  pattern: PatternType
  severity: Severity
  confidence: Confidence
  start_time?: string
  end_time?: string
  evidence?: Record<string, unknown>
  description?: string
  is_false_positive: boolean
  created_at: string
}

export type PatternType =
  | 'Spoofing'
  | 'Quote Stuffing'
  | 'Momentum Ignition'
  | 'Pump & Dump'
  | 'Wash Trading'
  | 'Layering'
  | 'Close Manipulation'

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type Confidence = 'High' | 'Medium' | 'Low'
export type CaseStatus = 'Open' | 'Investigating' | 'Escalated' | 'Closed'
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'

export interface Case {
  id: string
  case_ref: string
  trader_id: string
  symbol: string
  patterns?: string
  evidence?: Record<string, unknown>
  risk_score: number
  priority: Priority
  status: CaseStatus
  assigned_to?: string
  ai_analysis?: string
  created_at: string
  updated_at: string
  comments?: CaseComment[]
}

export interface CaseComment {
  id: string
  author: string
  content: string
  created_at: string
}

export interface Report {
  id: string
  report_type: 'market' | 'stock' | 'trader' | 'case'
  title: string
  subject_id?: string
  content?: string
  report_data?: Record<string, unknown>
  created_at: string
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AppSettings {
  groq_api_key_set: boolean
  anthropic_api_key_set: boolean
  default_profile_id?: string
  replay_speed: number
  theme: string
  slack_bot_key_set: boolean
  slack_channel?: string
  atlassian_endpoint?: string
  atlassian_secret_set: boolean
  jira_project_id?: string
  smtp_host?: string
  smtp_port?: string
  smtp_user?: string
  smtp_pass_set: boolean
  smtp_recipient?: string
}

// UI-only types
export interface TraderRiskSummary {
  trader_id: string
  trader_name?: string
  desk?: string
  region?: string
  risk_score: number
  priority: Priority
  patterns: PatternType[]
  alert_count: number
  symbol_count: number
  occurrences?: number
}

export interface ReplayState {
  isOpen: boolean
  isPlaying: boolean
  speed: number
  currentIndex: number
  events: Trade[]
  liveAlerts: Alert[]
}
