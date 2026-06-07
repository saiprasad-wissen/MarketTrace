import { useMemo, useCallback, useEffect } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, BackgroundVariant,
  MarkerType,
} from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Alert } from '@/types'
import { cn, riskScoreColor, patternColor } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { Users, Info } from 'lucide-react'

interface Props {
  alerts: Alert[]
}

// ─── Legend items ─────────────────────────────────────────────────────────────
const RISK_LEGEND = [
  { label: '≥85  Critical', color: '#dc2626' },
  { label: '70–84  High', color: '#ea580c' },
  { label: '50–69  Medium', color: '#d97706' },
  { label: '<50   Low', color: '#16a34a' },
]

export function TraderNetworkGraph({ alerts }: Props) {
  const { setTraceTrader, traderRiskSummaries, setAIContext, setAIPanelOpen, aiContextId } = useAppStore()

  // ─── Build graph data from alerts (reactive to filtered set) ─────────────────
  const { nodes: builtNodes, edges: builtEdges, traderCount, edgeCount } = useMemo(() => {
    const traderMap = new Map<string, { patterns: Set<string>; symbols: Set<string>; risk: number; alertCount: number }>()

    alerts.forEach(a => {
      if (!traderMap.has(a.trader_id)) {
        traderMap.set(a.trader_id, { patterns: new Set(), symbols: new Set(), risk: 0, alertCount: 0 })
      }
      const t = traderMap.get(a.trader_id)!
      t.patterns.add(a.pattern)
      t.symbols.add(a.symbol)
      t.alertCount += 1
    })

    // Attach risk scores from store
    traderRiskSummaries.forEach(r => {
      const t = traderMap.get(r.trader_id)
      if (t) t.risk = r.risk_score
    })

    const traders = [...traderMap.entries()]
    if (!traders.length) return { nodes: [], edges: [], traderCount: 0, edgeCount: 0 }

    // ─── Layout: concentric circles for better readability ────────────────────
    const total = traders.length
    const cx = 340, cy = 220
    let nodes: Node[]

    if (total <= 1) {
      nodes = traders.map(([id, data]) => buildNode(id, data, cx, cy))
    } else if (total <= 6) {
      // Single ring
      const r = 160
      nodes = traders.map(([id, data], i) => {
        const angle = (i / total) * 2 * Math.PI - Math.PI / 2
        return buildNode(id, data, cx + r * Math.cos(angle), cy + r * Math.sin(angle))
      })
    } else {
      // Inner + outer rings
      const inner = Math.ceil(total / 3)
      const outer = total - inner
      nodes = traders.map(([id, data], i) => {
        const isInner = i < inner
        const idx = isInner ? i : i - inner
        const count = isInner ? inner : outer
        const r = isInner ? 90 : 185
        const angle = (idx / count) * 2 * Math.PI - Math.PI / 2
        return buildNode(id, data, cx + r * Math.cos(angle), cy + r * Math.sin(angle))
      })
    }

    // ─── Build wash-trading-specific symbol sets per trader ───────────────────
    // washSymbols: symbols where this trader has a "Wash Trading" alert (EDA Rule 4)
    const washSymbolsMap = new Map<string, Set<string>>()
    alerts.forEach(a => {
      if (a.pattern === 'Wash Trading') {
        if (!washSymbolsMap.has(a.trader_id)) washSymbolsMap.set(a.trader_id, new Set())
        washSymbolsMap.get(a.trader_id)!.add(a.symbol)
      }
    })

    // ─── Edges: prioritise wash-trading pairs, fall back to shared symbols ────
    // Wash-trading edges connect traders who BOTH have Wash Trading alerts on the SAME symbol.
    // This reveals coordinated artificial volume generation networks.
    const edges: Edge[] = []
    const seen = new Set<string>()

    traders.forEach(([id1, d1]) => {
      traders.forEach(([id2, d2]) => {
        if (id1 >= id2) return
        const key = `${id1}-${id2}`
        if (seen.has(key)) return

        const washSymbols1 = washSymbolsMap.get(id1) ?? new Set<string>()
        const washSymbols2 = washSymbolsMap.get(id2) ?? new Set<string>()

        // Shared symbols where BOTH traders have wash-trading alerts
        const sharedWash = [...washSymbols1].filter(s => washSymbols2.has(s))

        // Shared symbols from any alert (for secondary context edges)
        const sharedAll = [...d1.symbols].filter(s => d2.symbols.has(s))

        if (!sharedAll.length) return
        seen.add(key)

        const isWashEdge = sharedWash.length > 0
        const risk1 = d1.risk, risk2 = d2.risk
        const avgRisk = (risk1 + risk2) / 2

        // Wash-trading edges: purple/magenta (#a21caf); others: risk-score color, low opacity
        const strokeColor = isWashEdge ? '#a21caf' : riskScoreColor(avgRisk)
        const strokeWidth = isWashEdge ? (sharedWash.length > 1 ? 3 : 2.5) : (sharedAll.length > 2 ? 2 : 1)
        const opacity = isWashEdge ? 0.80 : 0.35
        const animated = isWashEdge || avgRisk >= 70

        const label = isWashEdge
          ? `⚠ Wash: ${sharedWash.length > 1 ? sharedWash.length + ' syms' : sharedWash[0]}`
          : sharedAll.length > 1 ? `${sharedAll.length} symbols` : sharedAll[0]

        edges.push({
          id: key,
          source: id1,
          target: id2,
          style: {
            stroke: strokeColor,
            strokeWidth,
            opacity,
            strokeDasharray: isWashEdge ? undefined : '4 3',
          },
          label,
          labelStyle: {
            fontSize: 8,
            fill: isWashEdge ? '#86198f' : '#64748b',
            fontWeight: isWashEdge ? 700 : 600,
          },
          labelBgStyle: { fill: isWashEdge ? '#fdf4ff' : '#ffffff', fillOpacity: 0.9 },
          animated,
          markerEnd: { type: MarkerType.Arrow, color: strokeColor, width: 8, height: 8 },
        })
      })
    })

    return { nodes, edges, traderCount: traders.length, edgeCount: edges.length }
  }, [alerts, traderRiskSummaries])

  // ─── Sync ReactFlow state whenever alerts change ──────────────────────────────
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(builtNodes)
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(builtEdges)

  useEffect(() => {
    setFlowNodes(builtNodes)
    setFlowEdges(builtEdges)
  }, [builtNodes, builtEdges])

  const onNodeClick = useCallback((_: any, node: Node) => {
    setTraceTrader(node.id)
  }, [setTraceTrader])

  if (!builtNodes.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
          <Users className="w-6 h-6" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-500">No trader connections</p>
          <p className="text-xs text-slate-400 mt-0.5">Select a symbol with alerts to view the network</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn("space-y-3 cursor-pointer rounded-xl transition-all duration-300", aiContextId === 'Trader Network Graph' ? "ring-2 ring-primary-500 ring-offset-4 ring-offset-white bg-primary-50/20" : "")}
      onDoubleClick={() => {
        if (aiContextId === 'Trader Network Graph') {
          setAIContext('graph', null)
        } else {
          setAIContext('graph', 'Trader Network Graph')
          setAIPanelOpen(true)
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-bold text-slate-700">Trader Network Graph</p>
          <p className="text-[10px] text-slate-400">· Node size = risk score · Purple = wash trading link · Dashed = shared symbol · Click to trace</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
            {traderCount} traders
          </span>
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
            {edgeCount} connections
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap px-1">
        <div className="flex items-center gap-1 text-[9px] text-slate-400">
          <Info className="w-3 h-3" />
          <span>Risk level:</span>
        </div>
        {RISK_LEGEND.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-slate-500 font-medium">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ml-auto flex-wrap gap-y-1">
          <div className="flex items-center gap-1 mr-3">
            <div className="w-6 h-0.5" style={{ backgroundColor: '#a21caf' }} />
            <span className="text-[9px] text-slate-400">Wash trading link</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-px border-t border-dashed border-slate-400" />
            <span className="text-[9px] text-slate-400">Shared symbol</span>
          </div>
        </div>
      </div>

      {/* Graph canvas */}
      <div className="h-80 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          nodesDraggable
          attributionPosition="bottom-left"
          defaultEdgeOptions={{ type: 'smoothstep' }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#e2e8f0" />
          <Controls showInteractive={false} style={{ bottom: 8, left: 8 }} />
          <MiniMap
            nodeColor={(n) => (n.style?.borderColor as string) || '#e2e8f0'}
            nodeStrokeWidth={0}
            maskColor="rgba(248,250,252,0.6)"
            style={{ bottom: 8, right: 8 }}
          />
        </ReactFlow>
      </div>

      {/* Insight strip */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-[10px] text-slate-400 font-medium px-2">
          🔴 Purple edges = wash trading network (EDA Rule 4: ≥90% buy/sell symmetry). Animated = high-risk pair. Click any node to trace.
        </span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
    </div>
  )
}

// ─── Helper: build a styled ReactFlow node ────────────────────────────────────

function buildNode(
  id: string,
  data: { patterns: Set<string>; symbols: Set<string>; risk: number; alertCount: number },
  x: number,
  y: number,
): Node {
  const size = Math.max(36, Math.min(72, 28 + data.risk * 0.45))
  const color = riskScoreColor(data.risk)
  const mainPattern = [...data.patterns][0] ?? ''
  const patColor = patternColor(mainPattern)

  return {
    id,
    position: { x, y },
    data: {
      label: (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 1,
        }}>
          <span style={{ fontSize: Math.max(7, size * 0.2), fontWeight: 800, lineHeight: 1 }}>
            {id.slice(0, 4)}
          </span>
          {data.risk > 0 && (
            <span style={{ fontSize: 7, fontWeight: 600, opacity: 0.85 }}>
              {data.risk}
            </span>
          )}
        </div>
      ),
    },
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: color + '20',
      border: `2.5px solid ${color}`,
      color,
      cursor: 'pointer',
      boxShadow: data.risk >= 85
        ? `0 0 12px ${color}55, 0 0 24px ${color}25`
        : data.risk >= 70
        ? `0 0 8px ${color}40`
        : 'none',
      transition: 'all 0.3s ease',
    },
  }
}
