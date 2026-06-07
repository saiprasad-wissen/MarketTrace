import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Square, ChevronUp, ChevronDown, Zap, GripHorizontal, Download } from 'lucide-react'
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
  const [drawerHeight, setDrawerHeight] = useState(250)
  const [hoveredAlert, setHoveredAlert] = useState<string | null>(null)
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([])
  const isDragging = useRef(false)

  const getPatternColors = (p: string, isActive: boolean) => {
    if (!p) return isActive ? 'bg-blue-900/60 border-blue-500 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-blue-900/40 border-blue-700/40 text-blue-400';
    if (p.includes('Spoofing') || p.includes('Layering')) return isActive ? 'bg-red-900/60 border-red-500 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-red-900/40 border-red-700/40 text-red-400';
    if (p.includes('Quote Stuffing')) return isActive ? 'bg-purple-900/60 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-purple-900/40 border-purple-700/40 text-purple-400';
    if (p.includes('Wash Trading')) return isActive ? 'bg-amber-900/60 border-amber-500 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-amber-900/40 border-amber-700/40 text-amber-400';
    if (p.includes('Momentum')) return isActive ? 'bg-orange-900/60 border-orange-500 text-orange-200 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-orange-900/40 border-orange-700/40 text-orange-400';
    if (p.includes('Close Manipulation')) return isActive ? 'bg-teal-900/60 border-teal-500 text-teal-200 shadow-[0_0_15px_rgba(20,184,166,0.3)]' : 'bg-teal-900/40 border-teal-700/40 text-teal-400';
    return isActive ? 'bg-blue-900/60 border-blue-500 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-blue-900/40 border-blue-700/40 text-blue-400';
  }

  const exportSelectedAlerts = () => {
    if (selectedAlerts.length === 0) return;
    const selectedObjs = liveAlerts.filter(a => selectedAlerts.includes(a.id));
    const relatedTrades = liveEvents.filter(e => 
      e.type !== 'CONTEXT' && selectedObjs.some(a => a.trader_id === (e as any).trader_id && a.symbol === (e as any).symbol)
    );
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Timestamp,Type,Side,Symbol,Quantity,Price,Status,Trader\n"
      + relatedTrades.map(e => {
        const ev = e as any;
        return `${e.timestamp},${e.type},${ev.side},${ev.symbol},${ev.quantity},${ev.price},${e.status},${ev.trader_id}`;
      }).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `market_trace_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // Prevent body scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  const handleMouseDown = () => {
    isDragging.current = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return
    const newHeight = window.innerHeight - e.clientY
    setDrawerHeight(Math.max(200, Math.min(newHeight, window.innerHeight - 100)))
  }

  const handleMouseUp = () => {
    isDragging.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  // Tick interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (isPlaying) {
      // Allowed minimum delay lowered to 10ms so 10x and 20x speeds actually work.
      const ms = Math.max(10, Math.round(200 / speed))
      intervalRef.current = setInterval(tick, ms)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed, tick])

  // Auto-scroll event list
  useEffect(() => {
    if (eventListRef.current && selectedAlerts.length === 0) {
      eventListRef.current.scrollTop = eventListRef.current.scrollHeight
    }
  }, [liveEvents.length, selectedAlerts])

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
      className="replay-drawer rounded-t-2xl flex flex-col"
      style={{ height: drawerHeight }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}>

      {/* Drag Handle */}
      <div 
        onMouseDown={handleMouseDown}
        className="w-full h-4 flex items-center justify-center cursor-ns-resize hover:bg-slate-800/50 transition-colors rounded-t-2xl group"
      >
        <GripHorizontal className="w-5 h-5 text-slate-600 group-hover:text-slate-400" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 pb-2 pt-1 border-b border-slate-700 shrink-0">
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
        <div className="flex-1 mx-8 relative">
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
            <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-200 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
              style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-slate-400 text-[10px] font-medium tracking-wide tabular-nums">{currentIndex} <span className="text-slate-600">/ {events.length} EVENTS</span></span>
            <span className="text-slate-400 text-[10px] font-medium tracking-wide tabular-nums">{Math.round(progress)}%</span>
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
      <div className="flex flex-1 min-h-0">
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
              {liveEvents.map((e, i) => {
                const activeAlertIds = new Set(selectedAlerts);
                if (hoveredAlert) activeAlertIds.add(hoveredAlert);

                const alertObj = [...activeAlertIds].map(id => liveAlerts.find(a => a.id === id)).find(a => a && e.type !== 'CONTEXT' && (e as any).trader_id === a.trader_id && (e as any).symbol === a.symbol);
                const isHighlighted = !!alertObj;
                const isDimmed = activeAlertIds.size > 0 && !isHighlighted;
                
                let highlightClass = '';
                if (isHighlighted && alertObj) {
                  const colorClass = getPatternColors(alertObj.pattern || '', true);
                  highlightClass = `border scale-[1.01] z-10 ${colorClass}`;
                }

                return (
                <motion.div key={`${e.id}-${i}`}
                  id={`event-${e.id}`}
                  data-trader={(e as any).trader_id}
                  data-symbol={(e as any).symbol}
                  initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'flex items-center gap-2 px-2 py-0.5 rounded transition-all duration-200',
                    isDimmed ? 'opacity-20' : 'opacity-100',
                    isHighlighted ? highlightClass : '',
                    e.type === 'CONTEXT' && !isHighlighted ? 'bg-amber-900/40 text-amber-300 border border-amber-700/50 shadow-[0_0_15px_rgba(251,191,36,0.15)] my-1' :
                    e.status === 'CANCEL' && !isHighlighted ? 'text-red-400'   :
                    e.status === 'EXECUTE' && !isHighlighted ? 'text-green-400' : 
                    !isHighlighted ? 'text-slate-400' : ''
                  )}>
                  <span className={cn("w-14 shrink-0", isHighlighted ? "text-white/80" : "text-slate-500")}>{e.timestamp}</span>
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
              )})}
            </AnimatePresence>
          </div>
        </div>

        {/* 20%: Alert Stream */}
        <div className="w-72 flex flex-col">
          <div className="px-3 py-1.5 border-b border-slate-700/50 flex items-center justify-between">
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Alert Stream</p>
            {selectedAlerts.length > 0 && (
              <button 
                onClick={exportSelectedAlerts}
                className="flex items-center gap-1 text-[10px] bg-primary-600 hover:bg-primary-500 text-white px-2 py-0.5 rounded font-semibold transition-colors"
              >
                <Download className="w-3 h-3" /> EXPORT
              </button>
            )}
          </div>
          <div ref={alertListRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {liveAlerts.length === 0 && (
              <p className="text-slate-600 text-xs text-center py-4">Alerts appear in real-time</p>
            )}
            <AnimatePresence initial={false}>
              {liveAlerts.map((a, i) => {
                const isActive = hoveredAlert === a.id || selectedAlerts.includes(a.id);
                const colorClass = getPatternColors(a.pattern || '', isActive);
                
                return (
                <motion.div key={`${a.id}-${i}`}
                  onMouseEnter={() => setHoveredAlert(a.id)}
                  onMouseLeave={() => setHoveredAlert(null)}
                  onClick={() => {
                    if (selectedAlerts.includes(a.id)) {
                      setSelectedAlerts(prev => prev.filter(id => id !== a.id));
                    } else {
                      pause();
                      setSelectedAlerts(prev => [...prev, a.id]);
                      setTimeout(() => {
                        const el = document.querySelector(`[data-trader="${a.trader_id}"][data-symbol="${a.symbol}"]`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 50);
                    }
                  }}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className={cn("text-xs border rounded-lg px-2 py-1.5 cursor-crosshair transition-all duration-200", colorClass, isActive ? "scale-[1.02]" : "")}>
                  <div className="flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-current live-indicator shrink-0" />
                    {a.pattern}
                  </div>
                  <p className={cn("mt-0.5", isActive ? "opacity-100" : "opacity-70")}>{a.trader_id} · {a.symbol}</p>
                </motion.div>
              )})}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
