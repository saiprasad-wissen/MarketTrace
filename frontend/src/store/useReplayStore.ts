import { create } from 'zustand'
import type { Trade, Alert, ContextEvent } from '@/types'

export type ReplayEvent = (Trade & { type: 'TRADE' }) | (ContextEvent & { type: 'CONTEXT' })

interface ReplayStore {
  isOpen: boolean
  isPlaying: boolean
  speed: number
  currentIndex: number
  events: ReplayEvent[]
  alerts: Alert[]
  liveAlerts: Alert[]
  liveEvents: ReplayEvent[]

  openReplay: (trades: Trade[], alerts: Alert[], contextEvents: ContextEvent[]) => void
  closeReplay: () => void
  play: () => void
  pause: () => void
  stop: () => void
  setSpeed: (s: number) => void
  tick: () => void
  addLiveAlert: (alert: Alert) => void
}

export const useReplayStore = create<ReplayStore>((set, get) => ({
  isOpen: false,
  isPlaying: false,
  speed: 1,
  currentIndex: 0,
  events: [],
  alerts: [],
  liveAlerts: [],
  liveEvents: [],

  openReplay: (trades, alerts, contextEvents) => {
    const merged: ReplayEvent[] = [
      ...trades.map(t => ({ ...t, type: 'TRADE' as const })),
      ...contextEvents.map(c => ({ ...c, type: 'CONTEXT' as const }))
    ].sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    set({
      isOpen: true, isPlaying: false, currentIndex: 0,
      events: merged, alerts, liveAlerts: [], liveEvents: [],
    })
  },
  closeReplay: () => set({ isOpen: false, isPlaying: false, currentIndex: 0, liveEvents: [], liveAlerts: [] }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentIndex: 0, liveEvents: [], liveAlerts: [] }),
  setSpeed: (s) => set({ speed: s }),

  tick: () => {
    const { currentIndex, events, alerts, liveEvents, liveAlerts } = get()
    if (currentIndex >= events.length) {
      set({ isPlaying: false })
      return
    }
    const next = events[currentIndex]
    
    // Find alerts that trigger around this timestamp
    const triggered = alerts.filter(a => {
      // Use end_time or start_time for matching, fallback to just checking if we haven't shown it yet
      // Simple string comparison works for HH:MM:SS.SSS
      const timeToMatch = a.end_time || a.start_time
      return timeToMatch && timeToMatch <= next.timestamp && !liveAlerts.some(la => la.id === a.id)
    })

    set({
      currentIndex: currentIndex + 1,
      liveEvents: [...liveEvents.slice(-100), next],
      liveAlerts: [...liveAlerts, ...triggered].slice(-50),
    })
  },
  addLiveAlert: (alert) => set(s => ({ liveAlerts: [...s.liveAlerts.slice(-50), alert] })),
}))
