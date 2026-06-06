import type { TraderRiskSummary, ProfileTrader, Case } from '@/types'
import { casesApi } from '@/services/api'

export async function generateTraderPdf(
  traderId: string,
  summary: TraderRiskSummary,
  traderInfo?: ProfileTrader
) {
  // 1. Get the investigation ID to pass to the backend
  const cases = await casesApi.list({ trader_id: traderId } as any)
  if (!cases.length) {
    alert("No cases found for this trader to generate a report.")
    return
  }
  
  const bestCase = cases.sort((a: Case, b: Case) => b.risk_score - a.risk_score)[0]
  const investigationId = (bestCase as any).investigation_id

  if (!investigationId) {
    alert("Could not determine investigation context.")
    return
  }

  // 2. Trigger the download from the new ReportLab backend
  try {
    const url = `/api/reports/dossier?trader_id=${encodeURIComponent(traderId)}&investigation_id=${encodeURIComponent(investigationId)}`
    
    // Create an invisible anchor to trigger the download
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = `MarketTrace_Dossier_${traderId}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
  } catch (e) {
    console.error('Failed to generate PDF', e)
    alert('Failed to generate LaTeX PDF. Check console.')
  }
}
