import axios from 'axios'
import type {
  Profile, Investigation, Trade, ContextEvent, Alert,
  Case, CaseComment, Report, AppSettings, AIMessage,
} from '@/types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Inject JWT Token
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('markettrace-auth')
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage)
      const token = parsed.state?.token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (e) {
      console.error("Failed to parse auth token", e)
    }
  }
  return config
})

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: any) => api.post('/auth/register', data).then(r => r.data),
  login: (data: any) => api.post('/auth/login', data).then(r => r.data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }).then(r => r.data),
  verifyOtp: (email: string, otp: string) => api.post('/auth/verify-otp', { email, otp }).then(r => r.data),
  resetPassword: (data: any) => api.post('/auth/reset-password', data).then(r => r.data),
  getMe: () => api.get('/auth/me').then(r => r.data),
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export const profilesApi = {
  list: () => api.get<Profile[]>('/profiles').then(r => r.data),
  get: (id: string) => api.get<Profile>(`/profiles/${id}`).then(r => r.data),
  create: (name: string, description?: string) =>
    api.post<Profile>('/profiles', { name, description }).then(r => r.data),
  update: (id: string, data: Partial<{ name: string; description: string; status: string }>) =>
    api.put(`/profiles/${id}`, data),
  delete: (id: string) => api.delete(`/profiles/${id}`),
  uploadStocks: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/profiles/${id}/upload-stocks`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadTraders: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/profiles/${id}/upload-traders`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
}

// ─── Investigations ───────────────────────────────────────────────────────────

export const investigationsApi = {
  list: () => api.get<Investigation[]>('/investigations').then(r => r.data),
  get: (id: string) => api.get<Investigation>(`/investigations/${id}`).then(r => r.data),
  create: (name: string, profile_id: string) =>
    api.post<Investigation>('/investigations', { name, profile_id }).then(r => r.data),
  update: (id: string, data: Partial<{ name: string; status: string }>) =>
    api.put(`/investigations/${id}`, data),
  delete: (id: string) => api.delete(`/investigations/${id}`),
  uploadTrades: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/investigations/${id}/upload-trades`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadContext: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/investigations/${id}/upload-context`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  run: (id: string) => api.post(`/investigations/${id}/run`),
  getTraderAnalysis: (invId: string, traderId: string) => api.get(`/investigations/${invId}/traders/${traderId}/analysis`),
  getSymbols: (id: string) =>
    api.get<{ symbols: string[] }>(`/investigations/${id}/symbols`).then(r => r.data.symbols),
  getTraderIds: (id: string) =>
    api.get<{ trader_ids: string[] }>(`/investigations/${id}/trader-ids`).then(r => r.data.trader_ids),
}

// ─── Trades ───────────────────────────────────────────────────────────────────

export const tradesApi = {
  list: (invId: string, params?: { symbol?: string; trader_id?: string; status?: string; limit?: number }) =>
    api.get<Trade[]>(`/investigations/${invId}/trades`, { params }).then(r => r.data),
  contextEvents: (invId: string, symbol?: string) =>
    api.get<ContextEvent[]>(`/investigations/${invId}/context-events`, {
      params: symbol ? { symbol } : undefined,
    }).then(r => r.data),
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const alertsApi = {
  list: (invId: string, params?: { symbol?: string; trader_id?: string; pattern?: string; severity?: string }) =>
    api.get<Alert[]>(`/investigations/${invId}/alerts`, { params }).then(r => r.data),
  toggleFalsePositive: (alertId: string, is_false_positive: boolean) =>
    api.patch(`/alerts/${alertId}/false-positive`, { is_false_positive }).then(r => r.data),
}

// ─── Cases ────────────────────────────────────────────────────────────────────

export const casesApi = {
  list: (params?: { investigation_id?: string; status?: string; priority?: string; trader_id?: string }) =>
    api.get<Case[]>('/cases', { params }).then(r => r.data),
  get: (id: string) => api.get<Case>(`/cases/${id}`).then(r => r.data),
  update: (id: string, data: Partial<{ status: string; assigned_to: string; priority: string; ai_analysis: string }>) =>
    api.put(`/cases/${id}`, data),
  addComment: (id: string, content: string, author?: string) =>
    api.post<CaseComment>(`/cases/${id}/comments`, { content, author: author || 'Analyst' }).then(r => r.data),
  generateReasoning: (id: string) =>
    api.post<{ message: string }>(`/cases/${id}/reasoning`).then(r => r.data),
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export const reportsApi = {
  list: (investigationId?: string) =>
    api.get<Report[]>('/reports', { params: investigationId ? { investigation_id: investigationId } : undefined }).then(r => r.data),
  generate: (investigationId: string, report_type: string, subject_id?: string) =>
    api.post<Report>('/reports/generate', { report_type, subject_id }, {
      params: { investigation_id: investigationId }
    }).then(r => r.data),
  delete: (id: string) => api.delete(`/reports/${id}`),
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export const aiApi = {
  ask: (params: {
    question: string
    investigation_id: string
    context_type?: string
    context_id?: string
    conversation_history?: AIMessage[]
  }) => api.post<{ answer: string; conversation_id?: string }>('/ai/ask', {
    ...params,
    context_type: params.context_type || 'investigation',
    conversation_history: params.conversation_history || [],
  }).then(r => r.data),
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settingsApi = {
  get: () => api.get<AppSettings>('/settings').then(r => r.data),
  update: (data: Partial<AppSettings & { groq_api_key?: string; slack_webhook?: string }>) =>
    api.put('/settings', data),
}

export default api
