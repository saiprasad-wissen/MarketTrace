import { useMemo, useCallback } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, BackgroundVariant,
} from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Alert } from '@/types'
import { riskScoreColor } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

interface Props {
  alerts: Alert[]
}

export function TraderNetworkGraph({ alerts }: Props) {
  const { setTraceTrader, traderRiskSummaries } = useAppStore()

  const { nodes, edges } = useMemo(() => {
    // Build trader nodes from alert data — fully dynamic
    const traderMap = new Map<string, { patterns: Set<string>; symbols: Set<string>; risk: number }>()

    alerts.forEach(a => {
      if (!traderMap.has(a.trader_id)) {
        traderMap.set(a.trader_id, { patterns: new Set(), symbols: new Set(), risk: 0 })
      }
      const t = traderMap.get(a.trader_id)!
      t.patterns.add(a.pattern)
      t.symbols.add(a.symbol)
    })

    // Attach risk scores
    traderRiskSummaries.forEach(r => {
      const t = traderMap.get(r.trader_id)
      if (t) t.risk = r.risk_score
    })

    const traders = [...traderMap.entries()]
    if (!traders.length) return { nodes: [], edges: [] }

    // Circular layout
    const cx = 300, cy = 250, r = 180
    const nodes: Node[] = traders.map(([id, data], i) => {
      const angle = (i / traders.length) * 2 * Math.PI - Math.PI / 2
      const size = Math.max(32, 20 + data.risk * 0.4)
      const color = riskScoreColor(data.risk)
      return {
        id,
        position: { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) },
        data: { label: id },
        style: {
          width: size, height: size, borderRadius: '50%',
          backgroundColor: color + '25',
          border: `2px solid ${color}`,
          fontSize: 9, fontWeight: 700, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
      }
    })

    // Edges: connect traders who share symbols
    const edges: Edge[] = []
    const seen = new Set<string>()
    traders.forEach(([id1, d1]) => {
      traders.forEach(([id2, d2]) => {
        if (id1 >= id2) return
        const shared = [...d1.symbols].filter(s => d2.symbols.has(s))
        if (shared.length === 0) return
        const key = `${id1}-${id2}`
        if (seen.has(key)) return
        seen.add(key)
        edges.push({
          id: key,
          source: id1, target: id2,
          style: { stroke: '#94a3b8', strokeWidth: 1, opacity: 0.5 },
          label: shared.length > 1 ? `${shared.length} symbols` : shared[0],
          labelStyle: { fontSize: 8, fill: '#94a3b8' },
          animated: shared.length >= 2,
        })
      })
    })

    return { nodes, edges }
  }, [alerts, traderRiskSummaries])

  const [flowNodes, , onNodesChange] = useNodesState(nodes)
  const [flowEdges, , onEdgesChange] = useEdgesState(edges)

  const onNodeClick = useCallback((_: any, node: Node) => {
    setTraceTrader(node.id)
  }, [setTraceTrader])

  if (!nodes.length) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        No trader network to display
      </div>
    )
  }

  return (
    <div className="h-72 rounded-xl overflow-hidden border border-slate-100">
      <ReactFlow
        nodes={flowNodes} edges={flowEdges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView fitViewOptions={{ padding: 0.2 }}
        nodesDraggable attributionPosition="bottom-left">
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
        <Controls showInteractive={false} />
        <MiniMap nodeColor={(n) => (n.style?.backgroundColor as string) || '#e2e8f0'} nodeStrokeWidth={0} />
      </ReactFlow>
    </div>
  )
}
