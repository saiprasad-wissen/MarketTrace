import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Square, ChevronUp, ChevronDown, Zap } from 'lucide-react'
import { useReplayStore } from '@/store/useReplayStore'
import { cn } from '@/lib/utils'

const SPEEDS = [1, 2, 5, 10, 20]

export function ReplayEngine() {
  const {
    isOpen, isPlaying, speed, currentIndex, events, liveEvents, liveAlerts,
    openReplay, closeReplay, play, pause, stop, setSpeed, tick,
  } = useReplayStore()

  const eventListRef = useRef<HTMLDivElement>(null)
  const alertListRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Tick interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (isPlaying) {
      const ms = Math.max(50, Math.round(200 / speed))
      intervalRef.current = setInterval(tick, ms)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed, tick])

  // Auto-scroll event list
  useEffect(() => {
    if (eventListRef.current) {
      eventListRef.current.scrollTop = eventListRef.current.scrollHeight
    }
  }, [liveEvents.length])

  useEffect(() => {
    if (alertListRef.current) {
      alertListRef.current.scrollTop = alertListRef.current.scrollHeight
    }
  }, [liveAlerts.length])

  if (!isOpen) {
    return null
  }

  const progress = events.length > 0 ? (currentIndex / events.length) * 100 : 0
  const isDone = currentIndex >= events.length && events.length > 0

  return (
    <motion.div
      className="replay-drawer"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-white text-sm font-semibold">Market Replay</span>
          {isPlaying && (
            <span className="flex items-center gap-1 text-green-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full live-indicator" />
              LIVE
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="flex-1 mx-6">
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-slate-500 text-[10px] tabular-nums">{currentIndex} events</span>
            <span className="text-slate-500 text-[10px] tabular-nums">{events.length} total</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Speed */}
          <div className="flex items-center gap-1">
            {SPEEDS.map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className={cn('text-xs font-bold px-1.5 py-0.5 rounded transition-colors',
                  speed === s ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
                )}>
                {s}×
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-slate-700" />

          {!isPlaying ? (
            <button onClick={play} disabled={isDone}
              className="p-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 transition-colors">
              <Play className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={pause}
              className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors">
              <Pause className="w-4 h-4" />
            </button>
          )}
          <button onClick={stop}
            className="p-1.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-white transition-colors">
            <Square className="w-4 h-4" />
          </button>
          <button onClick={closeReplay}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex h-48">
        {/* 80%: Market Events */}
        <div className="flex-1 border-r border-slate-700 flex flex-col">
          <div className="px-3 py-1.5 border-b border-slate-700/50">
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Market Events</p>
          </div>
          <div ref={eventListRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 font-mono text-xs">
            {liveEvents.length === 0 && !isPlaying && (
              <p className="text-slate-500 text-xs text-center py-4">Press Play to start replay</p>
            )}
            <AnimatePresence initial={false}>
              {liveEvents.map((e, i) => (
                <motion.div key={`${e.id}-${i}`}
                  initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'flex items-center gap-2 px-2 py-0.5 rounded',
                    e.type === 'CONTEXT' ? 'bg-amber-900/40 text-amber-300 border border-amber-700/50 shadow-[0_0_15px_rgba(251,191,36,0.15)] my-1' :
                    e.status === 'CANCEL'  ? 'text-red-400'   :
                    e.status === 'EXECUTE' ? 'text-green-400' : 'text-slate-400'
                  )}>
                  <span className="text-slate-500 w-14 shrink-0">{e.timestamp}</span>
                  {e.type === 'CONTEXT' ? (
                     <>
                        <Zap className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span className="font-bold flex-1 truncate">{e.title}</span>
                     </>
                  ) : (
                     <>
                        <span className={cn('w-10 font-bold shrink-0',
                          e.side === 'BUY' ? 'text-green-400' : 'text-red-400'
                        )}>{e.side}</span>
                        <span className="text-white font-semibold w-20 shrink-0">{e.symbol}</span>
                        <span className="text-slate-300 w-16 text-right shrink-0">
                          {e.quantity.toLocaleString()}
                        </span>
                        <span className="text-slate-400 w-16 text-right shrink-0">
                          @{e.price.toFixed(2)}
                        </span>
                        <span className={cn('text-[10px] font-semibold ml-auto shrink-0',
                          e.status === 'EXECUTE' ? 'text-green-500' :
                          e.status === 'CANCEL'  ? 'text-red-500'   : 'text-slate-500'
                        )}>{e.status}</span>
                     </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* 20%: Alert Stream */}
        <div className="w-72 flex flex-col">
          <div className="px-3 py-1.5 border-b border-slate-700/50">
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Alert Stream</p>
          </div>
          <div ref={alertListRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {liveAlerts.length === 0 && (
              <p className="text-slate-600 text-xs text-center py-4">Alerts appear in real-time</p>
            )}
            <AnimatePresence initial={false}>
              {liveAlerts.map((a, i) => (
                <motion.div key={`${a.id}-${i}`}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-xs bg-red-900/40 border border-red-700/40 rounded-lg px-2 py-1.5">
                  <div className="flex items-center gap-1 text-red-400 font-semibold">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full live-indicator shrink-0" />
                    {a.pattern}
                  </div>
                  <p className="text-slate-400 mt-0.5">{a.trader_id} · {a.symbol}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
